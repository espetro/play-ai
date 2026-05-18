import type { BackgroundMessage, BackgroundResponse, Conversation } from "@play-ai/ai/core/types";
import { storage } from "~/background/storage";
import { abortStreamForConversation } from "./sendMessage";

type DeleteConversationMessage = Extract<BackgroundMessage, { type: "DELETE_CONVERSATION" }>;

export async function deleteConversationHandler(
  message: DeleteConversationMessage,
): Promise<BackgroundResponse> {
  const { conversationId } = message.payload;

  // Abort any active stream
  abortStreamForConversation(conversationId);

  const { conversations, activeConversationId, streamingMessages } =
    (await browser.storage.local.get([
      "conversations",
      "activeConversationId",
      "streamingMessages",
    ])) as {
      conversations?: Record<string, Conversation>;
      activeConversationId?: string;
      streamingMessages?: Record<string, string>;
    };

  const updated = { ...conversations };
  delete updated[conversationId];

  const updates: Record<string, unknown> = {
    conversations: updated,
  };

  // Clear active conversation if it's the one being deleted
  if (activeConversationId === conversationId) {
    updates.activeConversationId = null;
  }

  // Clear streaming message if it exists
  if (streamingMessages && streamingMessages[conversationId]) {
    const updatedStreaming = { ...streamingMessages };
    delete updatedStreaming[conversationId];
    updates.streamingMessages = updatedStreaming;
  }

  await browser.storage.local.set(updates);

  return { type: "STATE" as const, payload: await storage.getAll() };
}
