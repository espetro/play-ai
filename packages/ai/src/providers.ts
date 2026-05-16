import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { AnthropicProvider } from '@ai-sdk/anthropic'
import type { OpenAIProvider } from '@ai-sdk/openai'

export interface AIConfig {
  provider: 'anthropic' | 'openai'
  apiKey: string
  baseUrl?: string
}

export function buildProvider(config: AIConfig): AnthropicProvider | OpenAIProvider {
  if (config.provider === 'anthropic') {
    return createAnthropic({ apiKey: config.apiKey })
  }

  return createOpenAI({
    apiKey: config.apiKey,
    ...(config.baseUrl && { baseURL: config.baseUrl }),
  })
}

export function getModelForProvider(provider: AIConfig['provider'], modelId: string) {
  return `${provider}/${modelId}` as const
}
