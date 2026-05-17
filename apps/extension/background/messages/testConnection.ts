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
      type: "CONNECTION_TEST",
      payload: { models },
    };
  } catch (error) {
    return {
      type: "CONNECTION_TEST",
      payload: {
        error: error instanceof Error ? error.message : "Failed to test connection",
      },
    };
  }
}
