import { useEffect, useState } from "react";
import { ChatShell, type Message } from "~/components/chat";
import { extractVideoId } from "~/lib/youtube";
import { fetchYouTubeTranscript, fetchCaptionTracksFromHtml, type CaptionTrack } from "~/lib/youtube-transcript";
import { addAsyncMessageHandler, sendMessage } from "~/lib/messaging";
import { $videoId } from "~/lib/storage";
import type { ChatMessage } from "~/lib/storage";
import type { Browser } from "wxt/browser";
import type { TranscriptResponse } from "~/lib/messaging";
import { getLogger } from "~/lib/logger";

const logger = getLogger(["content", "transcript"]);

interface YouTubePlayerResponse {
  videoDetails?: { videoId?: string };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{
        languageCode: string;
        baseUrl: string;
        kind?: string;
      }>;
    };
  };
}

declare global {
  interface Window {
    ytInitialPlayerResponse?: YouTubePlayerResponse;
  }
}

export default function App() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const id = extractVideoId();
    setVideoId(id);

    const handleStateUpdate = (request: {
      type: string;
      videoId: string;
      message: ChatMessage;
    }) => {
      if (request.type === "MESSAGE_UPDATE" && request.videoId === id) {
        const msg = request.message as ChatMessage;
        setMessages((prev) => {
          const existing = prev.find((m) => m.id === msg.id);
          if (existing) {
            return prev.map((m) => (m.id === msg.id ? { ...msg, timestamp: msg.timestamp } : m));
          }
          return [...prev, msg];
        });
      }
    };

    browser.runtime.onMessage.addListener(handleStateUpdate);
    return () => {
      browser.runtime.onMessage.removeListener(handleStateUpdate);
    };
  }, []);

  useEffect(() => {
    $videoId.setValue(extractVideoId());
    const handleNavigation = () => $videoId.setValue(extractVideoId());
    window.addEventListener("yt-navigate-finish", handleNavigation);
    return () => window.removeEventListener("yt-navigate-finish", handleNavigation);
  }, []);

  useEffect(() => {
    const getValidTracks = async (): Promise<CaptionTrack[] | null> => {
      const currentVideoId = extractVideoId();
      const player = window.ytInitialPlayerResponse;
      // Guard against SPA navigation race: reject stale player response
      if (player?.videoDetails?.videoId && player.videoDetails.videoId !== currentVideoId) {
        logger.warn(
          "SPA race detected: stale player response (playerVideoId={playerVideoId}, currentVideoId={currentVideoId})",
          { playerVideoId: player.videoDetails.videoId, currentVideoId },
        );
        return null;
      }
      let tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!tracks?.length) {
        // SPA fallback: poll for ytInitialPlayerResponse to be populated
        let elapsed = 0;
        while (elapsed < 3000) {
          await new Promise<void>((r) => setTimeout(r, 200));
          elapsed += 200;
          const fresh = window.ytInitialPlayerResponse;
          if (fresh?.videoDetails?.videoId === currentVideoId) {
            tracks = fresh?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? null;
            if (tracks?.length) break;
          }
        }
        if (!tracks?.length) {
          logger.debug("Poll timeout, falling back to HTML fetch for video {videoId}", {
            videoId: currentVideoId,
          });
          const htmlTracks = await fetchCaptionTracksFromHtml(window.location.href);
          if (htmlTracks?.length) {
            logger.debug("Found {count} tracks via HTML fallback", { count: htmlTracks.length });
            return htmlTracks;
          }
          logger.warn(
            "No caption tracks found for video {videoId} after HTML fallback",
            { videoId: currentVideoId },
          );
          return null;
        }
      }
      // Prefer manually-created over auto-generated (asr), then English first
      const sorted = [...tracks].sort((a, b) => {
        const aIsAsr = a.kind === "asr" ? 1 : 0;
        const bIsAsr = b.kind === "asr" ? 1 : 0;
        if (aIsAsr !== bIsAsr) return aIsAsr - bIsAsr;
        return a.languageCode === "en" ? -1 : b.languageCode === "en" ? 1 : 0;
      });
      logger.debug("Found {count} caption tracks for video {videoId}", {
        count: sorted.length,
        videoId: currentVideoId,
      });
      return sorted;
    };

    const removeCheckHandler = addAsyncMessageHandler<
      { type: "CHECK_TRANSCRIPT" },
      { available: boolean }
    >("CHECK_TRANSCRIPT", async () => {
      const tracks = await getValidTracks();
      return { available: tracks !== null };
    });

    const removeFetchHandler = addAsyncMessageHandler<
      { type: "FETCH_TRANSCRIPT" },
      TranscriptResponse
    >("FETCH_TRANSCRIPT", async () => {
      const currentVideoId = extractVideoId();
      if (!currentVideoId) {
        return { available: false, lines: null };
      }

      const tracks = await getValidTracks();
      const lines = await fetchYouTubeTranscript(currentVideoId, tracks ?? undefined);
      return lines?.length ? { available: true, lines } : { available: false, lines: null };
    });

    return () => {
      removeCheckHandler();
      removeFetchHandler();
    };
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!videoId) return;

    setIsLoading(true);
    try {
      await sendMessage({
        type: "SEND_MESSAGE",
        payload: { videoId, content },
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!videoId) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-sm text-gray-600">
        Video not detected. Navigate to a YouTube video to start chatting.
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col">
      <div className="border-b border-gray-200 p-3">
        <h2 className="font-semibold text-sm">Video Chat</h2>
        <p className="text-xs text-gray-500 mt-1">Ask about this video</p>
      </div>
      <ChatShell messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
