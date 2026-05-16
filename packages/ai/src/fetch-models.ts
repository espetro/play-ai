export async function fetchModels(config: {
  provider: 'anthropic' | 'openai'
  baseUrl: string
  apiKey: string
}): Promise<string[]> {
  const { provider, baseUrl, apiKey } = config

  try {
    if (provider === 'anthropic') {
      const response = await fetch(`${baseUrl}/v1/models`, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data.map((m: { id: string }) => m.id)
    } else if (provider === 'openai') {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data.map((m: { id: string }) => m.id)
    } else {
      throw new Error(`Unknown provider: ${provider}`)
    }
  } catch (error) {
    throw new Error(
      `Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
