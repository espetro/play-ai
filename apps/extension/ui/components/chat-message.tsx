import type { ChatMessage as ChatMessageContent } from "@play-ai/ai/core/types";
import { Message, MessageContent } from "~/components/ai-elements/message";

interface ChatMessageProps {
  message: ChatMessageContent;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <Message from={message.role}>
      <MessageContent>{message.content}</MessageContent>
    </Message>
  );
}

export default ChatMessage;
