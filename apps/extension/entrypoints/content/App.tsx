import { useEffect, useState } from "react";
import { ChatShell, type Message } from "~/components/chat";
import { extractVideoId } from "~/lib/youtube";
import { sendMessage } from "~/lib/messaging";
import type { ChatMessage } from "~/lib/storage";
import type { Browser } from "wxt/browser";

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

interface TranscriptResponse {
  available: boolean;
  lines: string[] | null;
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

    const getValidTracks = () => {
      const player = window.ytInitialPlayerResponse;
      // Guard against SPA navigation race: reject stale player response
      if (player?.videoDetails?.videoId && player.videoDetails.videoId !== currentVideoId) {
        return null;
      }
      const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!tracks?.length) return null;
      // Prefer manually-created over auto-generated (asr), then English first
      return [...tracks].sort((a, b) => {
        const aIsAsr = a.kind === "asr" ? 1 : 0;
        const bIsAsr = b.kind === "asr" ? 1 : 0;
        if (aIsAsr !== bIsAsr) return aIsAsr - bIsAsr;
        return a.languageCode === "en" ? -1 : b.languageCode === "en" ? 1 : 0;
      });
    };

    const handleCheckTranscript = (
      message: { type: string },
      _sender: Browser.runtime.MessageSender,
      sendResponse: (r: { available: boolean }) => void,
    ) => {
      if (message.type !== "CHECK_TRANSCRIPT") return false;
      sendResponse({ available: getValidTracks() !== null });
      return false;
    };

    const handleFetchTranscript = (
      message: { type: string },
      _sender: Browser.runtime.MessageSender,
      sendResponse: (r: TranscriptResponse) => void,
    ) => {
      if (message.type !== "FETCH_TRANSCRIPT") return false;

      const tracks = getValidTracks();
      if (!tracks) {
        sendResponse({ available: false, lines: null });
        return false;
      }

      const track = (tracks.find((t: CaptionTrack) => t.languageCode === "en") ?? tracks[0])!;

      fetch(track.baseUrl + "&fmt=json3")
        .then((res) => res.json())
        .then((data) => {
          const lines: string[] = (data.events ?? [])
            .filter((e: { segs?: unknown[] }) => e.segs)
            .map((e: { segs?: Array<{ utf8?: string }> }) =>
              (e.segs ?? [])
                .map((s) => s.utf8 ?? "")
                .join("")
                .trim(),
            )
            .filter(Boolean);
          sendResponse({ available: true, lines });
        })
        .catch(() => sendResponse({ available: false, lines: null }));

      return true;
    };

    browser.runtime.onMessage.addListener(handleCheckTranscript);
    browser.runtime.onMessage.addListener(handleFetchTranscript);
    return () => {
      browser.runtime.onMessage.removeListener(handleCheckTranscript);
      browser.runtime.onMessage.removeListener(handleFetchTranscript);
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
