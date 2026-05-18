import { useEffect, useState } from "react";
import { ChatShell, type Message } from "~/components/chat";
import { extractVideoId } from "~/lib/youtube";
import { addAsyncMessageHandler, sendMessage } from "~/lib/messaging";
import type { ChatMessage } from "~/lib/storage";
import type { Browser } from "wxt/browser";
import type { TranscriptLine, TranscriptResponse } from "~/lib/messaging";

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

interface CaptionTrack {
  languageCode: string;
  baseUrl: string;
  kind?: string;
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
    const currentVideoId = extractVideoId();

    const getValidTracks = async (): Promise<CaptionTrack[] | null> => {
      const player = window.ytInitialPlayerResponse;
      // Guard against SPA navigation race: reject stale player response
      if (player?.videoDetails?.videoId && player.videoDetails.videoId !== currentVideoId) {
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
        if (!tracks?.length) return null;
      }
      // Prefer manually-created over auto-generated (asr), then English first
      return [...tracks].sort((a, b) => {
        const aIsAsr = a.kind === "asr" ? 1 : 0;
        const bIsAsr = b.kind === "asr" ? 1 : 0;
        if (aIsAsr !== bIsAsr) return aIsAsr - bIsAsr;
        return a.languageCode === "en" ? -1 : b.languageCode === "en" ? 1 : 0;
      });
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
      const tracks = await getValidTracks();
      if (!tracks) return { available: false, lines: null };

      const track = (tracks.find((t: CaptionTrack) => t.languageCode === "en") ?? tracks[0])!;
      try {
        const res = await fetch(track.baseUrl + "&fmt=json3");
        const data = await res.json();
        const lines: TranscriptLine[] = (data.events ?? [])
          .filter((e: { segs?: unknown[]; tStartMs?: number; dDurationMs?: number }) => e.segs)
          .map(
            (e: {
              segs?: Array<{ utf8?: string; tOffsetMs?: number }>;
              tStartMs?: number;
              dDurationMs?: number;
            }) => {
              const text = (e.segs ?? [])
                .map((s) => s.utf8 ?? "")
                .join("")
                .trim();
              const start = (e.tStartMs ?? 0) / 1000;
              const end = start + (e.dDurationMs ?? 0) / 1000;
              return { start, end, text };
            },
          )
          .filter((r) => r.text.length > 0);
        return { available: true, lines };
      } catch {
        return { available: false, lines: null };
      }
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
