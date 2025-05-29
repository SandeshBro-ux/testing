# FreeYTZone

![FreeYTZone Logo](https://img.icons8.com/color/96/000000/youtube-play.png)

FreeYTZone is a powerful YouTube video downloader and quality analyzer. With FreeYTZone, users can easily check video quality information and download videos in different formats.

## Features

- ✅ **Modern, Interactive UI:** Clean and responsive design
- ✅ **Video Analysis:** Check available quality options for any YouTube video
- ✅ **Multiple Download Formats:** Download as MP4 video or MP3 audio
- ✅ **Subtitles Support:** Extract subtitles from videos (when available)
- ✅ **Detailed Video Info:** View video details including likes, views, channel info, and more
- ✅ **YouTube Player Integration:** Uses the YouTube IFrame API for reliable quality detection
- ✅ **Mobile Responsive:** Works on all device sizes

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Node.js with Express.js
- **YouTube Integration:** YouTube IFrame API
- **Download Engine:** youtube-dl-exec (yt-dlp wrapper)
- **Styling:** Custom CSS with responsive design

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/freeytzone.git
cd freeytzone
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Visit `http://localhost:3000` in your browser.

## Environment Variables

Create a `.env` file in the root directory with the following variables (optional):

```
PORT=3000
NODE_ENV=development
```

## Deployment

This application can be deployed to any Node.js hosting service like Render, Heroku, or Vercel.

### Deployment on Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment Variables:** Set NODE_ENV=production

## Usage

1. Enter a YouTube video URL in the input field
2. Click "Analyze Video" to get detailed information
3. Once analysis is complete, you can download the video as MP4 or MP3
4. View detailed video information including quality, duration, views, etc.

## Legal Disclaimer

FreeYTZone is for educational purposes only. Please respect YouTube's Terms of Service and only download videos that you have permission to download. This tool should not be used to infringe on copyright or for any illegal purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [YouTube API](https://developers.google.com/youtube)
- [youtube-dl-exec](https://github.com/microlinkhq/youtube-dl-exec)
- [Express.js](https://expressjs.com/)
- [Font Awesome](https://fontawesome.com/) for icons

---

Created with ❤️ by [Your Name] 