import { nanoid } from "nanoid";
import type { BackgroundMessage, BackgroundResponse, AppConfig } from "@play-ai/ai/core/types";
import { storage } from "~/background/storage";

type SetConfigMessage = Extract<BackgroundMessage, { type: "SET_CONFIG" }>;

export async function setConfigHandler(message: SetConfigMessage): Promise<BackgroundResponse> {
  try {
    const config = message.payload;
    const { configs: existingConfigs, activeConfigId } = (await browser.storage.local.get([
      "configs",
      "activeConfigId",
    ])) as {
      configs?: AppConfig[];
      activeConfigId?: string | null;
    };

    const configs = existingConfigs ?? [];
    const configWithId: AppConfig = {
      ...config,
      id: config.id || nanoid(),
    };

    // Upsert: replace if id exists, otherwise append
    const index = configs.findIndex((c) => c.id === configWithId.id);
    if (index >= 0) {
      configs[index] = configWithId;
    } else {
      configs.push(configWithId);
    }

    // Set as active config
    await browser.storage.local.set({
      configs,
      activeConfigId: configWithId.id,
    });

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
