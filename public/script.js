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
        // data.error from server should contain the processed error message
        const errorMessage = data.error || 'An unknown error occurred while fetching video information.';
        showError(errorMessage); 
        return;
      }
      
      displayVideoInfo(data.data);
    } catch (error) {
      console.error('Network or client-side fetch error:', error);
      showError('An error occurred connecting to the server. Please try again later.');
    } finally {
      loader.style.display = 'none';
      submitBtn.disabled = false;
    }
  });
  
  // No longer needed as server sends processed messages
  // function translateErrorMessage(errorMessage) { ... }
  
  function showError(message) {
    loader.style.display = 'none';
    results.style.display = 'block';
    errorMsg.textContent = message;
    submitBtn.disabled = false;
  }
  
  function displayVideoInfo(videoInfo) {
    const formattedDuration = formatDuration(videoInfo.duration);
    const formattedDate = formatDate(videoInfo.uploadDate);
    const formattedViews = videoInfo.viewCount?.toLocaleString() || 'N/A';
    
    thumbnail.src = videoInfo.thumbnail || '';
    videoTitle.textContent = videoInfo.title || 'N/A';
    uploader.textContent = videoInfo.uploader || 'N/A';
    maxQuality.textContent = videoInfo.maxQuality || 'N/A';
    resolution.textContent = videoInfo.maxFormat?.resolution || 'N/A';
    duration.textContent = formattedDuration;
    uploadDate.textContent = formattedDate;
    viewCount.textContent = formattedViews;
    
    results.style.display = 'block';
  }
  
  function formatDuration(seconds) {
    if (!seconds && seconds !== 0) return 'N/A'; // Allow 0 seconds
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
    try {
      const date = new Date(year, month - 1, day);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString(undefined, options);
    } catch (e) {
      return 'N/A'; // Handle invalid date strings
    }
  }
}); 