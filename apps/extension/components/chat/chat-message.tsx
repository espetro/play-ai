import { Message, MessageContent, MessageResponse } from "~/components/ai-elements/message";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <Message from={message.role}>
      <MessageContent>
        {isAssistant ? (
          <MessageResponse>{message.content}</MessageResponse>
        ) : (
          <>{message.content}</>
        )}
      </MessageContent>
    </Message>
  );
}
