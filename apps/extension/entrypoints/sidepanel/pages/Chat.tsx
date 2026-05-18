import { useEffect, useState } from "react";
import { ChatContainer } from "~/ui/components";
import { VideoInfo } from "~/ui/components";
import { $videoId, $conversations, $config, $activeConversationId, $streamingMessages } from "~/lib/storage";
import { useStorageItem } from "~/ui/hooks/useStorageItem";
import { sendMessage } from "~/lib/messaging";
import type { ChatMessage, BackgroundResponse, Conversation } from "@play-ai/ai/core/types";

type TranscriptStatus = "idle" | "checking" | "available" | "unavailable";

export default function Chat() {
  const currentTabVideoId = useStorageItem($videoId, null);
  const conversations = useStorageItem($conversations, {});
  const activeConversationId = useStorageItem($activeConversationId, null);
  const streamingMessages = useStorageItem($streamingMessages, {});
  const config = useStorageItem($config, null);
  const [transcriptStatus, setTranscriptStatus] = useState<TranscriptStatus>("idle");

  const activeConversation = activeConversationId ? conversations[activeConversationId] : null;
  const messages = activeConversation?.messages ?? [];
  const streamingContent = activeConversationId ? streamingMessages[activeConversationId] : null;
  const conversationVideoId = activeConversation?.videoId;
  const isCurrentTab = conversationVideoId === currentTabVideoId;

  useEffect(() => {
    if (!conversationVideoId || conversationVideoId === "_default") {
      setTranscriptStatus("idle");
      return;
    }
    setTranscriptStatus("checking");
    sendMessage<BackgroundResponse>({ type: "CHECK_TRANSCRIPT", payload: { videoId: conversationVideoId } })
      .then((res) => {
        if (res && res.type === "TRANSCRIPT_STATUS") {
          setTranscriptStatus(res.payload.available ? "available" : "unavailable");
        }
      })
      .catch(() => setTranscriptStatus("unavailable"));
  }, [conversationVideoId]);

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId && currentTabVideoId) {
      // No active conversation — create one first
      const createRes = await sendMessage<BackgroundResponse>({
        type: "CREATE_CONVERSATION",
        payload: { videoId: currentTabVideoId },
      });
      if (createRes?.type === "CONVERSATION_CREATED") {
        const newConversationId = createRes.payload.conversationId;
        await sendMessage({
          type: "SEND_MESSAGE",
          payload: { conversationId: newConversationId, content },
        });
      }
    } else if (activeConversationId) {
      await sendMessage({
        type: "SEND_MESSAGE",
        payload: { conversationId: activeConversationId, content },
      });
    }
  };

  const handleStartNewChat = async () => {
    if (!currentTabVideoId) return;
    const createRes = await sendMessage<BackgroundResponse>({
      type: "CREATE_CONVERSATION",
      payload: { videoId: currentTabVideoId },
    });
    if (createRes?.type === "CONVERSATION_CREATED") {
      // New conversation is auto-activated by createConversationHandler
    }
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
      <VideoInfo videoId={conversationVideoId ?? null} transcriptStatus={transcriptStatus} />
      {!isCurrentTab && activeConversation && (
        <div className="bg-blue-50 border-b border-blue-200 px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-blue-900">
              📺 Current tab: <span className="font-semibold">{currentTabVideoId || "No video"}</span>
            </span>
            <button
              onClick={handleStartNewChat}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
            >
              Start new chat
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ChatContainer
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={Boolean(streamingContent)}
          onSendMessage={handleSendMessage}
          currentModel={config?.model}
          onModelChange={handleModelChange}
          onFetchModels={handleFetchModels}
        />
      </div>
    </div>
  );
}
