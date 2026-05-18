import { useNavigate } from "@tanstack/react-router";
import { $conversations, $activeConversationId, $videoId } from "~/lib/storage";
import { useStorageItem } from "~/ui/hooks/useStorageItem";
import { sendMessage } from "~/lib/messaging";
import type { BackgroundResponse } from "@play-ai/ai/core/types";
import { Button } from "~/components/ui/button";
import { Trash2, Plus } from "lucide-react";

export default function Conversations() {
  const navigate = useNavigate();
  const conversations = useStorageItem($conversations, {});
  const activeConversationId = useStorageItem($activeConversationId, null);
  const currentTabVideoId = useStorageItem($videoId, null);

  const sorted = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleOpen = async (conversationId: string) => {
    await sendMessage({
      type: "SET_ACTIVE_CONVERSATION",
      payload: { conversationId },
    });
    navigate({ to: "/" });
  };

  const handleDelete = async (conversationId: string) => {
    if (confirm("Delete this conversation?")) {
      await sendMessage({
        type: "DELETE_CONVERSATION",
        payload: { conversationId },
      });
    }
  };

  const handleNewConversation = async () => {
    if (!currentTabVideoId) return;
    const createRes = await sendMessage<BackgroundResponse>({
      type: "CREATE_CONVERSATION",
      payload: { videoId: currentTabVideoId },
    });
    if (createRes?.type === "CONVERSATION_CREATED") {
      navigate({ to: "/" });
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (sorted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8">
        <p className="text-gray-500 text-center mb-4">
          No conversations yet. Open a YouTube video to start.
        </p>
        {currentTabVideoId && (
          <Button onClick={handleNewConversation} className="gap-2">
            <Plus className="w-4 h-4" />
            New conversation
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold">Conversations</h2>
        {currentTabVideoId && (
          <Button onClick={handleNewConversation} size="sm" variant="outline" className="gap-2">
            <Plus className="w-3 h-3" />
            New
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-3">
          {sorted.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-3 rounded-lg border cursor-pointer transition ${
                conversation.id === activeConversationId
                  ? "bg-blue-50 border-blue-300"
                  : "bg-gray-50 border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0" onClick={() => handleOpen(conversation.id)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded flex-shrink-0">
                      {conversation.videoId}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(conversation.updatedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {conversation.messages.length === 0
                      ? "No messages"
                      : conversation.messages[conversation.messages.length - 1]?.content || "..."}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {conversation.messages.length} messages
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(conversation.id)}
                  className="text-gray-400 hover:text-red-600 flex-shrink-0"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
