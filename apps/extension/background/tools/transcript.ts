import { tool } from "ai";
import * as v from "valibot";
import { valibotSchema } from "@ai-sdk/valibot";
import type { TranscriptLine } from "@play-ai/ai/core/types";
import { getTranscriptCache, setTranscriptCache } from "~/background/storage";
import type { TranscriptResponse } from "~/lib/messaging";
import { getLogger } from "~/lib/logger";

const logger = getLogger(["background", "transcriptTool"]);

function formatForPrompt(lines: TranscriptLine[]): string {
  return lines
    .map((l) => {
      const s = l.start;
      const mm = Math.floor(s / 60)
        .toString()
        .padStart(2, "0");
      const ss = Math.floor(s % 60)
        .toString()
        .padStart(2, "0");
      return `[${mm}:${ss}] ${l.text}`;
    })
    .join("\n");
}

export function createTranscriptTool(videoId: string) {
  return tool({
    description:
      "Fetches the full transcript/subtitles of the current YouTube video. Call this whenever the user asks about video content, what was said, specific moments, quotes, timestamps, or anything that requires knowing what the video contains.",
    inputSchema: valibotSchema(v.object({})),
    execute: async () => {
      const cached = await getTranscriptCache(videoId);
      if (cached) {
        logger.debug("Returning cached transcript for video {videoId}, lines={count}", {
          videoId,
          count: cached.length,
        });
        return formatForPrompt(cached);
      }

      const tabs = await browser.tabs.query({
        url: `*://*.youtube.com/watch?v=${videoId}*`,
      });
      const tab = tabs[0];
      if (!tab?.id) {
        logger.warn("No tab found for video {videoId}", { videoId });
        throw new Error("YouTube video tab not found. Make sure the video tab is still open.");
      }
      try {
        const response = await browser.tabs.sendMessage<TranscriptResponse>(tab.id!, {
          type: "FETCH_TRANSCRIPT",
        });
        if (!response?.available || !response.lines?.length) {
          logger.warn("No transcript available in response for video {videoId}", { videoId });
          throw new Error("No transcript available for this video. It may not have subtitles enabled.");
        }
        await setTranscriptCache(videoId, response.lines);
        logger.debug("Cached transcript for video {videoId}, lines={count}", {
          videoId,
          count: response.lines.length,
        });
        return formatForPrompt(response.lines);
      } catch (err) {
        logger.error("tabs.sendMessage to content script failed: {error}", { error: err });
        throw new Error("Could not reach the video tab to fetch transcript.");
      }
    },

  });
}
