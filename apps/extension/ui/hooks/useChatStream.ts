import { useSyncExternalStore, useEffect } from "react";
import { trpcClient } from "~/lib/trpc";
import { chatStore } from "~/lib/stores/chatStore";
import type { Message } from "~/lib/schemas";

export function useChatStream(messages: Message[]) {
  // Start/restart subscription when a new message is added
  useEffect(
    function subscribeToChatStream() {
      if (messages.length === 0) return;

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== "user") return; // Only stream on user messages

      chatStore.update({ status: "streaming", text: "" });

      const sub = trpcClient.chat.stream.subscribe(
        { messages },
        {
          onData: (data) => {
            if (data.type === "chunk") {
              chatStore.update({ text: chatStore.getSnapshot().text + data.text });
            }
            if (data.type === "done") {
              chatStore.update({ status: "done" });
            }
          },
          onError: () => chatStore.update({ status: "error" }),
        },
      );

      return function unsubscribeFromChatStream() {
        sub.unsubscribe();
      };
    },
    [messages.length],
  );

  return useSyncExternalStore(chatStore.subscribe, chatStore.getSnapshot, chatStore.getSnapshot);
}
