import { cn } from "~/lib/utils";

type TranscriptStatus = "idle" | "checking" | "available" | "unavailable";

interface VideoInfoProps {
  videoId: string | null;
  currentTimestamp?: number;
  transcriptStatus?: TranscriptStatus;
}

function formatTimestamp(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function TranscriptBadge({ status }: { status: TranscriptStatus }) {
  if (status === "idle") return null;

  return (
    <span className="flex items-center gap-1 ml-auto">
      <span
        className={cn("size-1.5 rounded-full shrink-0", {
          "bg-muted-foreground animate-pulse": status === "checking",
          "bg-green-500": status === "available",
          "bg-amber-500": status === "unavailable",
        })}
      />
      <span className="text-[10px] text-muted-foreground">
        {status === "checking" && "Checking transcript…"}
        {status === "available" && "Transcript ready"}
        {status === "unavailable" && "No transcript"}
      </span>
    </span>
  );
}

export function VideoInfo({ videoId, currentTimestamp = 0, transcriptStatus = "idle" }: VideoInfoProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground border-b border-border">
      <span className="font-medium text-foreground">
        {videoId ? `Video: ${videoId}` : "No video detected"}
      </span>
      {videoId && <span className="tabular-nums">{formatTimestamp(currentTimestamp)}</span>}
      <TranscriptBadge status={transcriptStatus} />
    </div>
  );
}

export default VideoInfo;
