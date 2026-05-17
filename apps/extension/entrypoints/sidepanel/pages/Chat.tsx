import { useEffect, useState } from "react";
import { ChatContainer } from "~/ui/components";
import { VideoInfo } from "~/ui/components";
import { $videoId, $messages, $config } from "~/lib/storage";
import { useStorageItem } from "~/ui/hooks/useStorageItem";
import { sendMessage } from "~/lib/messaging";
import type { ChatMessage } from "@play-ai/ai/core/types";
import type { BackgroundResponse } from "@play-ai/ai/core/types";

type TranscriptStatus = "idle" | "checking" | "available" | "unavailable";

export default function Chat() {
  const videoId = useStorageItem($videoId, null);
  const messagesMap = useStorageItem($messages, { _default: [] as ChatMessage[] });
  const config = useStorageItem($config, null);
  const conversationKey = videoId ?? "_default";
  const messages = messagesMap[conversationKey] ?? [];
  const [transcriptStatus, setTranscriptStatus] = useState<TranscriptStatus>("idle");

  useEffect(() => {
    if (!videoId || videoId === "_default") {
      setTranscriptStatus("idle");
      return;
    }
    setTranscriptStatus("checking");
    sendMessage<BackgroundResponse>({ type: "CHECK_TRANSCRIPT", payload: { videoId } })
      .then((res) => {
        if (res && res.type === "TRANSCRIPT_STATUS") {
          setTranscriptStatus(res.payload.available ? "available" : "unavailable");
        }
      })
      .catch(() => setTranscriptStatus("unavailable"));
  }, [videoId]);

  const handleSendMessage = async (content: string) => {
    await sendMessage({
      type: "SEND_MESSAGE",
      payload: { videoId: conversationKey, content },
    });
  };

  const handleModelChange = async (model: string) => {
    if (!config) return;
    await sendMessage({ type: "SET_CONFIG", payload: { ...config, model } });
  };

  const handleFetchModels = async (): Promise<string[]> => {
    try {
      const response = await sendMessage<BackgroundResponse>({ type: "GET_MODELS" });
      if (response && response.type === "MODELS_LIST") {
        return response.payload;
      }
    } catch {
      // ignore
    }
    return [];
  };

  return (
    <div className="flex h-full flex-col">
      <VideoInfo videoId={videoId} transcriptStatus={transcriptStatus} />
      <div className="flex-1 min-h-0">
        <ChatContainer
          messages={messages}
          onSendMessage={handleSendMessage}
          currentModel={config?.model}
          onModelChange={handleModelChange}
          onFetchModels={handleFetchModels}
        />
      </div>
    </div>
  );
}
