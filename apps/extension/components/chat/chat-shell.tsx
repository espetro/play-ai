import { useEffect, useEffectEvent, useRef } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { ChatMessage, type Message } from "./chat-message";
import { ChatInput } from "./chat-input";

interface ChatShellProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatShell({ messages, onSendMessage, isLoading }: ChatShellProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Legitimate DOM side-effect: auto-scroll to bottom when new messages arrive.
  // Stable dep (messages.length) avoids unnecessary re-renders; useEffectEvent
  // stabilizes the callback so it can safely reference messages without circular deps.
  const scrollToBottom = useEffectEvent(function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  useEffect(
    function triggerScroll() {
      scrollToBottom();
    },
    [messages.length],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No messages yet. Start by asking about the video.
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>
      <div className="border-t border-border p-4">
        <ChatInput onSubmit={onSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
