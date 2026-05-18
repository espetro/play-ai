import type { ChatMessage as ChatMessageContent } from "@play-ai/ai/core/types";
import { Message, MessageContent, MessageResponse } from "~/components/ai-elements/message";

interface ChatMessageProps {
  message: ChatMessageContent;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <Message from={message.role}>
      {message.role === "user" ? (
        <MessageContent>{message.content}</MessageContent>
      ) : (
        <MessageResponse>{message.content}</MessageResponse>
      )}
    </Message>
  );
}

export default ChatMessage;
