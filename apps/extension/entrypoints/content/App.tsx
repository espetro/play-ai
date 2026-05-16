import { useEffect, useState } from "react";
import { ChatShell, type Message } from "../../components/chat";
import { extractVideoId } from "../../lib/youtube";
import { sendMessage } from "../../lib/messaging";
import type { ChatMessage } from "../../lib/storage";

export default function App() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const id = extractVideoId();
    setVideoId(id);

    const handleStateUpdate = (request: any) => {
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

    chrome.runtime.onMessage.addListener(handleStateUpdate);
    return () => {
      chrome.runtime.onMessage.removeListener(handleStateUpdate);
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
