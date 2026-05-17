import { VideoInfo, ChatContainer } from "~/ui/components";
import { $videoId, $messages } from "~/lib/storage";
import { useStorageItem } from "~/ui/hooks/useStorageItem";
import { browser } from "wxt/browser";
import type { MessageType } from "~/lib/messaging";
import type { ChatMessage } from "@play-ai/ai/core/types";

export default function Chat() {
  const videoId = useStorageItem($videoId, null);
  const messagesMap = useStorageItem($messages, { _default: [] as ChatMessage[] });
  const conversationKey = videoId ?? "_default";
  const messages = messagesMap[conversationKey] ?? [];

  const handleSendMessage = async (content: string) => {
    const message: MessageType = {
      type: "SEND_MESSAGE",
      payload: { videoId: conversationKey, content },
    };

    await browser.runtime.sendMessage(message);
  };

  return (
    <div className="flex h-full flex-col">
      <VideoInfo videoId={videoId} />
      <div className="flex-1 min-h-0">
        <ChatContainer messages={messages} onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}
