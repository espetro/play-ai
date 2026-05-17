import type { AppConfig, ExtensionState } from "@play-ai/ai/core/types";

export type MessageType =
  | { type: "GET_STATE" }
  | { type: "SET_CONFIG"; payload: AppConfig }
  | { type: "SEND_MESSAGE"; payload: { videoId: string; content: string } }
  | { type: "CLEAR_CHAT"; payload: { videoId: string } }
  | { type: "STATE_UPDATE"; patch: Partial<ExtensionState> }
  | {
      type: "TEST_CONNECTION";
      payload: { provider: "anthropic" | "openai"; baseUrl?: string; apiKey: string };
    }
  | { type: "GET_MODELS" }
  | { type: "FETCH_TRANSCRIPT" };

export type TranscriptResponse = {
  available: boolean;
  lines: string[] | null;
};

// Use the callback-based API for reliability across all Chrome versions and MV3
// service worker lifecycle edge cases. The Promise-based sendMessage (Chrome 116+)
// has known bugs where the service worker can be terminated before the response
// is forwarded back to the sender. The callback form also works on Firefox
// (browser.runtime.lastError is populated inside callbacks via Firefox's
// backwards-compatibility shim).
export function sendMessage<T = unknown>(message: MessageType): Promise<T> {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(message, (response: T) => {
      if (browser.runtime.lastError) {
        reject(new Error(browser.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/** @deprecated use {@link browser.runtime.onMessage} directly */
export const onMessage = browser.runtime.onMessage;
