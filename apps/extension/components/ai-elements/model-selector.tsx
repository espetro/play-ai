import * as React from "react"
import { cn } from "~/lib/utils"

interface ModelSelectorProps {
  models: string[]
  value?: string | null
  onValueChange?: (value: string) => void
}

const ModelSelector = React.forwardRef<HTMLDivElement, ModelSelectorProps>(
  ({ models, value, onValueChange }, ref) => {
    return (
      <div ref={ref} className="space-y-3">
        <label className="text-sm font-medium">Select a model</label>
        <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border border-input p-2">
          {models.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No models available
            </div>
          ) : (
            models.map((model) => (
              <button
                key={model}
                onClick={() => onValueChange?.(model)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  value === model
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                <input
                  type="radio"
                  name="model"
                  value={model}
                  checked={value === model}
                  onChange={() => onValueChange?.(model)}
                  className="pointer-events-none"
                />
                <span className="flex-1 truncate">{model}</span>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }
)

ModelSelector.displayName = "ModelSelector"

export { ModelSelector }
