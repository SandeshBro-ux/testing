const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a log file stream
const logStream = fs.createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a' });

// Custom logger
function logMessage(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${isError ? 'ERROR' : 'INFO'}: ${message}\n`;
  logStream.write(logEntry);
  if (isError) {
    console.error(logEntry);
  } else {
    console.log(logEntry);
  }
}

const app = express();
const execPromise = util.promisify(exec);
const PORT = process.env.PORT || 3000;

// More robust environment detection - assume we're on a cloud platform if:
// 1. RENDER environment variable is set to 'true'
// 2. NODE_ENV is 'production'
// 3. We're running on a non-standard port like Render uses (Render dynamically assigns PORT)
// 4. The path includes '/opt/render/' which is common on Render
const isCloudPlatform = 
  process.env.RENDER === 'true' || 
  process.env.NODE_ENV === 'production' ||
  (process.env.PORT && process.env.PORT !== '3000') || // Check if PORT is set and not the default local one
  __dirname.includes('/opt/render/');

logMessage(`Initial environment detection: RENDER=${process.env.RENDER}, NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}, __dirname=${__dirname}`);
logMessage(`Running in ${isCloudPlatform ? 'cloud/production' : 'local'} environment based on checks.`);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Debug endpoint
app.get('/debug', (req, res) => {
  const debugInfo = {
    detectedEnvironment: isCloudPlatform ? 'cloud/production' : 'local',
    isCloudPlatform: isCloudPlatform,
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    currentDir: __dirname,
    logsPath: path.join(logsDir, 'app.log'),
    environmentVars: {
      RENDER: process.env.RENDER,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    },
    directoryListingRoot: fs.existsSync('/opt/render/project/src/') ? fs.readdirSync('/opt/render/project/src/') : 'Path /opt/render/project/src/ not found',
    directoryListingCurrent: fs.readdirSync(__dirname)
  };
  
  res.json(debugInfo);
});

// API to get YouTube video info
app.post('/api/video-info', async (req, res) => {
  try {
    const { url } = req.body;
    logMessage(`Received request for URL: ${url}`);
    
    if (!url || !isYouTubeUrl(url)) {
      logMessage(`Invalid YouTube URL: ${url}`, true);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid YouTube URL' 
      });
    }

    const videoInfo = await getVideoInfo(url);
    logMessage(`Successfully retrieved info for URL: ${url}`);
    res.json({ 
      success: true, 
      data: videoInfo 
    });
  } catch (error) {
    logMessage(`Error processing request for ${url}: ${error.message}`, true);
    console.error(`Error stack for ${url}:`, error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting video information',
      error: error.message // Send the actual error message for debugging on client side if needed
    });
  }
});

// Function to validate YouTube URL
function isYouTubeUrl(url) {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return pattern.test(url);
}

// Function to extract video ID from URL
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// Function to get video info using ytdl-core (JavaScript library)
async function getVideoInfoWithYtdlCore(url) {
  logMessage(`Using ytdl-core for video info: ${url}`);
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Could not extract video ID from URL for ytdl-core');
    }
    logMessage(`Extracted video ID for ytdl-core: ${videoId}`);
    
    const ytdl = require('ytdl-core'); // Standard require
    const info = await ytdl.getInfo(videoId);
    logMessage(`Successfully fetched video info with ytdl-core for ID: ${videoId}`);
    
    const formats = info.formats;
    let maxHeight = 0;
    let maxQualityLabel = '';
    let maxFormat = null;
    
    formats.forEach(format => {
      const height = parseInt(format.height);
      if (height && height > maxHeight) {
        maxHeight = height;
        maxQualityLabel = format.qualityLabel || `${height}p`;
        maxFormat = format;
      }
    });
    
    return {
      title: info.videoDetails.title,
      uploader: info.videoDetails.author.name,
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
      duration: parseInt(info.videoDetails.lengthSeconds),
      uploadDate: info.videoDetails.publishDate ? 
        info.videoDetails.publishDate.replace(/-/g, '') : 
        null,
      viewCount: parseInt(info.videoDetails.viewCount),
      maxQuality: maxQualityLabel,
      maxHeight,
      maxFormat: maxFormat ? {
        formatId: maxFormat.itag,
        container: maxFormat.container,
        resolution: maxFormat.width && maxFormat.height ? 
          `${maxFormat.width}x${maxFormat.height}` : 
          'unknown',
        fps: maxFormat.fps
      } : null
    };
  } catch (error) {
    logMessage(`Error using ytdl-core for ${url}: ${error.message}`, true);
    throw new Error(`Failed to get video info with ytdl-core for ${url}: ${error.message}`);
  }
}

// Function to get video info using yt-dlp (command-line tool) - FOR LOCAL USE ONLY
async function getVideoInfoWithYtDlp(url) {
  logMessage(`Attempting to use yt-dlp for video info (local only): ${url}`);
  try {
    await execPromise('yt-dlp --version'); // Check if yt-dlp exists and is executable
    logMessage('yt-dlp found and accessible locally.');
    
    const { stdout } = await execPromise(`yt-dlp --dump-json "${url}"`);
    const videoInfo = JSON.parse(stdout);
    logMessage(`Successfully fetched video info with yt-dlp for ${url}`);
    
    const formats = videoInfo.formats || [];
    let maxHeight = 0;
    let maxQualityLabel = '';
    let maxFormat = null;
    
    formats.forEach(format => {
      if (format.height && format.height > maxHeight) {
        maxHeight = format.height;
        maxQualityLabel = format.format_note || `${format.height}p`;
        maxFormat = format;
      }
    });
    
    return {
      title: videoInfo.title,
      uploader: videoInfo.uploader || videoInfo.channel,
      thumbnail: videoInfo.thumbnail,
      duration: videoInfo.duration,
      uploadDate: videoInfo.upload_date,
      viewCount: videoInfo.view_count,
      maxQuality: maxQualityLabel,
      maxHeight,
      maxFormat: maxFormat ? {
        formatId: maxFormat.format_id,
        container: maxFormat.ext,
        resolution: `${maxFormat.width}x${maxFormat.height}`,
        fps: maxFormat.fps
      } : null
    };
  } catch (error) {
    logMessage(`Error using yt-dlp for ${url} (local attempt): ${error.message}`, true);
    throw new Error(`yt-dlp failed for ${url} (local attempt): ${error.message}`); // More specific error for local fallback
  }
}

// Main function to get video info with fallbacks
async function getVideoInfo(url) {
  logMessage(`Determining method for URL: ${url}. isCloudPlatform: ${isCloudPlatform}`);
  
  if (isCloudPlatform) {
    logMessage(`Cloud platform detected. Using ytdl-core directly for ${url}.`);
    return await getVideoInfoWithYtdlCore(url);
  }
  
  // On local environment, try yt-dlp first, then fall back to ytdl-core
  logMessage(`Local environment detected. Attempting yt-dlp for ${url}.`);
  try {
    return await getVideoInfoWithYtDlp(url);
  } catch (ytdlpError) {
    logMessage(`yt-dlp failed locally for ${url}: ${ytdlpError.message}. Falling back to ytdl-core.`);
    return await getVideoInfoWithYtdlCore(url); // Fallback to ytdl-core on local if yt-dlp fails
  }
  // Note: The catch block for getVideoInfoWithYtdlCore will handle its own errors.
  // If both methods fail, the error from the last attempted method will propagate up.
}

// Start server
app.listen(PORT, () => {
  logMessage(`Server running on port ${PORT}`);
  logMessage(`Open http://localhost:${PORT} in your browser (if running locally)`);
  logMessage(`Application logs are being written to: ${path.join(logsDir, 'app.log')}`);
}); 