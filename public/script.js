let player;
const YOUTUBE_API_KEY = 'AIzaSyAKkaccfpCX8rfG03CLfkC9u4y2_ZLeRe4';
let currentVideoId = null;
let isYoutubeShort = false;

// This function is called by the YouTube IFrame API script
function onYouTubeIframeAPIReady() {
  // Player is initialized on demand by processVideoRequest
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('videoForm');
  const urlInput = document.getElementById('videoUrl');
  const loader = document.getElementById('loader');
  const resultsEl = document.getElementById('results');
  const errorDisplayElement = document.getElementById('error');
  const maxQualityEl = document.getElementById('maxQuality');
  const videoDetailsEl = document.getElementById('videoDetails');
  const downloadMP4Button = document.getElementById('downloadMP4');
  const downloadMP3Button = document.getElementById('downloadMP3');
  const downloadSubtitleBtn = document.getElementById('downloadSubtitles');
  const notificationElement = document.getElementById('notification');
  const qualityTextElement = document.querySelector('.quality-text');
  const submitBtn = document.getElementById('submitBtn');

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    urlInput.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  }
  urlInput.focus();
  
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processVideoRequest();
    }
  });
  
  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    processVideoRequest();
  });
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    processVideoRequest();
  });
  
  async function processVideoRequest() {
    const url = urlInput.value.trim();
    isYoutubeShort = isYouTubeShortUrl(url);
    currentVideoId = extractVideoId(url);

    // Clear previous results/errors
    errorDisplayElement.textContent = '';
    errorDisplayElement.style.display = 'none';
    videoDetailsEl.style.display = 'none';
    resultsEl.style.display = 'none';
    loader.style.display = 'block';

    if (!currentVideoId) {
      loader.style.display = 'none';
      errorDisplayElement.textContent = 'Invalid YouTube URL. Please enter a valid link.';
      errorDisplayElement.style.display = 'block';
      resultsEl.style.display = 'block';
      showNotification('Invalid YouTube URL. Please enter a valid YouTube link.', 'error');
      return;
    }

    try {
      const videoData = await fetchVideoDetails(currentVideoId);
      displayVideoDetails(videoData);
      fetchChannelLogo(videoData.snippet.channelId);

      // Initialize or update player for quality info
      if (player) {
        player.loadVideoById(currentVideoId);
      } else {
        player = new YT.Player('player', {
          height: '0', width: '0', videoId: currentVideoId,
          playerVars: { autoplay: 0, mute: 1, controls: 0 },
          events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange, 'onError': onPlayerError }
        });
      }
      
      resultsEl.style.display = 'block';
      showNotification('Video analysis complete!', 'success');

    } catch (error) {
      console.error('Error processing video request:', error);
      errorDisplayElement.textContent = error.message || 'Failed to fetch video details. Check console for more info.';
      errorDisplayElement.style.display = 'block';
      resultsEl.style.display = 'block';
      showNotification(error.message || 'Failed to fetch video details.', 'error');
    } finally {
      loader.style.display = 'none';
    }
  }

  downloadMP4Button.addEventListener('click', () => {
    if (currentVideoId) initiateDownload(currentVideoId, 'mp4');
  });
  downloadMP3Button.addEventListener('click', () => {
    if (currentVideoId) initiateDownload(currentVideoId, 'mp3');
  });
  downloadSubtitleBtn.addEventListener('click', () => {
    if (currentVideoId) initiateDownload(currentVideoId, 'srt');
  });

  const features = document.querySelectorAll('.feature');
  features.forEach(feature => {
    feature.addEventListener('mouseenter', () => feature.style.transform = 'translateY(-5px)');
    feature.addEventListener('mouseleave', () => feature.style.transform = 'translateY(0px)');
  });
  setupAnimatedPlaceholder(urlInput);

  function initiateDownload(videoId, format) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const downloadUrl = `/download?url=${encodeURIComponent(videoUrl)}&format=${format}`;
    showNotification(`Starting ${format.toUpperCase()} download...`, 'info');
    window.open(downloadUrl, '_blank');
  }

  function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.className = 'notification';
    let iconClass = 'fas fa-check-circle';
    let bgColor = 'var(--download-color)';

    switch(type) {
      case 'error':
        iconClass = 'fas fa-exclamation-circle';
        bgColor = 'var(--primary-color)';
        break;
      case 'info':
        iconClass = 'fas fa-info-circle';
        bgColor = 'var(--highlight-color)';
        break;
    }
    notification.style.backgroundColor = bgColor;
    notification.innerHTML = `<i class="${iconClass}"></i> ${message}`;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
  }

  function onPlayerReady(event) {
    console.log("Player is ready.");
    const levels = event.target.getAvailableQualityLevels();
    if (levels && levels.length > 0) {
       updateQualityDisplayAfterPlayer(levels);
    } else {
       event.target.playVideo();
    }
  }

  function onPlayerStateChange(event) {
    console.log("Player state changed: " + event.data);
    if (event.data == YT.PlayerState.PLAYING || event.data == YT.PlayerState.PAUSED || event.data == YT.PlayerState.CUED) {
      const levels = player.getAvailableQualityLevels();
      if (levels && levels.length > 0){
        updateQualityDisplayAfterPlayer(levels);
        if(event.data == YT.PlayerState.PLAYING) player.stopVideo();
      }
    }
  }
  
  function updateQualityDisplayAfterPlayer(levels) {
      let maxQuality = 'Unknown';
      if (levels && levels.length > 0) {
          maxQuality = levels[0] === 'auto' && levels.length > 1 ? levels[1] : levels[0];
      }
      updateQualityDisplay(formatQualityLabel(maxQuality));
  }

  function formatQualityLabel(quality) {
    const qualityMap = { 'hd2160': '4K', 'hd1440': '1440p', 'hd1080': '1080p HD', 'hd720': '720p HD', 'large': '480p', 'medium': '360p', 'small': '240p', 'tiny': '144p', 'unknown': 'N/A' };
    return qualityMap[quality] || quality;
  }

  function onPlayerError(event) {
    console.error("Player Error:", event.data);
    showNotification('Error with video player. Quality info may be unavailable.', 'error');
    updateQualityDisplay("Player Error");
  }

  function updateQualityDisplay(text) {
    maxQualityEl.textContent = text;
    if (qualityTextElement) {
      qualityTextElement.style.display = isYoutubeShort ? 'none' : 'block';
    }
  }

  function fetchVideoDetails(videoId) {
    return fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,statistics,contentDetails`)
      .then(response => {
        if (!response.ok) {
          return response.json().then(errData => {
            const apiErrorMsg = errData?.error?.message || `YouTube API error: ${response.status}`;
            throw new Error(apiErrorMsg);
          }).catch(() => { 
            throw new Error(`YouTube API error: ${response.status}. Unable to parse error details.`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.items && data.items.length > 0) {
          return data.items[0];
        } else {
          throw new Error('No video details found. The video might be private or deleted.');
        }
      });
  }

  function fetchChannelLogo(channelId) {
    fetch(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&key=${YOUTUBE_API_KEY}&part=snippet`)
      .then(response => response.json())
      .then(data => {
        if (data.items && data.items.length > 0) {
          document.getElementById('channelLogo').src = data.items[0].snippet.thumbnails.default.url;
        }
      }).catch(error => console.error('Error fetching channel logo:', error));
  }

  function displayVideoDetails(videoData) {
    const snippet = videoData.snippet;
    const statistics = videoData.statistics;
    const contentDetails = videoData.contentDetails;

    document.getElementById('videoTitle').textContent = snippet.title;
    document.getElementById('channelName').textContent = snippet.channelTitle;
    document.getElementById('viewCount').textContent = statistics ? formatNumber(statistics.viewCount) : 'N/A';
    document.getElementById('likeCount').textContent = statistics ? formatNumber(statistics.likeCount || 0) : 'N/A';
    document.getElementById('publishDate').textContent = formatDate(snippet.publishedAt);
    document.getElementById('duration').textContent = formatDuration(contentDetails.duration);
    document.getElementById('description').textContent = snippet.description || 'No description available.';
    
    const thumbnails = snippet.thumbnails;
    const thumbnailUrl = thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;
    document.getElementById('thumbnail').src = thumbnailUrl;
    document.getElementById('duration-badge').textContent = formatDuration(contentDetails.duration);
    
    videoDetailsEl.style.display = 'flex';
    
    updateQualityDisplay("Loading quality..."); 
  }

  function formatNumber(numStr) {
    if (numStr === undefined || numStr === null) return 'N/A';
    const n = parseInt(numStr);
    if (isNaN(n)) return numStr;
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0','') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0','') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0','') + 'K';
    return n.toLocaleString();
  }

  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'N/A';
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function extractVideoId(url) {
    const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|short\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = cleanUrl.match(regex);
    return match ? match[1] : null;
  }

  function isYouTubeShortUrl(url) {
    const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
    return cleanUrl.includes('youtube.com/shorts/') || cleanUrl.includes('youtube.com/short/');
  }

  function setupAnimatedPlaceholder(inputElement) {
    const placeholders = [ "Paste YouTube link here...", "Try with a YouTube Shorts link...", "Enter video ID directly...", "Try a popular music video link..." ];
    let currentIndex = 0;
    const animatePlaceholder = () => {
      if (document.activeElement !== inputElement && !inputElement.value) {
        currentIndex = (currentIndex + 1) % placeholders.length;
        inputElement.placeholder = placeholders[currentIndex];
      }
    };
    setInterval(animatePlaceholder, 3000);
    inputElement.addEventListener('focus', () => inputElement.placeholder = "Paste YouTube link here...");
  }
}); 