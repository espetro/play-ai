import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { fetchModels } from "@play-ai/ai";

type TestConnectionMessage = Extract<BackgroundMessage, { type: "TEST_CONNECTION" }>;

export async function testConnectionHandler(
  message: TestConnectionMessage,
): Promise<{ models: string[] } | { error: string }> {
  try {
    const { provider, baseUrl, apiKey } = message.payload;
    const models = await fetchModels({ provider, baseUrl, apiKey });
    return { models };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to test connection",
    };
  }
}
