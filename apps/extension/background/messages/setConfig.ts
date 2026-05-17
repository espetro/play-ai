import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { storage } from "@play-ai/ai/core/store";

type SetConfigMessage = Extract<BackgroundMessage, { type: "SET_CONFIG" }>;

export async function setConfigHandler(message: SetConfigMessage): Promise<BackgroundResponse> {
  try {
    await storage.set("config", message.payload);
    return {
      type: "STATE",
      payload: await storage.getAll(),
    };
  } catch (error) {
    return {
      type: "ERROR",
      payload: {
        message: error instanceof Error ? error.message : "Failed to set config",
      },
    };
  }
}
