import * as v from "valibot";

export const setConfigInput = v.object({
  provider: v.union([v.literal("anthropic"), v.literal("openai")]),
  apiKey: v.string(),
  baseUrl: v.optional(v.string()),
  model: v.string(),
  id: v.optional(v.string()),
});

export const createConversationInput = v.object({
  videoId: v.string(),
});

export const deleteConversationInput = v.object({
  conversationId: v.string(),
});

export const setActiveConversationInput = v.object({
  conversationId: v.union([v.string(), v.null()]),
});

export const clearChatInput = v.object({
  videoId: v.string(),
});

export const testConnectionInput = v.object({
  provider: v.union([v.literal("anthropic"), v.literal("openai")]),
  baseUrl: v.optional(v.string()),
  apiKey: v.string(),
});

export const getModelsInput = v.object({});
