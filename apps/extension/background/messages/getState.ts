import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { storage } from "~/background/storage";

type GetStateMessage = Extract<BackgroundMessage, { type: "GET_STATE" }>;

export async function getStateHandler(_message: GetStateMessage): Promise<BackgroundResponse> {
  try {
    const state = await storage.getAll();
    return {
      type: "STATE",
      payload: state,
    };
  } catch (error) {
    return {
      type: "ERROR",
      payload: {
        message: error instanceof Error ? error.message : "Failed to get state",
      },
    };
  }
}
