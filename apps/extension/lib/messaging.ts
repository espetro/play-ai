import type { AppConfig, ExtensionState, TranscriptLine } from "@play-ai/ai/core/types";
import type { Browser } from "wxt/browser";

export type { TranscriptLine };

export type MessageType =
  | { type: "GET_STATE" }
  | { type: "SET_CONFIG"; payload: AppConfig }
  | { type: "SEND_MESSAGE"; payload: { conversationId: string; content: string } }
  | { type: "CREATE_CONVERSATION"; payload: { videoId: string } }
  | { type: "DELETE_CONVERSATION"; payload: { conversationId: string } }
  | { type: "SET_ACTIVE_CONVERSATION"; payload: { conversationId: string | null } }
  | { type: "STATE_UPDATE"; patch: Partial<ExtensionState> }
  | {
      type: "TEST_CONNECTION";
      payload: { provider: "anthropic" | "openai"; baseUrl?: string; apiKey?: string };
    }
  | { type: "GET_MODELS" }
  | { type: "FETCH_TRANSCRIPT" }
  | { type: "CHECK_TRANSCRIPT"; payload: { videoId: string } };

export type TranscriptResponse = {
  available: boolean;
  lines: TranscriptLine[] | null;
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

export function addAsyncMessageHandler<TMsg extends { type: string }, TRes>(
  type: TMsg["type"],
  handler: (message: TMsg, sender: Browser.runtime.MessageSender) => Promise<TRes>,
): () => void {
  const listener = (
    message: unknown,
    sender: Browser.runtime.MessageSender,
    sendResponse: (r: TRes) => void,
  ): boolean => {
    if ((message as { type?: string }).type !== type) return false;
    handler(message as TMsg, sender).then(sendResponse);
    return true;
  };
  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}
