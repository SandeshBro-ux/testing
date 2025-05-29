let player;
const YOUTUBE_API_KEY = 'AIzaSyAKkaccfpCX8rfG03CLfkC9u4y2_ZLeRe4';

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

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    const videoId = extractVideoId(url);
    if (!videoId) {
      showResult('Invalid YouTube URL');
      return;
    }
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
  });

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
        showResult(maxQuality);
      }, 500);
    }
  }

  function onPlayerError(event) {
    showResult('Unable to load video.');
  }

  function showResult(text) {
    loader.style.display = 'none';
    maxQualityEl.textContent = text;
    results.style.display = 'block';
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
        } else {
          console.error('No video details found');
        }
      })
      .catch(error => {
        console.error('Error fetching video details:', error);
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
  }

  function formatNumber(num) {
    return parseInt(num).toLocaleString();
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
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
}); 