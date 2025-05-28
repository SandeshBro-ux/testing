document.addEventListener('DOMContentLoaded', () => {
  const videoForm = document.getElementById('videoForm');
  const videoUrlInput = document.getElementById('videoUrl');
  const submitBtn = document.getElementById('submitBtn');
  const loader = document.getElementById('loader');
  const results = document.getElementById('results');
  const errorMsg = document.getElementById('errorMsg');
  
  // Elements for displaying video info
  const thumbnail = document.getElementById('thumbnail');
  const videoTitle = document.getElementById('videoTitle');
  const uploader = document.getElementById('uploader');
  const maxQuality = document.getElementById('maxQuality');
  const resolution = document.getElementById('resolution');
  const duration = document.getElementById('duration');
  const uploadDate = document.getElementById('uploadDate');
  const viewCount = document.getElementById('viewCount');
  
  videoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const videoUrl = videoUrlInput.value.trim();
    
    if (!videoUrl) {
      showError('Please enter a YouTube URL');
      return;
    }
    
    // Show loader, hide results
    loader.style.display = 'block';
    results.style.display = 'none';
    errorMsg.textContent = '';
    submitBtn.disabled = true;
    
    try {
      const response = await fetch('/api/video-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        const errorMessage = translateErrorMessage(data.error || data.message || 'Failed to get video information');
        showError(errorMessage);
        return;
      }
      
      displayVideoInfo(data.data);
    } catch (error) {
      console.error('Error:', error);
      showError('An error occurred connecting to the server. Please try again later.');
    } finally {
      loader.style.display = 'none';
      submitBtn.disabled = false;
    }
  });
  
  // Function to translate technical error messages to user-friendly messages
  function translateErrorMessage(errorMessage) {
    if (errorMessage.includes('yt-dlp is not installed') || 
        errorMessage.includes('Failed to get video info with ytdl-core')) {
      return 'Our server is having trouble processing YouTube videos at the moment. Please try again later.';
    }
    
    if (errorMessage.includes('video unavailable') || 
        errorMessage.includes('private video') ||
        errorMessage.includes('This video is unavailable') ||
        errorMessage.includes('Status code: 410')) {
      return 'This video appears to be private, deleted, or otherwise unavailable (it may have been removed).';
    }
    
    if (errorMessage.includes('age-restricted')) {
      return 'This video is age-restricted and cannot be processed.';
    }
    
    if (errorMessage.includes('Invalid YouTube URL')) {
      return 'Please enter a valid YouTube URL.';
    }
    
    // Generic error message for any other errors
    return 'Unable to process this video. Please try again with a different video.';
  }
  
  function showError(message) {
    loader.style.display = 'none';
    results.style.display = 'block';
    errorMsg.textContent = message;
    submitBtn.disabled = false;
  }
  
  function displayVideoInfo(videoInfo) {
    // Format duration from seconds to readable format
    const formattedDuration = formatDuration(videoInfo.duration);
    
    // Format upload date from YYYYMMDD to readable format
    const formattedDate = formatDate(videoInfo.uploadDate);
    
    // Format view count with commas
    const formattedViews = videoInfo.viewCount?.toLocaleString() || 'N/A';
    
    // Set values
    thumbnail.src = videoInfo.thumbnail || '';
    videoTitle.textContent = videoInfo.title || 'N/A';
    uploader.textContent = videoInfo.uploader || 'N/A';
    maxQuality.textContent = videoInfo.maxQuality || 'N/A';
    resolution.textContent = videoInfo.maxFormat?.resolution || 'N/A';
    duration.textContent = formattedDuration;
    uploadDate.textContent = formattedDate;
    viewCount.textContent = formattedViews;
    
    // Show results
    results.style.display = 'block';
  }
  
  function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return 'N/A';
    
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    const date = new Date(year, month - 1, day);
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  }
}); 