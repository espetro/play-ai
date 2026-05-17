import type { IVideoPlatform } from "./base";

declare const document: Document;

export function createYoutubeAdapter(): IVideoPlatform {
  return {
    getVideoId() {
      const url = new URL(window.location.href);
      return url.searchParams.get("v");
    },
    getCurrentTimestamp() {
      const video = document.querySelector("video");
      return video?.currentTime ?? 0;
    },
    pauseVideo() {
      const video = document.querySelector("video");
      video?.pause();
    },
  };
}
