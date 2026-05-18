import type { ProviderType } from "@play-ai/ai/core/types";
import * as v from "valibot";

const ProviderSchema = v.object({
  provider: v.union([v.literal("anthropic"), v.literal("openai")]),
  baseUrl: v.pipe(v.string(), v.url("Valid URL required")),
  apiKey: v.string(),
  model: v.pipe(v.string(), v.nonEmpty("Please select a model")),
});

export type ProviderForm = v.InferOutput<typeof ProviderSchema>;

export const isProvider = (_: unknown): _ is ProviderType => _ === "anthropic" || _ === "openai";

export default ProviderSchema;
