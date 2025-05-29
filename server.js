const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');
const youtubedl = require('youtube-dl-exec');

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
    console.error(logEntry.trim()); // Trim for cleaner console error output
  } else {
    console.log(logEntry.trim());
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

logMessage(`Server process started. Node version: ${process.version}. Platform: ${process.platform}.`);
logMessage(`Initial environment: RENDER=${process.env.RENDER}, NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}, __dirname=${__dirname}`);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/debug', async (req, res) => {
  let ytdlexecBinaryStatus = 'Not checked / N/A';
  try {
    const versionOutput = await youtubedl.raw('--version', {stdio: ['pipe', 'pipe', 'pipe'] });
    ytdlexecBinaryStatus = `Operational (yt-dlp version: ${versionOutput.stdout.trim()})`;
    logMessage(`Debug: yt-dlp binary check successful: ${ytdlexecBinaryStatus}`);
  } catch (e) {
    ytdlexecBinaryStatus = `Error checking yt-dlp binary: ${e.message} Stderr: ${e.stderr}`;
    logMessage(`Debug: yt-dlp binary check failed: ${e.message} Stderr: ${e.stderr}`, true);
  }

  const debugInfo = {
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
    youtubeDlExecStatus: ytdlexecBinaryStatus,
    directoryListingCurrent: fs.readdirSync(__dirname)
  };
  res.json(debugInfo);
});

app.post('/api/video-info', async (req, res) => {
  let urlToProcess = 'URL_NOT_CAPTURED';
  try {
    const { url } = req.body;
    urlToProcess = url;
    logMessage(`Received request for URL: ${urlToProcess}`);

    if (!urlToProcess || !isYouTubeUrl(urlToProcess)) {
      logMessage(`Invalid YouTube URL: ${urlToProcess}`, true);
      return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });
    }

    const videoInfo = await getVideoInfo(urlToProcess);
    logMessage(`Successfully retrieved info using youtube-dl-exec for URL: ${urlToProcess}`);
    res.json({ success: true, data: videoInfo });

  } catch (error) {
    logMessage(`Error processing request for ${urlToProcess}: ${error.message}`, true);
    console.error(`Underlying error stack for ${urlToProcess} (if any):`, error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting video information', 
      error: error.message
    });
  }
});

app.get('/download', async (req, res) => {
  const { url, format } = req.query;
  
  if (!url) {
    return res.status(400).send('URL parameter is required');
  }
  
  try {
    // Here you would use a library like ytdl-core or youtube-dl-exec
    // to handle the actual download
    // For demonstration, we'll just redirect to a mock download
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).send('Invalid YouTube URL');
    }
    
    // In a real implementation, you would download the video server-side
    // and then serve it to the client
    
    res.setHeader('Content-Disposition', `attachment; filename="youtube-${videoId}.${format}"`);
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    
    // For demo purposes, redirect to YouTube
    res.redirect(`https://www.youtube.com/watch?v=${videoId}`);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Error processing download request');
  }
});

function extractVideoId(url) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Function to validate YouTube URL
function isYouTubeUrl(url) {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return pattern.test(url);
}

// Function to get video info using youtube-dl-exec
async function getVideoInfo(url) {
  logMessage(`Attempting to get video info using youtube-dl-exec for URL: ${url}`);
  try {
    const videoData = await youtubedl(url, {
      dumpJson: true,
      noCheckCertificate: true,
      forceIpv4: true
    });

    if (!videoData) {
      logMessage(`youtube-dl-exec returned no data for ${url}`, true);
      throw new Error('No data returned from video processing service.');
    }
    logMessage(`Successfully fetched raw data with youtube-dl-exec for URL: ${url}`);

    const formats = videoData.formats || [];
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
    
    if (maxHeight === 0 && formats.length > 0) {
        logMessage(`No direct video height found for ${url}, attempting to parse resolution string.`);
        formats.forEach(format => {
            if (format.resolution && typeof format.resolution === 'string') {
                const resParts = format.resolution.split('x');
                if (resParts.length === 2) {
                    const h = parseInt(resParts[1]);
                    if (!isNaN(h) && h > maxHeight) {
                        maxHeight = h;
                        maxQualityLabel = format.format_note || `${h}p`;
                        maxFormat = format; 
                    }
                }
            }
        });
    }
    if (maxHeight === 0 && !videoData.acodec) {
        logMessage(`Could not determine maximum video resolution and no audio codec found for ${url}. It might not be a valid video.`, true);
        if (formats.every(f => f.vcodec === 'none' && f.acodec === 'none')) {
             throw new Error('The URL does not point to a valid video or audio stream.');
        }
    } else if (maxHeight === 0 && videoData.acodec) {
        logMessage(`Content for ${url} appears to be audio-only or has no standard video resolution data.`);
        maxQualityLabel = 'Audio Only'
    }

    return {
      title: videoData.title || 'N/A',
      uploader: videoData.uploader || videoData.channel || 'N/A',
      thumbnail: videoData.thumbnail || '',
      duration: videoData.duration || 0,
      uploadDate: videoData.upload_date || null,
      viewCount: videoData.view_count || 0,
      maxQuality: maxQualityLabel || (maxHeight > 0 ? `${maxHeight}p` : 'N/A'),
      maxHeight: maxHeight || 0,
      maxFormat: maxFormat ? {
        formatId: maxFormat.format_id,
        container: maxFormat.ext,
        resolution: maxFormat.resolution || (maxFormat.width && maxFormat.height ? `${maxFormat.width}x${maxFormat.height}` : 'N/A'),
        fps: maxFormat.fps || null
      } : null
    };

  } catch (error) {
    const stderr = error.stderr || 'N/A';
    logMessage(`Error using youtube-dl-exec for ${url}: ${error.message}. Stderr: ${stderr}`, true);
    
    let detailedErrorMessage = `Failed to process video.`;

    if (stderr.includes("HTTP Error 429") || stderr.includes("Too Many Requests")) {
        detailedErrorMessage = "Our service is experiencing high demand from YouTube. Please try again in a few moments.";
    } else if (stderr.includes("Sign in to confirm you.re not a bot")) {
        detailedErrorMessage = "YouTube is asking to verify you're not a bot. This can happen with high server traffic. Please try again later.";
    } else if (stderr.includes("Unsupported URL")) {
        detailedErrorMessage = "The provided URL is not supported or is invalid.";
    } else if (stderr.includes("Video unavailable") || stderr.includes("Private video") || stderr.includes("This video is unavailable")) {
        detailedErrorMessage = "This video is unavailable (private, deleted, or restricted by YouTube).";
    } else if (stderr.includes("age restricted")) {
        detailedErrorMessage = "This video is age-restricted and cannot be processed.";
    } else if (stderr.includes("ERROR 410") || stderr.includes("HTTP Error 410")) {
        detailedErrorMessage = "This video is no longer available (Error 410: Gone). It may have been permanently deleted.";
    } else if (error.message.includes('No data returned')) {
        detailedErrorMessage = "Could not retrieve any information for this video. It might be invalid or an issue with the processing service.";
    } else if (error.message.includes('does not point to a valid video or audio stream')) {
        detailedErrorMessage = "The URL does not seem to point to a valid video or audio.";
    } else if (stderr !== 'N/A' && stderr.trim() !== '') {
        detailedErrorMessage = "An unexpected error occurred while trying to fetch video details. Please try a different video or check the URL.";
        logMessage(`Uncaught yt-dlp stderr for ${url}: ${stderr}`, true); 
    } else {
        detailedErrorMessage = `An unexpected error occurred: ${error.message.substring(0,100)}`;
    }
    throw new Error(detailedErrorMessage);
  }
}

// Start server
app.listen(PORT, () => {
  logMessage(`Server running on port ${PORT}`);
  logMessage(`Access the app at http://localhost:${PORT} (if running locally)`);
  logMessage(`Application logs are being written to: ${path.join(logsDir, 'app.log')}`);
}); 