import React, { useState } from 'react'
import { ProviderStep, ApiKeyStep, ModelStep } from '@play-ai/ui/onboarding'
import { ANTHROPIC_MODELS, OPENAI_MODELS, MODEL_DISPLAY_NAMES } from '@play-ai/ai'
import { setConfig, type AppConfig } from '../../../lib/storage'
import { sendMessage } from '../../../lib/messaging'

type Step = 'provider' | 'apikey' | 'model' | 'done'

export default function Onboarding() {
  const [step, setStep] = useState<Step>('provider')
  const [provider, setProvider] = useState<'anthropic' | 'openai' | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string>()

  const handleProviderSelect = (p: 'anthropic' | 'openai') => {
    setProvider(p)
    setStep('apikey')
  }

  const handleApiKeyValidate = async (key: string): Promise<boolean> => {
    setIsValidating(true)
    setError(undefined)
    try {
      // For now, assume validation passes
      // In a real implementation, you'd call the AI provider to verify
      setApiKey(key)
      setStep('model')
      return true
    } catch (err) {
      setError('Invalid API key')
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const handleModelSelect = async (m: string) => {
    setModel(m)

    if (provider && apiKey) {
      const config: AppConfig = {
        provider,
        apiKey,
        model: m,
        ...(baseUrl && { baseUrl }),
      }

      try {
        await setConfig(config)
        await sendMessage({
          type: 'SET_CONFIG',
          payload: config,
        })
        setStep('done')

        setTimeout(() => {
          window.close()
        }, 2000)
      } catch (err) {
        setError('Failed to save configuration')
      }
    }
  }

  const models = provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex gap-2">
        <div
          className={`h-1 flex-1 rounded ${
            ['provider', 'apikey', 'model', 'done'].indexOf(step) >= 0
              ? 'bg-blue-500'
              : 'bg-gray-300'
          }`}
        />
        <div
          className={`h-1 flex-1 rounded ${
            ['apikey', 'model', 'done'].indexOf(step) >= 0
              ? 'bg-blue-500'
              : 'bg-gray-300'
          }`}
        />
        <div
          className={`h-1 flex-1 rounded ${
            ['model', 'done'].indexOf(step) >= 0
              ? 'bg-blue-500'
              : 'bg-gray-300'
          }`}
        />
      </div>

      {step === 'provider' && (
        <ProviderStep
          selected={provider}
          onSelect={handleProviderSelect}
          onOpenAICustomBaseUrl={setBaseUrl}
        />
      )}

      {step === 'apikey' && provider && (
        <ApiKeyStep
          provider={provider}
          value={apiKey}
          onChange={setApiKey}
          onValidate={handleApiKeyValidate}
          isValidating={isValidating}
          error={error}
        />
      )}

      {step === 'model' && provider && (
        <ModelStep
          provider={provider}
          models={models as unknown as string[]}
          selected={model}
          onSelect={handleModelSelect}
          modelDisplayNames={MODEL_DISPLAY_NAMES}
        />
      )}

      {step === 'done' && (
        <div className="text-center space-y-4">
          <div className="text-4xl">✓</div>
          <h2 className="text-xl font-bold">All Set!</h2>
          <p className="text-sm text-gray-600">
            Your configuration has been saved. You can now start chatting about
            YouTube videos.
          </p>
          <button
            onClick={() => window.close()}
            className="w-full rounded bg-blue-500 px-4 py-2 text-white font-medium hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
