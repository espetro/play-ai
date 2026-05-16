import React, { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getConfig, type AppConfig } from '../../../lib/storage'
import { sendMessage } from '../../../lib/messaging'
import { ProviderSetupForm } from '../../../components/setup/ProviderSetupForm'

export default function Settings() {
  const navigate = useNavigate()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getConfig().then((cfg) => {
      setConfig(cfg)
      setIsLoading(false)
    })
  }, [])

  const handleSave = async (newConfig: AppConfig) => {
    await sendMessage({ type: 'SET_CONFIG', payload: newConfig })
    navigate({ to: '/' })
  }

  const handleCancel = () => {
    navigate({ to: '/' })
  }

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ProviderSetupForm
        initialConfig={config ?? undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
