import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { fetchModels } from "@play-ai/ai";

type TestConnectionMessage = Extract<BackgroundMessage, { type: "TEST_CONNECTION" }>;

export async function testConnectionHandler(
  message: TestConnectionMessage,
): Promise<BackgroundResponse> {
  try {
    const { provider, baseUrl, apiKey } = message.payload;
    const models = await fetchModels({ provider, baseUrl, apiKey });
    return {
      type: "STATE",
      payload: { models },
    } as unknown as BackgroundResponse;
  } catch (error) {
    return {
      type: "ERROR",
      payload: {
        message: error instanceof Error ? error.message : "Failed to test connection",
      },
    };
  }
}
