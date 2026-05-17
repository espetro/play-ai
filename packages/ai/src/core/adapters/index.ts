import { createYoutubeAdapter } from "./youtube";
import type { IVideoPlatform } from "./base";

export function detectPlatform(): string {
  const hostname = window.location.hostname;
  if (hostname.includes("youtube.com")) return "youtube";
  if (hostname.includes("vimeo.com")) return "vimeo";
  return "unknown";
}

export function createAdapter(platform: string): IVideoPlatform | null {
  switch (platform) {
    case "youtube":
      return createYoutubeAdapter();
    default:
      return null;
  }
}

export type { IVideoPlatform };
