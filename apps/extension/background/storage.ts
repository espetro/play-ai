import { createStorage } from "@play-ai/ai/core/store";
import type { TranscriptLine } from "@play-ai/ai/core/types";

// browser is the WXT auto-import — resolves to chrome in MV3, native browser in Firefox.
// We avoid createExtensionStorageAdapter because it accesses globalThis.browser
// which is undefined in Chrome (Chrome only exposes `chrome`, not `browser`).
export const storage = createStorage({
  get: (keys: string[]) => browser.storage.local.get(keys) as Promise<Record<string, unknown>>,
  set: (items: Record<string, unknown>) => browser.storage.local.set(items),
});

const TRANSCRIPT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface TranscriptCacheEntry {
  lines: TranscriptLine[];
  fetchedAt: number;
}

export async function getTranscriptCache(videoId: string): Promise<TranscriptLine[] | null> {
  const { transcriptCache } = (await browser.storage.local.get("transcriptCache")) as {
    transcriptCache?: Record<string, TranscriptCacheEntry>;
  };
  const entry = transcriptCache?.[videoId];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TRANSCRIPT_CACHE_TTL_MS) return null; // stale
  return entry.lines;
}

export async function setTranscriptCache(videoId: string, lines: TranscriptLine[]): Promise<void> {
  const { transcriptCache } = (await browser.storage.local.get("transcriptCache")) as {
    transcriptCache?: Record<string, TranscriptCacheEntry>;
  };
  await browser.storage.local.set({
    transcriptCache: {
      ...transcriptCache,
      [videoId]: { lines, fetchedAt: Date.now() },
    },
  });
}
