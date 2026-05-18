import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { fetchModels } from "@play-ai/ai";
import { storage } from "~/background/storage";

type GetModelsMessage = Extract<BackgroundMessage, { type: "GET_MODELS" }>;

export async function getModelsHandler(_message: GetModelsMessage): Promise<BackgroundResponse> {
  try {
    const { configs, activeConfigId } = (await browser.storage.local.get([
      "configs",
      "activeConfigId",
    ])) as {
      configs?: any[];
      activeConfigId?: string | null;
    };

    const configList = configs ?? [];
    const config = activeConfigId ? configList.find((c) => c.id === activeConfigId) : null;

    if (!config) {
      return { type: "MODELS_LIST", payload: [] };
    }
    const { provider, baseUrl, apiKey } = config;
    const models = await fetchModels({ provider, baseUrl, apiKey });
    return { type: "MODELS_LIST", payload: models };
  } catch (error) {
    return {
      type: "ERROR",
      payload: {
        message: error instanceof Error ? error.message : "Failed to fetch models",
      },
    };
  }
}
