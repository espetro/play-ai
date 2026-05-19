import type { Browser } from "wxt/browser";
import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { getStateHandler } from "./getState";
import { sendMessageHandler } from "./sendMessage";
import { getTranscriptHandler } from "./getTranscript";
import { checkTranscriptHandler } from "./checkTranscript";

type HandlerForType<K extends BackgroundMessage["type"]> = (
  message: Extract<BackgroundMessage, { type: K }>,
) => Promise<BackgroundResponse>;

// Use explicit cast — handlers only covers a subset of BackgroundMessage["type"]
// since migrated CRUD types are now served via tRPC, not raw message handlers.
const handlers = {
  GET_STATE: getStateHandler,
  SEND_MESSAGE: sendMessageHandler,
  GET_TRANSCRIPT: getTranscriptHandler,
  CHECK_TRANSCRIPT: checkTranscriptHandler,
  STATE_UPDATE: async () => ({
    type: "ERROR",
    payload: { message: "STATE_UPDATE not handled in background" },
  }),
} as Partial<Record<BackgroundMessage["type"], (message: BackgroundMessage) => Promise<BackgroundResponse>>>;

// Use the explicit sendResponse + return true pattern.
// This works in all Chrome versions and is immune to service worker termination
// issues that affect the Promise-return approach (Chrome 99+).
export function createMessageHandler() {
  return function handleMessage(
    message: BackgroundMessage,
    _sender: Browser.runtime.MessageSender,
    sendResponse: (response: BackgroundResponse) => void,
  ): true {
    const handler = handlers[message.type];
    const responsePromise: Promise<BackgroundResponse> = handler
      ? handler(message as never)
      : Promise.resolve({
          type: "ERROR" as const,
          payload: { message: `Unknown message type: ${message.type}` },
        });

    responsePromise.then(sendResponse, (error) => {
      sendResponse({
        type: "ERROR",
        payload: { message: error instanceof Error ? error.message : "Handler failed" },
      });
    });

    return true;
  };
}

export const activePorts = new Set<Browser.runtime.Port>();

export function registerPort(port: Browser.runtime.Port) {
  if (port.name === "sidepanel") {
    activePorts.add(port);
    try {
      port.onDisconnect.addListener(() => {
        activePorts.delete(port);
      });
    } catch {
      // Port disconnected before listener could be registered (extension context invalidated)
      activePorts.delete(port);
    }
  }
}

export function setupPortHandlers(port: Browser.runtime.Port) {
  registerPort(port);

  port.onMessage.addListener(async (message: BackgroundMessage) => {
    if (message.type === "GET_STATE") {
      const response = await getStateHandler(message);
      port.postMessage(response);
    }
  });
}

export { getStateHandler, sendMessageHandler, getTranscriptHandler, checkTranscriptHandler };
