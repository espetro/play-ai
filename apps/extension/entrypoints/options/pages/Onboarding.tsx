import React, { useState } from 'react'
import { sendMessage } from '../../../lib/messaging'
import { ProviderSetupForm } from '../../../components/setup/ProviderSetupForm'

type Step = 'setup' | 'done'

export default function Onboarding() {
  const [step, setStep] = useState<Step>('setup')

  const handleSave = async (config: any) => {
    await sendMessage({ type: 'SET_CONFIG', payload: config })
    setStep('done')
    setTimeout(() => {
      window.close()
    }, 2000)
  }

  const handleCancel = () => {
    window.close()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      {step === 'setup' && (
        <ProviderSetupForm onSave={handleSave} onCancel={handleCancel} />
      )}

      {step === 'done' && (
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="text-4xl">✓</div>
          <h2 className="text-xl font-bold">All Set!</h2>
          <p className="text-sm text-gray-600">
            Your configuration has been saved. You can now start chatting about YouTube videos.
          </p>
        </div>
      )}
    </div>
  )
}
