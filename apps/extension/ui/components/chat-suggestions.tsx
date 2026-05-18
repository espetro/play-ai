import React from "react";
import {
  Suggestions,
  Suggestion,
} from "~/components/ai-elements/suggestion";
import { DEFAULT_SUGGESTIONS } from "~/ui/constants/suggestions";

interface ChatSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
}

function ChatSuggestionsComponent({ onSuggestionClick }: ChatSuggestionsProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <p className="text-sm text-muted-foreground">
        Ask anything. Open a YouTube video to chat about it.
      </p>
      <Suggestions>
        {DEFAULT_SUGGESTIONS.map((s) => (
          <Suggestion key={s} suggestion={s} onClick={onSuggestionClick} />
        ))}
      </Suggestions>
    </div>
  );
}

export { ChatSuggestionsComponent };
export const ChatSuggestions = React.memo(ChatSuggestionsComponent);
export default ChatSuggestions;
