"use memo";

import { useState } from "react";
import React from "react";
import { useDisclosure } from "@mantine/hooks";
import type { ChatMessage as ChatMessageType } from "@play-ai/ai/core/types";
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
import { ChatMessage } from "./chat-message";
import { ChatSuggestions } from "./chat-suggestions";

interface ChatContainerProps {
  messages: ChatMessageType[];
  optimisticMessages?: ChatMessageType[];
  streamingContent?: string | null;
  isStreaming?: boolean;
  onSendMessage: (content: string, optimisticId: string) => Promise<void>;
  onAddOptimisticMessage?: (message: ChatMessageType) => void;
  onRemoveOptimisticMessage?: (id: string) => void;
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

export function ChatContainerComponent({
  messages,
  optimisticMessages = [],
  streamingContent,
  isStreaming,
  onSendMessage,
  onAddOptimisticMessage,
  onRemoveOptimisticMessage,
  currentModel,
  onModelChange,
  onFetchModels,
}: ChatContainerProps) {
  const [input, setInput] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [selectorOpen, { open: openSelector, close: closeSelector }] = useDisclosure(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isStreaming) return;
    const content = input.trim();
    if (content) {
      const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
      const optimisticMessage: ChatMessageType = {
        id: optimisticId,
        role: "user",
        content,
        timestamp: Date.now(),
      };
      onAddOptimisticMessage?.(optimisticMessage);
      setInput("");
      try {
        await onSendMessage(content, optimisticId);
      } catch {
        onRemoveOptimisticMessage?.(optimisticId);
      }
    }
  };

  const handleSuggestionClick = async (content: string) => {
    if (isStreaming) return;
    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
    const optimisticMessage: ChatMessageType = {
      id: optimisticId,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    onAddOptimisticMessage?.(optimisticMessage);
    try {
      await onSendMessage(content, optimisticId);
    } catch {
      onRemoveOptimisticMessage?.(optimisticId);
    }
  };

  // Deduplicate: filter out optimistic messages when real ones arrive
  const filteredOptimistics = optimisticMessages.filter(
    (om) => !messages.some((m) => m.content === om.content && m.role === om.role)
  );
  const allMessages = [...filteredOptimistics, ...messages];

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
        {allMessages.length === 0 && !streamingContent ? (
          <ChatSuggestions onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className="space-y-3">
              {allMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
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
        )}
      </ScrollArea>

      <div className="border-t border-border p-4 space-y-2">
        {currentModel && onModelChange && (
          <ModelSelector
            open={selectorOpen}
            onOpenChange={(v) => (v ? handleOpenSelector() : closeSelector())}
          >
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

export const ChatContainer = React.memo(ChatContainerComponent);

export default ChatContainer;
