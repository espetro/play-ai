import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { storage } from "@play-ai/ai/core/store";

type ClearChatMessage = Extract<BackgroundMessage, { type: "CLEAR_CHAT" }>;

export async function clearChatHandler(message: ClearChatMessage): Promise<BackgroundResponse> {
  try {
    const { videoId } = message.payload;
    const state = await storage.getAll();
    const messages = state.messages ?? {};
    delete messages[videoId];
    await storage.setPartial({ messages });
    return {
      type: "STATE",
      payload: await storage.getAll(),
    };
  } catch (error) {
    return {
      type: "ERROR",
      payload: {
        message: error instanceof Error ? error.message : "Failed to clear chat",
      },
    };
  }
}
