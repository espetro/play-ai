import type { Browser } from "wxt/browser";
import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { getStateHandler } from "./getState";
import { setConfigHandler } from "./setConfig";
import { sendMessageHandler } from "./sendMessage";
import { clearChatHandler } from "./clearChat";
import { testConnectionHandler } from "./testConnection";
import { getTranscriptHandler } from "./getTranscript";

type MessageHandler = (
  message: BackgroundMessage,
  _sender: Browser.runtime.MessageSender,
) => Promise<BackgroundResponse>;

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
  STATE_UPDATE: async () => ({
    type: "ERROR",
    payload: { message: "STATE_UPDATE not handled in background" },
  }),
};

export function createMessageHandler(): MessageHandler {
  return async function handleMessage(
    message: BackgroundMessage,
    _sender: Browser.runtime.MessageSender,
  ): Promise<BackgroundResponse> {
    const handler = handlers[message.type];
    if (!handler) {
      return { type: "ERROR", payload: { message: `Unknown message type: ${message.type}` } };
    }
    return handler(message as never);
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
};
