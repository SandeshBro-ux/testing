# YouTube Video Info Extractor

A web application that allows users to extract information about YouTube videos, including the maximum available quality/resolution.

## Features

- Extract video metadata from YouTube URLs
- Display the maximum available quality for a video
- Show video details like uploader, duration, upload date, and view count
- Simple and responsive user interface

## Prerequisites

Before running this application, make sure you have the following installed:

1. [Node.js](https://nodejs.org/) (version 12 or higher)
2. [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation) - A powerful command-line utility for downloading videos

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/SandeshBro-ux/testing.git
   cd testing
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Make sure yt-dlp is installed on your system:
   - **Windows**: Download the executable from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases) and add it to your PATH
   - **macOS**: `brew install yt-dlp`
   - **Linux**: `sudo apt install yt-dlp` or equivalent for your distribution

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Enter a YouTube URL in the provided field and click "Get Video Info"

4. The application will display information about the video, including the maximum available quality

## How It Works

1. The application provides a simple web interface for users to input a YouTube URL
2. When submitted, the server uses yt-dlp to extract video information without triggering YouTube's bot detection
3. The server processes this data and returns the relevant information to the client
4. The frontend displays this information in a user-friendly format

## Deployment

To deploy this application to a production environment:

1. Set the PORT environment variable if needed:
   ```bash
   PORT=8080 npm start
   ```

2. For production deployment, you may want to use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "youtube-info-extractor"
   ```

## Contributing

Feel free to submit issues or pull requests to improve this project.

## License

This project is open source and available under the [MIT License](LICENSE). 