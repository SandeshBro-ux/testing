const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
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
    const versionOutput = await youtubedl.raw('--version');
    ytdlexecBinaryStatus = `Operational (yt-dlp version: ${versionOutput.stdout.trim()})`;
    logMessage(`Debug: yt-dlp binary check successful: ${ytdlexecBinaryStatus}`);
  } catch (e) {
    ytdlexecBinaryStatus = `Error checking yt-dlp binary: ${e.message}`;
    logMessage(`Debug: yt-dlp binary check failed: ${e.message}`, true);
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
    directoryListingCurrent: fs.readdirSync(__dirname) // Basic check
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
      error: error.message // Pass the processed error message
    });
  }
});

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
      // Add any specific yt-dlp flags if needed, e.g.:
      // noCheckCertificates: true, // For potential SSL issues
      // formatSort: 'height' // If you want server to sort by height, though client-side processing is fine
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
    
    // Fallback if maxHeight is still 0 but formats exist (e.g. only audio or non-standard res)
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
    if (maxHeight === 0) {
        logMessage(`Could not determine maximum video resolution for ${url}. Available formats might be audio-only or have unparsable resolutions.`);
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
    // youtube-dl-exec errors often include stderr from the binary
    const stderr = error.stderr || 'N/A';
    logMessage(`Error using youtube-dl-exec for ${url}: ${error.message}. Stderr: ${stderr}`, true);
    
    let detailedErrorMessage = `Failed to process video with youtube-dl-exec.`;
    if (stderr.includes("Unsupported URL")) {
        detailedErrorMessage = "The provided URL is not supported or is invalid.";
    } else if (stderr.includes("Video unavailable") || stderr.includes("Private video") || stderr.includes("This video is unavailable")) {
        detailedErrorMessage = "This video is unavailable (private, deleted, or restricted by YouTube).";
    } else if (stderr.includes("age restricted")) {
        detailedErrorMessage = "This video is age-restricted and cannot be processed.";
    } else if (stderr.includes("ERROR 410") || stderr.includes("HTTP Error 410")) {
        detailedErrorMessage = "This video is no longer available (Error 410: Gone). It may have been permanently deleted.";
    } else if (stderr !== 'N/A' && stderr.trim() !== '') {
        detailedErrorMessage += ` Technical details: ${stderr.split(/[\r\n]+/)[0].substring(0, 200)}`; // First line, capped length
    } else {
        detailedErrorMessage += ` Details: ${error.message.substring(0,200)}`;
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