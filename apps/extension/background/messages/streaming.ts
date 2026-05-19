import type { ChatMessage } from "@play-ai/ai/core/types";
import { activePorts } from "./index";
import { getLogger } from "~/lib/logger";
import { $videoId } from "~/lib/storage";

const logger = getLogger(["background", "streaming"]);

const MAX_BROADCASTS_PER_VIDEO_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitEntry = { count: number; resetAt: number };

const broadcastRateLimitMap = new Map<string, RateLimitEntry>();

function isRateLimited(videoId: string): boolean {
  const now = Date.now();
  const entry = broadcastRateLimitMap.get(videoId);

  if (!entry || now >= entry.resetAt) {
    broadcastRateLimitMap.set(videoId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_BROADCASTS_PER_VIDEO_PER_WINDOW) {
    logger.warn("Broadcast rate limit exceeded for videoId {videoId} ({count}/{max} in window)", {
      videoId,
      count: entry.count,
      max: MAX_BROADCASTS_PER_VIDEO_PER_WINDOW,
    });
    return true;
  }

  entry.count++;
  return false;
}

export interface ActiveStream {
  conversationId: string;
  videoId?: string;
  partialContent: string;
  controller: AbortController;
  debounceTimer?: NodeJS.Timeout;
}

export const activeStreams = new Map<string, ActiveStream>();

export async function broadcastStateUpdate(videoId?: string) {
  const effectiveVideoId = videoId ?? (await $videoId.getValue());
  if (effectiveVideoId && isRateLimited(effectiveVideoId)) {
    return;
  }

  const tabs = await browser.tabs.query({ url: "*://*.youtube.com/*" });
  for (const tab of tabs) {
    if (tab.id) {
      browser.tabs.sendMessage(tab.id, { type: "STATE_UPDATE", patch: {} }).catch(() => {});
    }
  }
  for (const port of activePorts) {
    port.postMessage({ type: "STATE_UPDATE", patch: {} });
  }
}

export async function broadcastPartialMessage(conversationId: string, message: ChatMessage) {
  const stream = activeStreams.get(conversationId);
  const effectiveVideoId = stream?.videoId ?? (await $videoId.getValue());
  if (effectiveVideoId && isRateLimited(effectiveVideoId)) {
    return;
  }

  for (const port of activePorts) {
    port.postMessage({ type: "MESSAGE_UPDATE", conversationId, message });
  }
  const tabs = await browser.tabs.query({ url: "*://*.youtube.com/*" });
  for (const tab of tabs) {
    if (tab.id) {
      browser.tabs
        .sendMessage(tab.id, { type: "MESSAGE_UPDATE", conversationId, message })
        .catch(() => {});
    }
  }
}

export async function flushStreamingMessage(conversationId: string, content: string) {
  const { streamingMessages } = (await browser.storage.local.get(["streamingMessages"])) as {
    streamingMessages?: Record<string, string>;
  };
  const updated = { ...streamingMessages, [conversationId]: content };
  await browser.storage.local.set({ streamingMessages: updated });
}
