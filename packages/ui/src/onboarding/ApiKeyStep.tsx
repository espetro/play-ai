import React, { useState } from 'react'

interface ApiKeyStepProps {
  provider: 'anthropic' | 'openai'
  value: string
  onChange: (value: string) => void
  onValidate: (apiKey: string) => Promise<boolean>
  isValidating?: boolean
  error?: string
}

export function ApiKeyStep({
  provider,
  value,
  onChange,
  onValidate,
  isValidating,
  error,
}: ApiKeyStepProps) {
  const [showKey, setShowKey] = useState(false)
  const [validated, setValidated] = useState(false)

  const handleValidate = async () => {
    const isValid = await onValidate(value)
    setValidated(isValid)
  }

  const placeholders = {
    anthropic: 'sk-ant-...',
    openai: 'sk-...',
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Enter Your API Key</h2>
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          {provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API Key
        </label>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholders[provider]}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <button
        onClick={handleValidate}
        disabled={!value || isValidating || validated}
        className="w-full rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isValidating ? 'Validating...' : validated ? 'Validated ✓' : 'Validate Key'}
      </button>
      <p className="text-xs text-gray-500">
        Your API key is stored locally in your browser. It is never sent to our servers.
      </p>
    </div>
  )
}
