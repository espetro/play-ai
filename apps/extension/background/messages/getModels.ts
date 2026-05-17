import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { fetchModels } from "@play-ai/ai";
import { storage } from "~/background/storage";

type GetModelsMessage = Extract<BackgroundMessage, { type: "GET_MODELS" }>;

export async function getModelsHandler(_message: GetModelsMessage): Promise<BackgroundResponse> {
  try {
    const state = await storage.getAll();
    if (!state.config) {
      return { type: "MODELS_LIST", payload: [] };
    }
    const { provider, baseUrl, apiKey } = state.config;
    const models = await fetchModels({ provider, baseUrl, apiKey });
    return { type: "MODELS_LIST", payload: models };
  } catch {
    return { type: "MODELS_LIST", payload: [] };
  }
}
