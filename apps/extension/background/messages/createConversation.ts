import type { BackgroundMessage, BackgroundResponse, Conversation } from "@play-ai/ai/core/types";

type CreateConversationMessage = Extract<BackgroundMessage, { type: "CREATE_CONVERSATION" }>;

export async function createConversationHandler(
  message: CreateConversationMessage,
): Promise<BackgroundResponse> {
  const { videoId } = message.payload;

  const conversationId = crypto.randomUUID();
  const now = Date.now();

  const { conversations } = (await browser.storage.local.get(["conversations"])) as {
    conversations?: Record<string, Conversation>;
  };

  const newConversation: Conversation = {
    id: conversationId,
    videoId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  const updated = {
    ...conversations,
    [conversationId]: newConversation,
  };

  await browser.storage.local.set({
    conversations: updated,
    activeConversationId: conversationId,
  });

  return {
    type: "CONVERSATION_CREATED",
    payload: { conversationId },
  };
}
