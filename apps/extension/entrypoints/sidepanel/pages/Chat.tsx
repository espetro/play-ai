import { VideoInfo, ChatContainer } from "~/ui/components";
import { useExtensionState } from "~/ui/hooks/useSharedState";
import { browser } from "wxt/browser";
import type { MessageType } from "~/lib/messaging";

export default function Chat() {
  const [state] = useExtensionState();

  const videoId = state?.videoId ?? null;
  const conversationKey = videoId ?? "_default";
  const messages = state?.messages?.[conversationKey] ?? [];

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
