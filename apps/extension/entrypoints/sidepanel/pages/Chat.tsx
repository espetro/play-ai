import { useCallback, useMemo, useState } from "react";
import { ChatContainer } from "~/ui/components";
import { VideoInfo } from "~/ui/components";
import {
  $videoId,
  $conversations,
  $configs,
  $activeConfigId,
  $activeConversationId,
  $streamingMessages,
} from "~/lib/storage";
import { useStorageItem } from "~/ui/hooks/useStorageItem";
import { useTranscriptStatus } from "~/ui/hooks/useTranscriptStatus";
import { sendMessage } from "~/lib/messaging";
import { trpcClient } from "~/lib/trpc";
import type { ChatMessage, BackgroundResponse } from "@play-ai/ai/core/types";

export default function Chat() {
  const currentTabVideoId = useStorageItem($videoId, null);
  const conversations = useStorageItem($conversations, {});
  const activeConversationId = useStorageItem($activeConversationId, null);
  const streamingMessages = useStorageItem($streamingMessages, {});
  const configs = useStorageItem($configs, []);
  const activeConfigId = useStorageItem($activeConfigId, null);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

  const config = useMemo(
    () => configs.find((c) => c.id === activeConfigId) ?? null,
    [configs, activeConfigId],
  );

  const handleAddOptimisticMessage = useCallback((message: ChatMessage) => {
    setOptimisticMessages((prev) => [...prev, message]);
  }, []);

  const handleRemoveOptimisticMessage = useCallback((id: string) => {
    setOptimisticMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const activeConversation = activeConversationId ? conversations[activeConversationId] : null;
  const messages = activeConversation?.messages ?? [];
  const streamingContent = activeConversationId ? streamingMessages[activeConversationId] : null;
  const conversationVideoId = activeConversation?.videoId;
  const isCurrentTab = conversationVideoId === currentTabVideoId;

  const { status: transcriptStatus } = useTranscriptStatus(currentTabVideoId ?? conversationVideoId ?? null);

  const handleSendMessage = async (content: string, optimisticId: string) => {
    try {
      if (!activeConversationId) {
        const videoId = currentTabVideoId ?? "_default";
        const createRes = await sendMessage<BackgroundResponse>({
          type: "CREATE_CONVERSATION",
          payload: { videoId },
        });
        if (createRes?.type === "CONVERSATION_CREATED") {
          await sendMessage({
            type: "SEND_MESSAGE",
            payload: { conversationId: createRes.payload.conversationId, content },
          });
        }
      } else {
        await sendMessage({
          type: "SEND_MESSAGE",
          payload: { conversationId: activeConversationId, content },
        });
      }
    } catch (e) {
      handleRemoveOptimisticMessage(optimisticId);
      throw e;
    }
  };

  const extractVideoId = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      return u.hostname.includes("youtube.com") ? u.searchParams.get("v") : null;
    } catch {
      return null;
    }
  };

  const handleStartNewChat = async () => {
    const tabs = await trpcClient.tabs.list.query();
    const activeTab = tabs.find((t) => t.active);
    const videoId = extractVideoId(activeTab?.url) ?? "_default";
    const createRes = await sendMessage<BackgroundResponse>({
      type: "CREATE_CONVERSATION",
      payload: { videoId },
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
      <div className="flex items-center justify-end px-3 py-1 border-b border-border">
        <button
          type="button"
          onClick={handleStartNewChat}
          disabled={Boolean(streamingContent)}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
          title="New chat"
        >
          New chat
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <ChatContainer
          messages={messages}
          optimisticMessages={optimisticMessages}
          streamingContent={streamingContent}
          isStreaming={Boolean(streamingContent)}
          onSendMessage={handleSendMessage}
          onAddOptimisticMessage={handleAddOptimisticMessage}
          onRemoveOptimisticMessage={handleRemoveOptimisticMessage}
          currentModel={config?.model}
          onModelChange={handleModelChange}
          onFetchModels={handleFetchModels}
        />
      </div>
    </div>
  );
}
