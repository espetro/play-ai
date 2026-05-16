import React from 'react'

interface ProviderStepProps {
  selected: 'anthropic' | 'openai' | null
  onSelect: (provider: 'anthropic' | 'openai') => void
  onOpenAICustomBaseUrl?: (baseUrl: string) => void
}

export function ProviderStep({
  selected,
  onSelect,
  onOpenAICustomBaseUrl,
}: ProviderStepProps) {
  const [baseUrl, setBaseUrl] = React.useState('')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Choose Your AI Provider</h2>
        <div className="space-y-3">
          <button
            onClick={() => onSelect('anthropic')}
            className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
              selected === 'anthropic'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <h3 className="font-semibold">Anthropic</h3>
            <p className="text-sm text-gray-600">
              Claude models powered by Anthropic
            </p>
          </button>

          <button
            onClick={() => onSelect('openai')}
            className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
              selected === 'openai'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <h3 className="font-semibold">OpenAI Compatible</h3>
            <p className="text-sm text-gray-600">
              OpenAI, LM Studio, or other compatible APIs
            </p>
          </button>
        </div>
      </div>

      {selected === 'openai' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Base URL (optional)
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            onBlur={(e) => onOpenAICustomBaseUrl?.(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-500">
            Leave empty to use OpenAI. For local models, specify your API endpoint.
          </p>
        </div>
      )}
    </div>
  )
}
