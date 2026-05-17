import type { ChatMessage } from "@play-ai/ai/core/types";
import { Message, MessageContent } from "~/components/ai-elements/message";

interface ChatMessageProps {
  message: ChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <Message from={message.role}>
      <MessageContent>{message.content}</MessageContent>
    </Message>
  );
}
