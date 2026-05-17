import React from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { ChatMessage, type Message } from "./chat-message";
import { ChatInput } from "./chat-input";

interface ChatShellProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatShell({ messages, onSendMessage, isLoading }: ChatShellProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
