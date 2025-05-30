// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');
const youtubedl = require('youtube-dl-exec');
const https = require('https');
const querystring = require('querystring');

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

// Set up custom binary path for yt-dlp in the youtubedl config
const binPath = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

// Set environment variable to indicate we're skipping yt-dlp
process.env.SKIP_YTDLP = 'true';

if (fs.existsSync(binPath)) {
  logMessage(`Found yt-dlp binary at ${binPath}`);
  youtubedl.setBinaryPath?.(binPath);
} else {
  logMessage(`Warning: yt-dlp binary not found at ${binPath}, using system path`);
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/config', (req, res) => {
  // Debug logging
  console.log('Environment variables:', {
    YOUTUBE_API_KEY_EXISTS: !!process.env.YOUTUBE_API_KEY,
    YOUTUBE_API_KEY_LENGTH: process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.length : 0,
    NODE_ENV: process.env.NODE_ENV
  });
  logMessage(`API Key requested. Key exists: ${!!process.env.YOUTUBE_API_KEY}, Length: ${process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.length : 0}`);
  
  // Fallback to hardcoded key if environment variable is missing
  const apiKey = process.env.YOUTUBE_API_KEY || 'AIzaSyAKkaccfpCX8rfG03CLfkC9u4y2_ZLeRe4';
  
  // Send only the necessary configuration variables to the client
  res.json({
    youtubeApiKey: apiKey
  });
});

app.get('/debug', async (req, res) => {
  let ytdlexecBinaryStatus = 'Not checked / N/A';
  try {
    if (process.env.SKIP_YTDLP === 'true') {
      ytdlexecBinaryStatus = 'yt-dlp download intentionally skipped. Using mock data for demonstration.';
      logMessage(`Debug: yt-dlp binary check skipped as SKIP_YTDLP is set.`);
    } else {
      const versionOutput = await youtubedl.raw('--version', {stdio: ['pipe', 'pipe', 'pipe'] });
      ytdlexecBinaryStatus = `Operational (yt-dlp version: ${versionOutput.stdout.trim()})`;
      logMessage(`Debug: yt-dlp binary check successful: ${ytdlexecBinaryStatus}`);
    }
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
  try {
    const { url, format } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    // Clean the URL if it starts with @
    const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).send('Invalid YouTube URL');
    }
    
    // If SKIP_YTDLP is set, just redirect to YouTube
    if (process.env.SKIP_YTDLP === 'true') {
      logMessage(`Download requested for video ${videoId} in format ${format}, but yt-dlp is skipped. Redirecting to YouTube.`);
      
      // Set a content type for a plain text message
      res.setHeader('Content-Type', 'text/html');
      
      // Return a message with a link to YouTube
      return res.send(`
        <html>
          <head>
            <title>Download Notification</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #121212; color: #fff; }
              .message { background-color: #1e1e1e; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
              a { color: #ff0000; text-decoration: none; }
              a:hover { text-decoration: underline; }
              .button { background-color: #ff0000; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="message">
              <h2>FreeYTZone Download Information</h2>
              <p>The download functionality is currently in development. Proxy implementation is coming soon!</p>
              <p>For now, you'll be redirected to the original YouTube video:</p>
              <a href="https://www.youtube.com/watch?v=${videoId}" class="button">Go to YouTube</a>
            </div>
          </body>
        </html>
      `);
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
  // Remove any @ symbol at the beginning if present
  const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
  const pattern = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[\&\?\#].*)?$/;
  const match = cleanUrl.match(pattern);
  return match ? match[1] : null;
}

// Function to validate YouTube URL
function isYouTubeUrl(url) {
  // Remove any @ symbol at the beginning if present
  const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
  const pattern = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[\&\?\#].*)?$/;
  return pattern.test(cleanUrl);
}

// Function to get video info using youtube-dl-exec
async function getVideoInfo(url) {
  logMessage(`Attempting to get video info using youtube-dl-exec for URL: ${url}`);
  
  // If SKIP_YTDLP is set, use a mock response instead of actual yt-dlp
  if (process.env.SKIP_YTDLP === 'true') {
    logMessage(`SKIP_YTDLP is set, returning mock video data for ${url}`);
    
    // Extract the video ID from the URL
    const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
    const videoId = extractVideoId(cleanUrl);
    
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    
    // Return mock data
    return {
      title: 'Demo Video Title',
      uploader: 'Demo Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 180, // 3 minutes
      uploadDate: '20230101',
      viewCount: 1000000,
      maxQuality: '1080p Full HD',
      maxHeight: 1080,
      maxFormat: {
        formatId: 'demo-format',
        container: 'mp4',
        resolution: '1920x1080',
        fps: 30
      }
    };
  }
  
  try {
    // Clean the URL if it starts with @
    const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
    const videoData = await youtubedl(cleanUrl, {
      dumpJson: true,
      noCheckCertificate: true,
      forceIpv4: true,
      binPath: binPath // Use our custom binary path
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

// Helper function to make HTTPS POST requests for y2meta
function makeY2MetaRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const contentType = res.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse JSON response from y2meta: ' + data.substring(0, 200) + '...')); // Log only part of data
          }
        } else {
          // If not JSON, it might be an error page or unexpected response
          reject(new Error(`y2meta returned non-JSON response (Content-Type: ${contentType}). Response snippet: ` + data.substring(0, 200) + '...'));
        }
      });
    });
    req.on('error', (e) => {
      reject(new Error('Request to y2meta failed: ' + e.message));
    });
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

app.post('/api/fetch-y2meta-download-link', express.json(), async (req, res) => {
  const { youtubeUrl } = req.body;
  if (!youtubeUrl) {
    return res.status(400).json({ error: 'youtubeUrl is required' });
  }

  logMessage(`[PROXY v3] Received request for y2meta link for: ${youtubeUrl}`);

  try {
    const pageUrl = `https://y2meta.net/en-us3/?url=${encodeURIComponent(youtubeUrl)}`;
    logMessage(`[PROXY v3] Step 1: Fetching HTML from ${pageUrl}`);
    
    const pageHtml = await new Promise((resolve, reject) => {
      https.get(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36' } }, (htmlRes) => {
        let htmlData = '';
        htmlRes.on('data', (chunk) => htmlData += chunk);
        htmlRes.on('end', () => resolve(htmlData));
      }).on('error', (e) => reject(new Error(`Failed to fetch y2meta page: ${e.message}`)));
    });

    logMessage('[PROXY v3] Step 1: HTML page fetched. Logging first 1000 characters:');
    logMessage(pageHtml.substring(0, 1000)); // Log the beginning of the HTML

    let videoId = null;
    let targetQualityKey = null;
    let videoTitle = 'video';

    // Try to extract video ID (vid) - more generic patterns
    const vidPatterns = [
        /data-id="([a-zA-Z0-9_-]+)"/i,
        /"vid"\s*:\s*"([a-zA-Z0-9_-]+)"/i,
        /value="([a-zA-Z0-9_-]{11,})" name="vid"/i, // Common in forms
        /_id\s*=\s*'([a-zA-Z0-9_-]+)';/i // Common in inline scripts
    ];

    for (const pattern of vidPatterns) {
        const match = pageHtml.match(pattern);
        if (match && match[1]) {
            videoId = match[1];
            logMessage(`[PROXY v3] Extracted vid: ${videoId} using pattern: ${pattern}`);
            break;
        }
    }

    if (!videoId) {
      logMessage('[PROXY v3] Could not extract video ID (vid) from HTML after trying multiple patterns.', 'ERROR');
      logMessage(`[PROXY v3] Full HTML length: ${pageHtml.length}. Consider reviewing the logged HTML snippet for new patterns.`, 'ERROR');
      return res.status(500).json({ error: 'Failed to parse video ID from y2meta page. The page structure may have changed.' });
    }
    
    const titleMatch = pageHtml.match(/<h5 class="card-title">([^<]+)<\/h5>/i) || pageHtml.match(/<title>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
        videoTitle = titleMatch[1].replace(/Y2Meta - Free YouTube Downloader|YouTube Downloader -|- y2meta.net|Download YouTube video as MP4 and MP3/gi, '').trim();
        if (videoTitle.toLowerCase().includes('youtube downloader')) videoTitle = 'video';
        logMessage(`[PROXY v3] Extracted raw title: ${titleMatch[1]}, Cleaned: ${videoTitle}`);
    }

    const mp4TableRegex = /<div id="mp4"[^>]*>[\s\S]*?<\/div>/i;
    const mp4TableMatch = pageHtml.match(mp4TableRegex);
    
    if (mp4TableMatch && mp4TableMatch[0]) {
        const mp4Html = mp4TableMatch[0];
        const qualityRegex1080p = /<td.*?>\s*1080p\s*.*?<span class="badge.*?">mp4<\/span>.*?<\/td>[\s\S]*?data-k="([^"\s]+)"/i;
        const match1080p = mp4Html.match(qualityRegex1080p);
        if (match1080p && match1080p[1]) {
            targetQualityKey = match1080p[1];
            logMessage(`[PROXY v3] Found 1080p MP4 key via HTML parse: ${targetQualityKey}`);
        } else {
            logMessage('[PROXY v3] 1080p key not found, trying 720p.');
            const qualityRegex720p = /<td.*?>\s*720p\s*.*?<span class="badge.*?">mp4<\/span>.*?<\/td>[\s\S]*?data-k="([^"\s]+)"/i;
            const match720p = mp4Html.match(qualityRegex720p);
            if (match720p && match720p[1]) {
                targetQualityKey = match720p[1];
                logMessage(`[PROXY v3] Found 720p MP4 key via HTML parse: ${targetQualityKey}`);
            }
        }
    } else {
        logMessage('[PROXY v3] MP4 section not found in HTML.', 'ERROR');
    }

    if (!targetQualityKey) {
      logMessage('[PROXY v3] Failed to extract target quality key (1080p/720p MP4) from HTML.', 'ERROR');
      return res.status(500).json({ error: 'Could not find 1080p/720p MP4 download option on y2meta. The page content might have changed.' });
    }

    const convertPostData = querystring.stringify({ vid: videoId, k: targetQualityKey });
    const convertOptions = {
      hostname: 'y2meta.net',
      port: 443,
      path: '/en-us3/api/ajaxConvert',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(convertPostData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://y2meta.net',
        'Referer': pageUrl
      }
    };
    
    logMessage(`[PROXY v3] Step 2: Requesting conversion with vid: ${videoId}, k: ${targetQualityKey}`);
    const convertResult = await makeY2MetaRequest(convertOptions, convertPostData);
    logMessage('[PROXY v3] Step 2: y2meta conversion result received.');

    if (!convertResult || (convertResult.status !== 'ok' && convertResult.status !== 'success')) {
      logMessage(`[PROXY v3] Conversion failed: ${JSON.stringify(convertResult)}`, 'ERROR');
      return res.status(500).json({ error: 'Failed to convert video on y2meta (step 2). Status: ' + (convertResult ? convertResult.status : 'N/A') });
    }

    let downloadLink = null;
    if (convertResult.link) {
        downloadLink = convertResult.link;
    } else if (convertResult.result && typeof convertResult.result === 'string') {
        const match = convertResult.result.match(/href="([^"]+)"/i);
        if (match && match[1]) {
            downloadLink = match[1];
        }
    }

    if (!downloadLink) {
      logMessage(`[PROXY v3] Direct download link not found: ${JSON.stringify(convertResult)}`, 'ERROR');
      return res.status(500).json({ error: 'Could not extract direct download link from y2meta (step 2).
        Response: ' + JSON.stringify(convertResult).substring(0,100) });
    }
    
    logMessage(`[PROXY v3] Successfully obtained direct download link: ${downloadLink}`);
    res.json({ downloadLink, videoTitle });

  } catch (error) {
    logMessage(`[PROXY v3] Error in /api/fetch-y2meta-download-link: ${error.message}`, 'ERROR');
    console.error('[PROXY v3] Full error stack:', error.stack); 
    res.status(500).json({ error: `Proxy error: ${error.message}` });
  }
});

// Start server on a free port
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] INFO: Server running on http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[${new Date().toISOString()}] INFO: Port ${port} is busy, trying port ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error(`[${new Date().toISOString()}] ERROR: ${err.message}`);
    }
  });
};

startServer(PORT); 