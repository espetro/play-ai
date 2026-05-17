export const SUPPORTED_PLATFORMS = ["youtube", "vimeo"] as const;

export interface IVideoPlatform {
  getVideoId(): string | null;
  getCurrentTimestamp(): number;
  pauseVideo(): void;
}
