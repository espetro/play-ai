import type { Browser } from "wxt/browser";
import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { getStateHandler } from "./getState";
import { setConfigHandler } from "./setConfig";
import { sendMessageHandler } from "./sendMessage";
import { clearChatHandler } from "./clearChat";
import { testConnectionHandler } from "./testConnection";
import { getTranscriptHandler } from "./getTranscript";
import { getModelsHandler } from "./getModels";

type HandlerForType<K extends BackgroundMessage["type"]> = (
  message: Extract<BackgroundMessage, { type: K }>,
) => Promise<BackgroundResponse>;

const handlers: {
  [K in BackgroundMessage["type"]]: HandlerForType<K>;
} = {
  GET_STATE: getStateHandler as HandlerForType<"GET_STATE">,
  SET_CONFIG: setConfigHandler as HandlerForType<"SET_CONFIG">,
  SEND_MESSAGE: sendMessageHandler as HandlerForType<"SEND_MESSAGE">,
  CLEAR_CHAT: clearChatHandler as HandlerForType<"CLEAR_CHAT">,
  TEST_CONNECTION: testConnectionHandler as HandlerForType<"TEST_CONNECTION">,
  GET_TRANSCRIPT: getTranscriptHandler as HandlerForType<"GET_TRANSCRIPT">,
  GET_MODELS: getModelsHandler as HandlerForType<"GET_MODELS">,
  STATE_UPDATE: async () => ({
    type: "ERROR",
    payload: { message: "STATE_UPDATE not handled in background" },
  }),
};

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
    port.onDisconnect.addListener(() => {
      activePorts.delete(port);
    });
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

export {
  getStateHandler,
  setConfigHandler,
  sendMessageHandler,
  clearChatHandler,
  testConnectionHandler,
  getTranscriptHandler,
  getModelsHandler,
};
