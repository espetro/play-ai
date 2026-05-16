import React, { useEffect, useState } from 'react'
import { ProviderStep, ApiKeyStep, ModelStep } from '@play-ai/ui/onboarding'
import { ANTHROPIC_MODELS, OPENAI_MODELS, MODEL_DISPLAY_NAMES } from '@play-ai/ai'
import { getConfig, setConfig, type AppConfig } from '../../../lib/storage'
import { sendMessage } from '../../../lib/messaging'

export default function Settings() {
  const [step, setStep] = useState<'provider' | 'apikey' | 'model'>('provider')
  const [config, setLocalConfig] = useState<Partial<AppConfig>>({})
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    getConfig().then((cfg) => {
      if (cfg) {
        setLocalConfig(cfg)
        setStep('provider')
      }
    })
  }, [])

  const handleProviderSelect = (provider: 'anthropic' | 'openai') => {
    setLocalConfig((prev) => ({ ...prev, provider }))
    setStep('apikey')
  }

  const handleApiKeyValidate = async (apiKey: string): Promise<boolean> => {
    setIsValidating(true)
    try {
      // Send test request to background
      const result = await sendMessage({
        type: 'SEND_MESSAGE',
        payload: {
          videoId: 'test',
          content: 'test',
        },
      })
      setLocalConfig((prev) => ({ ...prev, apiKey }))
      setStep('model')
      return true
    } catch (err) {
      setError('Invalid API key')
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const handleModelSelect = async (model: string) => {
    const newConfig: AppConfig = {
      provider: config.provider!,
      apiKey: config.apiKey!,
      model,
      ...(config.baseUrl && { baseUrl: config.baseUrl }),
    }
    await setConfig(newConfig)
    setLocalConfig(newConfig)
  }

  const handleBaseUrl = (baseUrl: string) => {
    if (baseUrl) {
      setLocalConfig((prev) => ({ ...prev, baseUrl }))
    }
  }

  const models =
    config.provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS

  return (
    <div className="p-6 space-y-6">
      {step === 'provider' && (
        <ProviderStep
          selected={config.provider || null}
          onSelect={handleProviderSelect}
          onOpenAICustomBaseUrl={handleBaseUrl}
        />
      )}

      {step === 'apikey' && config.provider && (
        <ApiKeyStep
          provider={config.provider}
          value={config.apiKey || ''}
          onChange={(value) =>
            setLocalConfig((prev) => ({ ...prev, apiKey: value }))
          }
          onValidate={handleApiKeyValidate}
          isValidating={isValidating}
          error={error}
        />
      )}

      {step === 'model' && config.provider && (
        <ModelStep
          provider={config.provider}
          models={models as unknown as string[]}
          selected={config.model || null}
          onSelect={handleModelSelect}
          modelDisplayNames={MODEL_DISPLAY_NAMES}
        />
      )}
    </div>
  )
}
