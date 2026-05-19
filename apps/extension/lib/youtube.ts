export function extractVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get("v");
  if (videoId && videoId.length === 11) {
    return videoId;
  }
  return null;
}

export function onVideoChange(callback: (videoId: string | null) => void) {
  let currentVideoId = extractVideoId();

  const checkVideo = () => {
    const newVideoId = extractVideoId();
    if (newVideoId !== currentVideoId) {
      currentVideoId = newVideoId;
      callback(newVideoId);
    }
  };

  // YouTube's SPA navigation event
  window.addEventListener("yt-navigate-finish", checkVideo);

  // Fallback for history API
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(history, args);
    checkVideo();
  };

  return () => {
    window.removeEventListener("yt-navigate-finish", checkVideo);
    history.pushState = originalPushState;
  };
}
