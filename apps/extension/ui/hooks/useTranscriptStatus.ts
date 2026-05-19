import { useCallback, useEffect, useRef, useState } from "react";
import { sendMessage } from "~/lib/messaging";
import type { BackgroundResponse } from "@play-ai/ai/core/types";

export type TranscriptStatus = "idle" | "checking" | "available" | "unavailable";

/**
 * Sends CHECK_TRANSCRIPT when `videoId` changes to a non-null, non-"_default" value.
 * Does NOT re-trigger on storage-driven re-renders with the same videoId.
 */
export function useTranscriptStatus(videoId: string | null): {
  status: TranscriptStatus;
  isLoading: boolean;
} {
  const [status, setStatus] = useState<TranscriptStatus>("idle");
  const [isLoading, setIsLoading] = useState(false);

  const prevVideoIdRef = useRef<string | null>(null);

  useEffect(
    function checkTranscriptOnVideoIdChange() {
      const effectiveVideoId = videoId ?? "_default";

      if (effectiveVideoId === "_default" || effectiveVideoId === prevVideoIdRef.current) {
        if (effectiveVideoId === "_default") {
          setStatus("idle");
          setIsLoading(false);
        }
        return;
      }

      prevVideoIdRef.current = effectiveVideoId;
      setStatus("checking");
      setIsLoading(true);

      sendMessage<BackgroundResponse>({
        type: "CHECK_TRANSCRIPT",
        payload: { videoId: effectiveVideoId },
      })
        .then((res) => {
          if (res && res.type === "TRANSCRIPT_STATUS") {
            setStatus(res.payload.available ? "available" : "unavailable");
          }
        })
        .catch(() => setStatus("unavailable"))
        .finally(() => setIsLoading(false));
    },
    [videoId],
  );

  return { status, isLoading };
}
