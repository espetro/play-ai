import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { ANTHROPIC_MODELS, OPENAI_MODELS, MODEL_DISPLAY_NAMES } from '@play-ai/ai'
import type { AppConfig } from '~/lib/storage'

interface ModelPickerButtonProps {
  config: AppConfig | null
  onModelChange: (model: string) => void
}

export function ModelPickerButton({
  config,
  onModelChange,
}: ModelPickerButtonProps) {
  const [open, setOpen] = useState(false)

  if (!config) {
    return (
      <Button variant="ghost" size="sm" disabled className="text-xs">
        No provider
      </Button>
    )
  }

  const models =
    config.provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS
  const displayName = MODEL_DISPLAY_NAMES[config.model] || config.model

  const handleSelect = (model: string) => {
    onModelChange(model)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs gap-1 h-8">
          {displayName}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="flex flex-col gap-1">
          {models.map((model) => (
            <button
              key={model}
              onClick={() => handleSelect(model)}
              className={`px-3 py-2 text-xs text-left rounded hover:bg-accent ${
                config.model === model ? 'bg-accent' : ''
              }`}
            >
              {MODEL_DISPLAY_NAMES[model]}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
