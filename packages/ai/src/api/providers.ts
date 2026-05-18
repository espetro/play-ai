import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { AppConfig } from "../core/types";

export function buildProvider(config: AppConfig) {
  if (config.provider === "anthropic") {
    return createAnthropic({ apiKey: config.apiKey, baseURL: config.baseUrl });
  }
  return createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });
}

export function buildLanguageModel(config: AppConfig) {
  const provider = buildProvider(config);
  if (config.provider === "anthropic") {
    return provider.languageModel(config.model);
  }
  // OpenAI-compatible providers (LMStudio, OpenAI, etc.): use chat completions path
  // @ai-sdk/openai v3's languageModel() defaults to the new Responses API which
  // LMStudio and most compatible servers don't support
  return (provider as ReturnType<typeof createOpenAI>).chat(config.model);
}

interface FetchModelsParams {
  provider: "anthropic" | "openai";
  baseUrl?: string;
  apiKey?: string;
}

export async function fetchModels(params: FetchModelsParams): Promise<string[]> {
  const { provider, baseUrl, apiKey } = params;
  if (provider === "anthropic") {
    const url = baseUrl ?? "https://api.anthropic.com";
    const res = await fetch(`${url}/v1/models`, {
      headers: {
        "x-api-key": apiKey ?? "",
        "anthropic-version": "2023-06-01",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.data as { id: string }[]).map((m) => m.id);
  }

  const url = baseUrl ?? "https://api.openai.com/v1";
  const headers: Record<string, string> = {};
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const res = await fetch(`${url}/models`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.data as { id: string }[]).map((m) => m.id);
}
