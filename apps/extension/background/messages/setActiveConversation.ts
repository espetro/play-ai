import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { storage } from "~/background/storage";

type SetActiveConversationMessage = Extract<BackgroundMessage, { type: "SET_ACTIVE_CONVERSATION" }>;

export async function setActiveConversationHandler(
  message: SetActiveConversationMessage,
): Promise<BackgroundResponse> {
  const { conversationId } = message.payload;

  await browser.storage.local.set({
    activeConversationId: conversationId,
  });

  // Broadcast state update to all ports
  const { activePorts } = await import("./index");
  for (const port of activePorts) {
    port.postMessage({ type: "STATE_UPDATE", patch: {} });
  }

  return { type: "STATE" as const, payload: await storage.getAll() };
}
