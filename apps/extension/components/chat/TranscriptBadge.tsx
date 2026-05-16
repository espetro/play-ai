import { Badge } from '~/components/ui/badge'
import { Loader2 } from 'lucide-react'

type TranscriptStatus = 'loading' | 'available' | 'unavailable'

interface TranscriptBadgeProps {
  status: TranscriptStatus
}

export function TranscriptBadge({ status }: TranscriptBadgeProps) {
  if (status === 'loading') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">Checking transcript…</span>
      </Badge>
    )
  }

  if (status === 'available') {
    return (
      <Badge variant="outline" className="gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs">Transcript ready</span>
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1.5">
      <div className="w-2 h-2 rounded-full bg-amber-500" />
      <span className="text-xs">No transcript</span>
    </Badge>
  )
}
