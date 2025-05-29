# YouTube Video Info Extractor

A web application that allows users to extract information about YouTube videos, including the maximum available quality/resolution.

## Features

- Extract video metadata from YouTube URLs
- Display the maximum available quality for a video
- Show video details like uploader, duration, upload date, and view count
- Simple and responsive user interface
- Works on both local environments and cloud platforms like Render

## Prerequisites

Before running this application locally, make sure you have the following installed:

1. [Node.js](https://nodejs.org/) (version 14 or higher)
2. [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation) - A powerful command-line utility for downloading videos (optional - the app will fall back to ytdl-core if not available)

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

3. (Optional) For better performance, install yt-dlp on your local system:
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
2. When submitted, the server tries to extract video information using one of two methods:
   - First, it attempts to use yt-dlp if available (faster and more reliable)
   - If yt-dlp isn't installed or fails, it falls back to ytdl-core (pure JavaScript solution)
3. The server processes this data and returns the relevant information to the client
4. The frontend displays this information in a user-friendly format

## Deployment on Render

This application is ready to deploy on [Render](https://render.com/):

1. Fork or push this repository to your GitHub account
2. Log in to your Render account
3. Create a new Web Service and select your repository
4. Use the following settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add the following environment variable:
   - `RENDER=true`

The application will automatically use the ytdl-core fallback on Render, as yt-dlp isn't available in their environment.

## Debugging

The application includes extensive logging:

- Logs are stored in the `logs` directory
- A debug endpoint is available at `/debug` for system information
- Check the console output for real-time logs

## Contributing

Feel free to submit issues or pull requests to improve this project.

## License

This project is open source and available under the [MIT License](LICENSE). 