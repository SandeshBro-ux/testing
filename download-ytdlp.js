const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// Skip download if the environment variable is set
if (process.env.SKIP_YTDLP_DOWNLOAD) {
  console.log('Skipping yt-dlp download as SKIP_YTDLP_DOWNLOAD is set');
  process.exit(0);
}

// Set up paths for binary
const binDir = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin');
const platform = os.platform();
const arch = os.arch();

// Ensure the bin directory exists
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

// Get the correct binary URL and filename based on platform
function getBinaryInfo() {
  // Default to 64-bit Linux
  let url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  let filename = 'yt-dlp';

  if (platform === 'win32') {
    url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    filename = 'yt-dlp.exe';
  } else if (platform === 'darwin') {
    if (arch === 'arm64') {
      // For Apple Silicon
      url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos_arm64';
      filename = 'yt-dlp';
    } else {
      // For Intel Macs
      url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
      filename = 'yt-dlp';
    }
  }

  return { url, filename };
}

const { url, filename } = getBinaryInfo();
const binPath = path.join(binDir, filename);

console.log(`Downloading yt-dlp binary for ${platform} (${arch})...`);
console.log(`URL: ${url}`);
console.log(`Destination: ${binPath}`);

// Download the binary
const file = fs.createWriteStream(binPath);
https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download yt-dlp: ${response.statusCode} ${response.statusMessage}`);
    fs.unlinkSync(binPath);
    process.exit(1);
  }

  response.pipe(file);
  
  file.on('finish', () => {
    file.close();
    console.log('Download completed');
    
    // Make the binary executable on Unix-like systems
    if (platform !== 'win32') {
      fs.chmodSync(binPath, 0o755);
      console.log('Binary permissions updated to be executable');
    }

    // Test the binary
    console.log('Testing yt-dlp binary...');
    const ytdlp = spawn(binPath, ['--version']);
    
    ytdlp.stdout.on('data', (data) => {
      console.log(`yt-dlp version: ${data.toString().trim()}`);
    });
    
    ytdlp.stderr.on('data', (data) => {
      console.error(`yt-dlp stderr: ${data}`);
    });
    
    ytdlp.on('close', (code) => {
      if (code === 0) {
        console.log('yt-dlp binary test successful!');
      } else {
        console.error(`yt-dlp binary test failed with code ${code}`);
      }
    });
  });
}).on('error', (err) => {
  console.error(`Download error: ${err.message}`);
  fs.unlinkSync(binPath);
  process.exit(1);
}); 