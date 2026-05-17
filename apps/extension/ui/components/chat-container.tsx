import { lazy, Suspense, useState } from "react";
import type { ChatMessage } from "@play-ai/ai/core/types";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";

const ChatMessageItem = lazy(() => import("./chat-message"));

interface ChatContainerProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
}

function MessageSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded animate-pulse" />
      <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
    </div>
  );
}

export function ChatContainer({ messages, onSendMessage }: ChatContainerProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const content = input.trim();
    if (content) {
      onSendMessage(content);
      setInput("");
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <ScrollArea className="flex-1 space-y-3 p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No messages yet. Start by asking about the video.
          </div>
        ) : (
          <Suspense fallback={<MessageSkeleton />}>
            <div className="space-y-3">
              {messages.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} />
              ))}
            </div>
          </Suspense>
        )}
      </ScrollArea>
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            name="message"
            type="text"
            placeholder="Ask about the video..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit">Send</Button>
        </form>
      </div>
    </div>
  );
}

export default ChatContainer;
