export const DEFAULT_SUGGESTIONS = [
  "Summarize this video",
  "TL;DR of this video",
  "What are the main arguments?",
  "Explain this video like I'm 5",
  "Write study notes from this video",
  "Quiz me on this video",
] as const;

export type SuggestionPrompt = (typeof DEFAULT_SUGGESTIONS)[number];
