import { VideoInfo, ChatContainer } from "~/ui/components";
import { useExtensionState } from "~/ui/hooks/useSharedState";
import { browser } from "wxt/browser";
import type { MessageType } from "~/lib/messaging";

export default function Chat() {
  const [state] = useExtensionState();

  const videoId = state?.videoId ?? null;
  const currentTimestamp = state?.currentTimestamp ?? 0;
  const messages = videoId ? (state?.messages?.[videoId] ?? []) : [];

  const handleSendMessage = async (content: string) => {
    if (!videoId) return;

    const message: MessageType = {
      type: "SEND_MESSAGE",
      payload: { videoId, content },
    };

    await browser.runtime.sendMessage(message);
  };

  return (
    <div className="flex h-full flex-col">
      <VideoInfo videoId={videoId} currentTimestamp={currentTimestamp} />
      <div className="flex-1 min-h-0">
        <ChatContainer messages={messages} onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}
