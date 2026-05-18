import React from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Suggestion,
} from "~/components/ai-elements/suggestion";
import { DEFAULT_SUGGESTIONS } from "~/ui/constants/suggestions";

interface ChatSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
}

function ChatSuggestionsComponent({ onSuggestionClick }: ChatSuggestionsProps) {
  return (
    <ScrollArea orientation="horizontal" className="w-full">
      <div className="flex gap-2 pb-2">
        {DEFAULT_SUGGESTIONS.map((s) => (
          <Suggestion key={s} suggestion={s} onClick={onSuggestionClick} />
        ))}
      </div>
    </ScrollArea>
  );
}

export { ChatSuggestionsComponent };
export const ChatSuggestions = React.memo(ChatSuggestionsComponent);
export default ChatSuggestions;
