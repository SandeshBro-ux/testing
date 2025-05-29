let player;
const YOUTUBE_API_KEY = 'AIzaSyAKkaccfpCX8rfG03CLfkC9u4y2_ZLeRe4';
let currentVideoId = null;
let isYoutubeShort = false;

// This function is called by the YouTube IFrame API script
function onYouTubeIframeAPIReady() {
  // We create or load the player when the user submits the form
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('videoForm');
  const urlInput = document.getElementById('videoUrl');
  const loader = document.getElementById('loader');
  const results = document.getElementById('results');
  const maxQualityEl = document.getElementById('maxQuality');
  const videoDetailsEl = document.getElementById('videoDetails');
  const downloadMP4Button = document.getElementById('downloadMP4');
  const downloadMP3Button = document.getElementById('downloadMP3');
  const downloadSubtitleBtn = document.getElementById('downloadSubtitles');
  const notificationElement = document.getElementById('notification');
  const qualityTextElement = document.querySelector('.quality-text');
  const submitBtn = document.getElementById('submitBtn');

  // Initialize with sample video URL for demo purposes
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    urlInput.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  }

  // Focus input on page load
  urlInput.focus();
  
  // Add event listeners
  // Detect if Enter key is pressed in the input field
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });
  
  // Direct click handler for the submit button
  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    processVideoRequest();
  });
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    processVideoRequest();
  });
  
  // Function to process the video request
  function processVideoRequest() {
    const url = urlInput.value.trim();
    
    // Check if it's a YouTube Shorts URL
    isYoutubeShort = isYouTubeShortUrl(url);
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      showResult('Invalid YouTube URL');
      showNotification('Invalid YouTube URL. Please enter a valid YouTube link.', 'error');
      return;
    }
    currentVideoId = videoId;
    loader.style.display = 'block';
    results.style.display = 'none';
    videoDetailsEl.style.display = 'none';

    // Fetch video details using YouTube API v3
    fetchVideoDetails(videoId);

    if (player) {
      player.loadVideoById(videoId);
    } else {
      player = new YT.Player('player', {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
          'onError': onPlayerError
        }
      });
    }
  }

  // Event listeners for download buttons
  downloadMP4Button.addEventListener('click', () => {
    if (currentVideoId) {
      initiateDownload(currentVideoId, 'mp4');
    }
  });

  downloadMP3Button.addEventListener('click', () => {
    if (currentVideoId) {
      initiateDownload(currentVideoId, 'mp3');
    }
  });

  downloadSubtitleBtn.addEventListener('click', () => handleDownload('srt'));

  // Add tooltip hover effects
  const features = document.querySelectorAll('.feature');
  features.forEach(feature => {
    feature.addEventListener('mouseenter', () => {
      feature.style.transform = 'translateY(-5px)';
    });
    feature.addEventListener('mouseleave', () => {
      feature.style.transform = 'translateY(0px)';
    });
  });

  // Add animated placeholder to the input field
  setupAnimatedPlaceholder(urlInput);

  function initiateDownload(videoId, format) {
    // We'll create a server endpoint for this to handle the download
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const downloadUrl = `/download?url=${encodeURIComponent(videoUrl)}&format=${format}`;
    
    // Show a notification to the user
    showNotification(`Starting ${format.toUpperCase()} download...`, 'info');
    
    // Redirect to download URL or open in new tab
    window.open(downloadUrl, '_blank');
  }

  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    // Set notification style based on type
    notification.style.backgroundColor = 'var(--download-color)';
    
    switch(type) {
      case 'error':
        notification.style.backgroundColor = 'var(--primary-color)';
        notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        break;
      case 'info':
        notification.style.backgroundColor = 'var(--highlight-color)';
        notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
        break;
      case 'success':
      default:
        notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    }
    
    // Show the notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
    
    document.body.appendChild(notification);
  }

  function onPlayerReady(event) {
    console.log("Player is ready. Waiting for state change to get quality.");
  }

  function onPlayerStateChange(event) {
    console.log("Player state changed: " + event.data);
    if (event.data == YT.PlayerState.PLAYING) {
      setTimeout(() => {
        const levels = player.getAvailableQualityLevels();
        console.log("Available quality levels:", levels);
        let maxQuality = 'Unknown';
        if (levels && levels.length > 0) {
            if (levels[0] === 'auto' && levels.length > 1) {
                maxQuality = levels[1];
            } else {
                maxQuality = levels[0];
            }
        }
        showResult(formatQualityLabel(maxQuality));
        
        // Toggle quality text display based on whether it's a Shorts URL
        if (qualityTextElement) {
          qualityTextElement.style.display = isYoutubeShort ? 'none' : 'block';
        }
      }, 500);
    }
  }

  function formatQualityLabel(quality) {
    const qualityMap = {
      'hd2160': '4K',
      'hd1440': '1440p',
      'hd1080': '1080p HD',
      'hd720': '720p HD',
      'large': '480p',
      'medium': '360p',
      'small': '240p',
      'tiny': '144p',
      'unknown': 'Unknown'
    };
    
    return qualityMap[quality] || quality;
  }

  function onPlayerError(event) {
    showResult('Unable to load video.');
  }

  function showResult(text) {
    loader.style.display = 'none';
    maxQualityEl.textContent = text;
    results.style.display = 'block';
    
    // Toggle quality text display based on whether it's a Shorts URL
    if (qualityTextElement) {
      qualityTextElement.style.display = isYoutubeShort ? 'none' : 'block';
    }
  }

  function fetchVideoDetails(videoId) {
    fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,statistics,contentDetails`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.items && data.items.length > 0) {
          displayVideoDetails(data.items[0]);
          fetchChannelLogo(data.items[0].snippet.channelId);
        } else {
          console.error('No video details found');
        }
      })
      .catch(error => {
        console.error('Error fetching video details:', error);
      });
  }

  function fetchChannelLogo(channelId) {
    fetch(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&key=${YOUTUBE_API_KEY}&part=snippet`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.items && data.items.length > 0) {
          const channelLogo = data.items[0].snippet.thumbnails.default.url;
          document.getElementById('channelLogo').src = channelLogo;
        }
      })
      .catch(error => {
        console.error('Error fetching channel logo:', error);
      });
  }

  function displayVideoDetails(videoData) {
    const snippet = videoData.snippet;
    const statistics = videoData.statistics;
    const contentDetails = videoData.contentDetails;

    // Update DOM elements with video information
    document.getElementById('videoTitle').textContent = snippet.title;
    document.getElementById('channelName').textContent = snippet.channelTitle;
    document.getElementById('viewCount').textContent = formatNumber(statistics.viewCount);
    document.getElementById('likeCount').textContent = formatNumber(statistics.likeCount || 0);
    document.getElementById('publishDate').textContent = formatDate(snippet.publishedAt);
    document.getElementById('duration').textContent = formatDuration(contentDetails.duration);
    document.getElementById('description').textContent = snippet.description;
    
    // Set thumbnail (get highest resolution available)
    const thumbnails = snippet.thumbnails;
    const thumbnailUrl = thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;
    document.getElementById('thumbnail').src = thumbnailUrl;
    
    // Display the video details section
    videoDetailsEl.style.display = 'block';
    
    // Toggle quality text display based on whether it's a Shorts URL
    if (qualityTextElement) {
      qualityTextElement.style.display = isYoutubeShort ? 'none' : 'block';
    }
  }

  function formatNumber(num) {
    // Format numbers with K, M, B for thousand, million, billion
    const n = parseInt(num);
    if (n >= 1e9) {
      return (n / 1e9).toFixed(1) + 'B';
    } else if (n >= 1e6) {
      return (n / 1e6).toFixed(1) + 'M';
    } else if (n >= 1e3) {
      return (n / 1e3).toFixed(1) + 'K';
    }
    return n.toLocaleString();
  }

  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatDuration(isoDuration) {
    // Parse ISO 8601 duration format (PT#H#M#S)
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return isoDuration;
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    
    let result = '';
    if (hours > 0) {
      result += `${hours}:`;
      result += `${minutes.toString().padStart(2, '0')}:`;
    } else {
      result += `${minutes}:`;
    }
    result += seconds.toString().padStart(2, '0');
    
    return result;
  }

  function extractVideoId(url) {
    // Remove any @ symbol at the beginning if present
    const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|short\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = cleanUrl.match(regex);
    return match ? match[1] : null;
  }

  // Function to check if the URL is a YouTube Shorts URL
  function isYouTubeShortUrl(url) {
    // Remove any @ symbol at the beginning if present
    const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
    return cleanUrl.includes('youtube.com/shorts/') || cleanUrl.includes('youtube.com/short/');
  }

  // Add animated placeholder to the input field
  function setupAnimatedPlaceholder(inputElement) {
    const placeholders = [
      "Paste YouTube link here...",
      "Try with a YouTube Shorts link...",
      "Enter video ID directly...",
      "Try a popular music video link..."
    ];
    let currentIndex = 0;
    
    // Only animate if not focused
    const animatePlaceholder = () => {
      if (document.activeElement !== inputElement && !inputElement.value) {
        currentIndex = (currentIndex + 1) % placeholders.length;
        inputElement.placeholder = placeholders[currentIndex];
      }
    };
    
    setInterval(animatePlaceholder, 3000);
    
    // Reset to default placeholder when focused
    inputElement.addEventListener('focus', () => {
      inputElement.placeholder = "Paste YouTube link here...";
    });
  }

  // Start the animated loading messages
  function startLoaderAnimation() {
    const messages = document.querySelectorAll('.loader-msg');
    messages.forEach((msg, index) => {
      msg.style.opacity = '0';
      setTimeout(() => {
        msg.style.opacity = '1';
      }, index * 600);
    });
  }

  // Initialize the YouTube Player
  function initializePlayer(videoId) {
    player = new YT.Player('player', {
      height: '360',
      width: '640',
      videoId: videoId,
      playerVars: {
        'playsinline': 1,
        'controls': 0,
        'disablekb': 1,
        'rel': 0
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
  }

  // Get video information
  async function getVideoInfo(videoId) {
    // Wait for player to be ready
    await waitForPlayerToBeReady();
    
    // Get available quality levels
    const qualities = player.getAvailableQualityLevels();
    displayQuality(qualities[0]);
    
    // Get video details
    const videoData = player.getVideoData();
    const duration = player.getDuration();
    const videoTitle = videoData.title;
    
    // Display video information
    displayVideoInfo(videoId, videoTitle, duration);
  }

  // Wait for the YouTube player to be ready
  function waitForPlayerToBeReady() {
    return new Promise((resolve, reject) => {
      const checkPlayerReady = () => {
        if (player && player.getPlayerState !== undefined) {
          resolve();
        } else {
          setTimeout(checkPlayerReady, 100);
        }
      };
      checkPlayerReady();
    });
  }

  // Display video quality
  function displayQuality(quality) {
    const qualityDisplay = document.getElementById('quality-display');
    const formattedQuality = formatQuality(quality);
    qualityDisplay.textContent = formattedQuality;
  }

  // Display video information
  function displayVideoInfo(videoId, title, duration) {
    const titleElement = document.getElementById('videoTitle');
    const thumbnailElement = document.getElementById('thumbnail');
    const durationElement = document.getElementById('duration');
    const durationBadgeElement = document.getElementById('duration-badge');
    const channelNameElement = document.getElementById('channelName');
    const channelLogoElement = document.getElementById('channelLogo');
    const viewsElement = document.getElementById('viewCount');
    const likesElement = document.getElementById('likeCount');
    const publishedElement = document.getElementById('publishDate');
    const descriptionElement = document.getElementById('description');
    
    // Set title
    titleElement.textContent = title;
    
    // Set thumbnail
    thumbnailElement.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    thumbnailElement.onerror = () => {
      thumbnailElement.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    };
    
    // Set duration
    const formattedDuration = formatDuration(duration);
    durationElement.textContent = formattedDuration;
    durationBadgeElement.textContent = formattedDuration;
    
    // Get additional info (mock data for now since YouTube API restrictions)
    // In a real app, this would come from a server request to the YouTube API
    const channelName = "Channel Name";  // Default value, should be from API
    const views = "1,000,000+";          // Default value, should be from API
    const likes = "50,000+";             // Default value, should be from API
    const publishedDate = "2023-01-01";  // Default value, should be from API
    const description = "Video description would go here. This is a placeholder since we're not making an actual API call to YouTube.";
    
    // Set values
    channelNameElement.textContent = channelName;
    channelLogoElement.src = "https://yt3.googleusercontent.com/ytc/AOPolaSyCnytEsr_z4CIwPXJ5fEoXoHRFNR8FOaGt3FR=s88-c-k-c0x00ffffff-no-rj"; // Default channel logo
    viewsElement.textContent = views;
    likesElement.textContent = likes;
    publishedElement.textContent = formatDate(publishedDate);
    descriptionElement.textContent = description;
  }

  // Format quality string to be more readable
  function formatQuality(quality) {
    const qualityMap = {
      'small': '240p',
      'medium': '360p',
      'large': '480p',
      'hd720': '720p HD',
      'hd1080': '1080p Full HD',
      'hd1440': '1440p QHD',
      'hd2160': '2160p 4K',
      'highres': '4K+'
    };
    
    return qualityMap[quality] || quality;
  }

  // Handle download button click
  function handleDownload(format) {
    if (!currentVideoId) {
      showNotification('No video selected for download', 'error');
      return;
    }
    
    // Send download request to server
    const downloadUrl = `/download?url=https://www.youtube.com/watch?v=${currentVideoId}&format=${format}`;
    
    // Show notification
    showNotification(`Starting ${format.toUpperCase()} download...`, 'info');
    
    // Open in new tab or initiate download
    window.open(downloadUrl, '_blank');
  }

  // Check if the URL is a valid YouTube URL
  function isValidYoutubeUrl(url) {
    // Remove any @ symbol at the beginning if present
    const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|short\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[\&\?\#].*)?$/;
    return youtubeRegex.test(cleanUrl);
  }
}); 