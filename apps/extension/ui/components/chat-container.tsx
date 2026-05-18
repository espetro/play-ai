import { lazy, Suspense, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import type { ChatMessage } from "@play-ai/ai/core/types";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorLogo,
} from "~/components/ai-elements/model-selector";

const ChatMessageItem = lazy(() => import("./chat-message"));

interface ChatContainerProps {
  messages: ChatMessage[];
  streamingContent?: string | null;
  isStreaming?: boolean;
  onSendMessage: (content: string) => void;
  currentModel?: string;
  onModelChange?: (model: string) => void;
  onFetchModels?: () => Promise<string[]>;
}

function MessageSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded animate-pulse" />
      <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
    </div>
  );
}

export function ChatContainer({
  messages,
  streamingContent,
  isStreaming,
  onSendMessage,
  currentModel,
  onModelChange,
  onFetchModels,
}: ChatContainerProps) {
  const [input, setInput] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [selectorOpen, { open: openSelector, close: closeSelector }] = useDisclosure(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isStreaming) return;
    const content = input.trim();
    if (content) {
      onSendMessage(content);
      setInput("");
    }
  };

  const handleOpenSelector = async () => {
    if (onFetchModels) {
      const fetched = await onFetchModels();
      setModels(fetched);
    }
    openSelector();
  };

  const handleSelectModel = (model: string) => {
    onModelChange?.(model);
    closeSelector();
  };

  const providerLogo = currentModel?.includes("claude")
    ? "anthropic"
    : currentModel?.includes("gpt") || currentModel?.includes("o1") || currentModel?.includes("o3")
      ? "openai"
      : "lmstudio";

  return (
    <div className="flex h-full flex-col gap-4">
      <ScrollArea className="flex-1 space-y-3 p-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Ask anything. Open a YouTube video to chat about it.
          </div>
        ) : (
          <Suspense fallback={<MessageSkeleton />}>
            <div className="space-y-3">
              {messages.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} />
              ))}
              {streamingContent && (
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-sm text-foreground">
                    {streamingContent}
                    <span className="inline-block ml-1 w-2 h-4 bg-foreground animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          </Suspense>
        )}
      </ScrollArea>

      <div className="border-t border-border p-4 space-y-2">
        {currentModel && onModelChange && (
          <ModelSelector open={selectorOpen} onOpenChange={(v) => (v ? handleOpenSelector() : closeSelector())}>
            <ModelSelectorTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors max-w-full"
                title={currentModel}
              >
                <ModelSelectorLogo provider={providerLogo} />
                <span className="truncate max-w-[180px]">{currentModel}</span>
              </button>
            </ModelSelectorTrigger>
            <ModelSelectorContent>
              <ModelSelectorInput placeholder="Search models..." />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                <ModelSelectorGroup heading="Available models">
                  {models.map((m) => (
                    <ModelSelectorItem
                      key={m}
                      onSelect={() => handleSelectModel(m)}
                      className="cursor-pointer"
                    >
                      {m}
                    </ModelSelectorItem>
                  ))}
                </ModelSelectorGroup>
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            name="message"
            type="text"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
          />
          <Button type="submit" disabled={isStreaming}>
            {isStreaming ? "..." : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ChatContainer;
