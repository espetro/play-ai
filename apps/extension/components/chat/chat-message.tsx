import { cn } from "~/lib/utils";

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
    <div
      className={cn(
        "group flex w-full max-w-[95%] flex-col gap-2",
        isAssistant ? "is-assistant" : "is-user ml-auto justify-end",
      )}
    >
      <div
        className={cn(
          "flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm rounded-lg px-4 py-3",
          isAssistant ? "bg-muted text-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
