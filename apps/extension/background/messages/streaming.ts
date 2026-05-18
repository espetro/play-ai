import type { ChatMessage } from "@play-ai/ai/core/types";
import { activePorts } from "./index";

export interface ActiveStream {
  conversationId: string;
  partialContent: string;
  controller: AbortController;
  debounceTimer?: NodeJS.Timeout;
}

export const activeStreams = new Map<string, ActiveStream>();

export async function broadcastStateUpdate() {
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

export function broadcastPartialMessage(conversationId: string, message: ChatMessage) {
  for (const port of activePorts) {
    port.postMessage({ type: "MESSAGE_UPDATE", conversationId, message });
  }
  browser.tabs.query({ url: "*://*.youtube.com/*" }).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        browser.tabs
          .sendMessage(tab.id, { type: "MESSAGE_UPDATE", conversationId, message })
          .catch(() => {});
      }
    }
  });
}

export async function flushStreamingMessage(conversationId: string, content: string) {
  const { streamingMessages } = (await browser.storage.local.get(["streamingMessages"])) as {
    streamingMessages?: Record<string, string>;
  };
  const updated = { ...streamingMessages, [conversationId]: content };
  await browser.storage.local.set({ streamingMessages: updated });
}
