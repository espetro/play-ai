import React from 'react'

interface ModelStepProps {
  provider: 'anthropic' | 'openai'
  models: string[]
  selected: string | null
  onSelect: (model: string) => void
  modelDisplayNames?: Record<string, string>
}

export function ModelStep({
  provider,
  models,
  selected,
  onSelect,
  modelDisplayNames,
}: ModelStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Choose a Model</h2>
      <div className="space-y-2">
        {models.map((model) => (
          <button
            key={model}
            onClick={() => onSelect(model)}
            className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
              selected === model
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <p className="font-medium">{modelDisplayNames?.[model] ?? model}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
