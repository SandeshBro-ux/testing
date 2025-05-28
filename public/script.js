let player;

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

  function extractVideoId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
}); 