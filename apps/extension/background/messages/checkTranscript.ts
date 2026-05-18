import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";
import { getLogger } from "~/lib/logger";

type CheckTranscriptMessage = Extract<BackgroundMessage, { type: "CHECK_TRANSCRIPT" }>;

const logger = getLogger(["background", "checkTranscript"]);

export async function checkTranscriptHandler(
  message: CheckTranscriptMessage,
): Promise<BackgroundResponse> {
  const { videoId } = message.payload;
  const tabs = await browser.tabs.query({ url: `*://*.youtube.com/watch?v=${videoId}*` });
  const tab = tabs[0];
  if (!tab?.id) {
    logger.warn("No tab found for video {videoId}", { videoId });
    return { type: "TRANSCRIPT_STATUS", payload: { available: false } };
  }
  try {
    const response = await browser.tabs.sendMessage<{ available: boolean }>(tab.id, {
      type: "CHECK_TRANSCRIPT",
    });
    return { type: "TRANSCRIPT_STATUS", payload: { available: response?.available ?? false } };
  } catch (err) {
    logger.error("tabs.sendMessage to content script failed: {error}", { error: err });
    return { type: "TRANSCRIPT_STATUS", payload: { available: false } };
  }
}
