let player;
// Hardcoded API key to ensure functionality
const YOUTUBE_API_KEY = 'AIzaSyAKkaccfpCX8rfG03CLfkC9u4y2_ZLeRe4';
let currentVideoId = null;
let isYoutubeShort = false;

// Helper function to log messages (can be expanded to UI later)
function logToUI(message, type = 'log') {
  console[type](`[UI LOG - ${type.toUpperCase()}]: ${message}`);
  // Example of showing in UI if an element #uiLog exists:
  // const uiLogEl = document.getElementById('uiLog');
  // if (uiLogEl) {
  //   const p = document.createElement('p');
  //   p.textContent = message;
  //   p.className = type;
  //   uiLogEl.appendChild(p);
  //   uiLogEl.scrollTop = uiLogEl.scrollHeight; // Scroll to bottom
  // }
}

// This function is called by the YouTube IFrame API script
function onYouTubeIframeAPIReady() {
  // This function is now empty as player is removed.
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('videoForm');
  const urlInput = document.getElementById('videoUrl');
  const loader = document.getElementById('loader');
  const resultsEl = document.getElementById('results');
  const errorDisplayElement = document.getElementById('error');
  const videoDetailsEl = document.getElementById('videoDetails');
  const downloadMP3Button = document.getElementById('downloadMP3');
  const downloadSubtitleBtn = document.getElementById('downloadSubtitles');
  const download1080pButton = document.getElementById('download1080p');
  const notificationElement = document.getElementById('notification');
  const submitBtn = document.getElementById('submitBtn');
  const closeBtn = document.querySelector('.notification-close');
  const copyDescriptionBtn = document.getElementById('copyDescriptionBtn');
  const downloadModal = document.getElementById('downloadModal');
  const closeModalBtn = document.querySelector('.close-modal');
  const continueToDownloadBtn = document.getElementById('continueToDownload');

  // Remove server API key fetch since we're using hardcoded key
  console.log("Using hardcoded API key for immediate functionality");
  
  urlInput.focus();
  
  function handleRequest() {
    // Clear previous state specifically from errorDisplayElement
    errorDisplayElement.textContent = '';
    errorDisplayElement.style.display = 'none';
    // No need to hide resultsEl or videoDetailsEl here yet, processVideoRequest will manage
    processVideoRequest();
  }
  
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRequest();
    }
  });
  
  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleRequest();
  });
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleRequest();
  });
  
  async function processVideoRequest() {
    const url = urlInput.value.trim();
    isYoutubeShort = isYouTubeShortUrl(url);
    currentVideoId = extractVideoId(url);

    // Initial UI reset for new request
    if (errorDisplayElement) {
        errorDisplayElement.textContent = '';
        errorDisplayElement.style.display = 'none';
    } else {
        console.error("CRITICAL: errorDisplayElement is null!");
    }

    if (videoDetailsEl) {
        videoDetailsEl.style.display = 'none'; // Hide details section
    } else {
        console.error("CRITICAL: videoDetailsEl is null when trying to hide it!");
    }
    
    if (resultsEl) {
        resultsEl.style.display = 'none';    // Hide overall results container initially
    } else {
         console.error("CRITICAL: resultsEl is null when trying to hide it!");
    }

    if (loader) {
        loader.style.display = 'block';      // Show loader
    } else {
        console.error("CRITICAL: loader element is null!");
    }

    // Hide "How It Works" section when processing a video request
    const howItWorksSection = document.querySelector('.how-it-works');
    if (howItWorksSection) {
        howItWorksSection.style.display = 'none';
    }

    if (!currentVideoId) {
      if (loader) loader.style.display = 'none';
      const msg = 'Invalid YouTube URL. Please enter a valid link (e.g., https://www.youtube.com/watch?v=VIDEO_ID).';
      if (errorDisplayElement) {
        errorDisplayElement.textContent = msg;
        errorDisplayElement.style.display = 'block';
      }
      if (resultsEl) resultsEl.style.display = 'block'; // Show results container to display this error
      
      // Show "How It Works" section again if there's an error
      if (howItWorksSection) {
          howItWorksSection.style.display = 'block';
      }
      
      showNotification(msg, 'error');
      return;
    }

    try {
      // Explicitly tell user we are fetching details
      showNotification('Fetching video details...', 'info', 1500); // Short-lived notification
      
      const videoData = await fetchVideoDetails(currentVideoId);
      displayVideoDetails(videoData); // Populates and shows videoDetailsEl
      fetchChannelLogo(videoData.snippet.channelId); // Async, no await needed here

      resultsEl.style.display = 'block'; // Show the main results container now that we have details
      showNotification('Video analysis complete!', 'success');

    } catch (error) {
      console.error('Error processing video request:', error.name, error.message, error.stack);
      let userErrorMessage = error.message || 'Failed to fetch video details. Please check the URL or try again later.';
      
      if (error.message.includes('API key') || error.message.includes('quota') || error.message.includes('accessNotConfigured') || error.message.includes('keyInvalid') || error.message.includes('disabled')) {
        userErrorMessage = 'Failed to fetch video details due to a YouTube API key issue (e.g., quota exceeded). Please try again later.';
        console.error("YOUTUBE API KEY ISSUE: " + error.message);
      } else if (error.message.includes('not found') || error.message.includes('private') || error.message.includes('unavailable') || error.message.includes('deleted')) {
        userErrorMessage = 'Video not found, or it is private/deleted, or the URL is incorrect.';
        
        // Only show "How It Works" again if it's a video not found error
        const howItWorksSection = document.querySelector('.how-it-works');
        if (howItWorksSection) {
            howItWorksSection.style.display = 'block';
        }
      }

      if (errorDisplayElement) {
        errorDisplayElement.textContent = userErrorMessage;
        errorDisplayElement.style.display = 'block';
      }
      if (resultsEl) resultsEl.style.display = 'block'; // Ensure results container is visible for the error message
      showNotification(userErrorMessage, 'error');
    } finally {
      if (loader) loader.style.display = 'none'; // Always hide loader
    }
  }

  downloadMP3Button.addEventListener('click', () => {
    if (currentVideoId) initiateDownload(currentVideoId, 'mp3');
    else showNotification('Please analyze a video first.', 'error');
  });
  downloadSubtitleBtn.addEventListener('click', () => {
    if (currentVideoId) initiateDownload(currentVideoId, 'srt');
    else showNotification('Please analyze a video first.', 'error');
  });
  download1080pButton.addEventListener('click', () => {
    if (currentVideoId) downloadHD1080p(currentVideoId);
    else showNotification('Please analyze a video first.', 'error');
  });

  const features = document.querySelectorAll('.feature');
  features.forEach(feature => {
    feature.addEventListener('mouseenter', () => feature.style.transform = 'translateY(-5px)');
    feature.addEventListener('mouseleave', () => feature.style.transform = 'translateY(0px)');
  });
  setupAnimatedPlaceholder(urlInput);

  async function downloadHD1080p(videoId) {
    showNotification('Preparing HD 1080p download via server...', 'info');
    try {
      const response = await fetch('/api/fetch-y2meta-download-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl: `https://www.youtube.com/watch?v=${videoId}` }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const { downloadLink, videoTitle } = await response.json();
      
      if (downloadLink) {
        showNotification(`Starting download for: ${videoTitle} (1080p MP4)`, 'success');
        // Trigger download in the current tab
        const a = document.createElement('a');
        a.href = downloadLink;
        // Suggest a filename that includes the title and quality
        a.download = `${videoTitle.replace(/[\\/:*?"<>|]/g, '')} - 1080p.mp4`; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        throw new Error('No download link received from server.');
      }
    } catch (error) {
      console.error('Error fetching download link from server:', error);
      showNotification(`Error preparing download: ${error.message}`, 'error');
    }
  }

  function initiateDownload(videoId, format) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const y2metaUrl = `https://y2meta.net/en-us3?url=${encodeURIComponent(videoUrl)}`;
    showNotification(`Redirecting to y2meta.net for ${format.toUpperCase()} download...`, 'info');
    window.open(y2metaUrl, '_blank'); // Keep this as a redirect for non-1080p for now
  }

  function showNotification(message, type = 'success', duration = 3000) {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.className = 'notification';
    let bgColor = 'var(--download-color)';

    switch(type) {
      case 'error':
        bgColor = 'var(--primary-color)';
        break;
      case 'info':
        bgColor = 'var(--highlight-color)';
        break;
    }
    notification.style.backgroundColor = bgColor;
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), duration);
  }

  function fetchVideoDetails(videoId) {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,statistics,contentDetails`;
    console.log("Fetching video details from: ", url); // Log the URL being fetched
    return fetch(url)
      .then(response => {
        console.log("API Response Status: ", response.status, response.statusText);
        if (!response.ok) {
          return response.json().then(errData => {
            console.error("API Error Data (JSON):", errData);
            const apiErrorMsg = errData?.error?.message || `YouTube API Error: ${response.status} - ${response.statusText || 'Unknown error'}`;
            // More specific check for API key problems based on typical error structures from Google APIs
            if (errData?.error?.errors?.[0]?.reason) {
                const reason = errData.error.errors[0].reason;
                if (reason === 'keyInvalid' || reason === 'keyDisabled' || reason.toLowerCase().includes('apikey')) {
                    throw new Error('API key is invalid or disabled.');
                } else if (reason === 'quotaExceeded') {
                    throw new Error('API quota exceeded.');
                } else if (reason === 'accessNotConfigured'){
                    throw new Error('API access not configured. YouTube Data API v3 might be disabled.');
                }
            }
            throw new Error(apiErrorMsg);
          }).catch((jsonParseOrApiError) => { 
            // This catch handles both JSON parsing errors and errors thrown from the .then(errData => ...) block
            console.error("Error processing API error response:", jsonParseOrApiError);
            // If it's an error we constructed, rethrow it, otherwise create a generic one
            if (jsonParseOrApiError instanceof Error && (jsonParseOrApiError.message.includes('API key') || jsonParseOrApiError.message.includes('quota') || jsonParseOrApiError.message.includes('accessNotConfigured'))) {
                throw jsonParseOrApiError;
            }
            throw new Error(`YouTube API Error: ${response.status} - ${response.statusText || 'Failed to parse error details or network issue.'}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log("API Success Data Received:", data);
        if (data.items && data.items.length > 0) {
          return data.items[0];
        } else {
          // This case might happen if the video ID is valid but the video is removed or made private after a 200 OK with empty items
          throw new Error('Video details not found. The video may have been removed or set to private.');
        }
      });
  }

  function fetchChannelLogo(channelId) {
    if(!channelId) {
        console.warn("Cannot fetch channel logo: channelId is missing");
        if(document.getElementById('channelLogo')) document.getElementById('channelLogo').src = ''; // Clear previous logo
        return;
    }
    fetch(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&key=${YOUTUBE_API_KEY}&part=snippet,statistics`)
      .then(response => response.json())
      .then(data => {
        if (data.items && data.items.length > 0) {
          // Set channel logo
          if (data.items[0].snippet?.thumbnails?.default?.url) {
            document.getElementById('channelLogo').src = data.items[0].snippet.thumbnails.default.url;
          }
          
          // Set subscriber count
          if (data.items[0].statistics?.subscriberCount) {
            const subCount = formatNumber(data.items[0].statistics.subscriberCount);
            document.getElementById('subscriberCount').textContent = subCount;
          } else {
            document.getElementById('subscriberCount').textContent = 'N/A';
          }
        } else {
          console.warn("Could not fetch channel data or data missing.");
          if(document.getElementById('channelLogo')) document.getElementById('channelLogo').src = ''; // Clear logo on failure
          if(document.getElementById('subscriberCount')) document.getElementById('subscriberCount').textContent = 'N/A';
        }
      }).catch(error => {
          console.error('Error fetching channel data:', error);
          if(document.getElementById('channelLogo')) document.getElementById('channelLogo').src = ''; // Clear logo on error
          if(document.getElementById('subscriberCount')) document.getElementById('subscriberCount').textContent = 'N/A';
      });
  }

  function displayVideoDetails(videoData) {
    const snippet = videoData.snippet;
    const statistics = videoData.statistics;
    const contentDetails = videoData.contentDetails;

    document.getElementById('videoTitle').textContent = snippet.title || 'N/A';
    document.getElementById('channelName').textContent = snippet.channelTitle || 'N/A';
    document.getElementById('viewCount').textContent = statistics ? formatNumber(statistics.viewCount) : 'N/A';
    document.getElementById('likeCount').textContent = statistics ? formatNumber(statistics.likeCount) : 'N/A'; // likeCount can be missing
    document.getElementById('publishDate').textContent = snippet.publishedAt ? formatDate(snippet.publishedAt) : 'N/A';
    document.getElementById('duration').textContent = contentDetails.duration ? formatDuration(contentDetails.duration) : 'N/A';
    document.getElementById('description').textContent = snippet.description || 'No description available.';
    
    const thumbnails = snippet.thumbnails;
    const thumbnailUrl = thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || ''; // Fallback to empty string
    document.getElementById('thumbnail').src = thumbnailUrl;
    document.getElementById('duration-badge').textContent = contentDetails.duration ? formatDuration(contentDetails.duration) : 'N/A';
    
    videoDetailsEl.style.display = 'flex'; 
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
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        console.error("Error formatting date: ", isoString, e);
        return 'Invalid Date';
    }
  }

  function formatDuration(isoDuration) {
    if (!isoDuration) return 'N/A';
    // Regex for ISO 8601 duration (PT#H#M#S)
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
        console.warn("Could not parse ISO duration: ", isoDuration);
        return 'N/A';
    }
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function extractVideoId(url) {
    const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
    // Corrected regex: forward slashes inside /.../ don't need double backslashes unless they are part of the pattern itself.
    // The original linter error pointed to this regex having \/ which is incorrect for a regex literal.
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

  // Function to initialize all event listeners
  function initEventListeners() {
    const form = document.getElementById('videoForm');
    const submitBtn = document.getElementById('submitBtn');
    const closeBtn = document.querySelector('.notification-close');
    const copyDescriptionBtn = document.getElementById('copyDescriptionBtn');
    
    // Add event listener for form submission
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        processVideoRequest();
      });
    }

    // Add event listener for submit button click
    if (submitBtn) {
      submitBtn.addEventListener('click', function(e) {
        e.preventDefault();
        processVideoRequest();
      });
    }
    
    // Add event listener for notification close button
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        document.querySelector('.notification').classList.remove('show');
      });
    }
    
    // Add event listener for copy description button
    if (copyDescriptionBtn) {
      copyDescriptionBtn.addEventListener('click', copyDescriptionText);
    }
  }

  // Function to copy description text to clipboard
  function copyDescriptionText() {
    const descriptionText = document.querySelector('.description p').textContent;
    if (!descriptionText) {
      showNotification('No description to copy', 'info');
      return;
    }
    
    navigator.clipboard.writeText(descriptionText)
      .then(() => {
        showNotification('Description copied to clipboard', 'success');
      })
      .catch(err => {
        showNotification('Failed to copy description', 'error');
        console.error('Could not copy text: ', err);
      });
  }

  // Call initEventListeners when the DOM is fully loaded
  initEventListeners();
}); 