import { useState } from "react";
import type { ChatMessage } from "@play-ai/ai/core/types";
import { ChatMessage as ChatMessageItem } from "./chat-message";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";

interface ChatContainerProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
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
          messages.map((msg) => <ChatMessageItem key={msg.id} message={msg} />)
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
