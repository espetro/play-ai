interface VideoInfoProps {
  videoId: string | null;
  currentTimestamp: number;
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

export function VideoInfo({ videoId, currentTimestamp }: VideoInfoProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground border-b border-border">
      <span className="font-medium text-foreground">
        {videoId ? `Video: ${videoId}` : "No video detected"}
      </span>
      {videoId && <span className="tabular-nums">{formatTimestamp(currentTimestamp)}</span>}
    </div>
  );
}
