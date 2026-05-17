import type { BackgroundMessage, BackgroundResponse } from "@play-ai/ai/core/types";

type CheckTranscriptMessage = Extract<BackgroundMessage, { type: "CHECK_TRANSCRIPT" }>;

export async function checkTranscriptHandler(
  message: CheckTranscriptMessage,
): Promise<BackgroundResponse> {
  const { videoId } = message.payload;
  const tabs = await browser.tabs.query({ url: `*://*.youtube.com/watch?v=${videoId}*` });
  const tab = tabs[0];
  if (!tab?.id) return { type: "TRANSCRIPT_STATUS", payload: { available: false } };
  try {
    const response = await browser.tabs.sendMessage<{ available: boolean }>(tab.id, {
      type: "CHECK_TRANSCRIPT",
    });
    return { type: "TRANSCRIPT_STATUS", payload: { available: response?.available ?? false } };
  } catch {
    return { type: "TRANSCRIPT_STATUS", payload: { available: false } };
  }
}
