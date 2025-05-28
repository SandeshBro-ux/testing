const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const cors = require('cors');

const app = express();
const execPromise = util.promisify(exec);
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API to get YouTube video info
app.post('/api/video-info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !isYouTubeUrl(url)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid YouTube URL' 
      });
    }

    const videoInfo = await getVideoInfo(url);
    res.json({ 
      success: true, 
      data: videoInfo 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting video information',
      error: error.message
    });
  }
});

// Function to validate YouTube URL
function isYouTubeUrl(url) {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return pattern.test(url);
}

// Function to get video info using yt-dlp
async function getVideoInfo(url) {
  try {
    // Check if yt-dlp exists
    try {
      await execPromise('yt-dlp --version');
    } catch (error) {
      throw new Error('yt-dlp is not installed. Please install it first: https://github.com/yt-dlp/yt-dlp#installation');
    }

    // Get video info in JSON format
    const { stdout } = await execPromise(`yt-dlp --dump-json "${url}"`);
    const videoInfo = JSON.parse(stdout);
    
    // Get available formats
    const formats = videoInfo.formats || [];
    
    // Find highest quality
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
    console.error('Error fetching video info:', error);
    throw error;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
}); 