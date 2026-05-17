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
  | { type: "FETCH_TRANSCRIPT" };

export type TranscriptResponse = {
  available: boolean;
  lines: string[] | null;
};

export async function sendMessage<T = unknown>(message: MessageType): Promise<T> {
  return browser.runtime.sendMessage(message);
}

/** @deprecated use {@link browser.runtime.onMessage} directly */
export const onMessage = browser.runtime.onMessage;
