import { useCallback, useEffect } from "react";
import { extractVideoId } from "~/lib/youtube";

/**
 * Thin escape-hatch wrapper: makes the empty-dep intent explicit.
 * Use this only when you genuinely need to run once on mount + cleanup on unmount.
 */
function useMountEffect(effect: () => void | (() => void)): void {
  // eslint-disable-next-line no-restricted-syntax
  useEffect(effect, []);
}

/**
 * Wraps window.addEventListener("yt-navigate-finish", ...) subscription.
 * Calls `onNavigate` with the current videoId whenever YouTube navigation finishes.
 * No-ops on non-YouTube pages.
 */
export function useYouTubeNavigation(onNavigate: (videoId: string) => void): void {
  const handleNavigation = useCallback(() => {
    const videoId = extractVideoId();
    if (videoId) {
      onNavigate(videoId);
    }
  }, [onNavigate]);

  useMountEffect(function subscribeToYouTubeNavigation() {
    window.addEventListener("yt-navigate-finish", handleNavigation);
    return function unsubscribeFromYouTubeNavigation() {
      window.removeEventListener("yt-navigate-finish", handleNavigation);
    };
  });
}
