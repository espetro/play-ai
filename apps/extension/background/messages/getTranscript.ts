import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { getTranscriptCache } from "~/background/storage";

type GetTranscriptMessage = Extract<BackgroundMessage, { type: "GET_TRANSCRIPT" }>;

export async function getTranscriptHandler(
  message: GetTranscriptMessage,
): Promise<BackgroundResponse> {
  try {
    const { videoId } = message.payload;

    if (!videoId) {
      return {
        type: "ERROR",
        payload: { message: "Video ID is required" },
      };
    }

    const transcript = await getTranscriptCache(videoId);

    if (!transcript || transcript.length === 0) {
      return {
        type: "TRANSCRIPT_RESULT",
        payload: [],
      };
    }

    return {
      type: "TRANSCRIPT_RESULT",
      payload: transcript,
    };
  } catch (error) {
    return {
      type: "ERROR",
      payload: {
        message: error instanceof Error ? error.message : "Failed to get transcript",
      },
    };
  }
}
