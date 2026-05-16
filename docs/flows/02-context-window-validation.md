# Flow 2: Context Window Validation

## Summary

Before the user sends a video transcript to the LLM, the extension validates that the transcript's estimated token count will not exceed the selected model's context window limit. This prevents requests from being truncated or rejected due to token overflow, and offers the user alternatives (different model, partial transcript) if a mismatch is detected.

## Entry Point

User navigates to a supported video (YouTube, Invidious, etc.) and opens the extension sidebar.

## User Flow Steps

### Step 1: User opens extension sidebar on a video page

**Actor:** User  
**Action:** 
1. Navigates to a video on YouTube or Invidious (e.g., `youtube.com/watch?v=...`).
2. Clicks the extension icon or sidebar toggle button.
3. Sidebar panel loads.

See: `apps/extension/entrypoints/sidepanel/` and `apps/extension/entrypoints/content/`

**Result:** Sidebar UI appears on the right side of the video page. User sees model selector dropdown and other chat controls.

### Step 2: System extracts video transcript and metadata

**Actor:** System  
**Action:** 
1. Background script (`apps/extension/entrypoints/background.ts`) queries the page for video ID using `apps/extension/lib/youtube.ts` utilities.
2. Fetches video transcript from YouTube API (or Invidious equivalent).
3. Extracts transcript segments with timestamp metadata (e.g., `[0:00:12] Segment text here`).
4. Caches transcript in memory for the current video session.

See: `apps/extension/lib/youtube.ts`

**Result:** System has the full transcript with timestamps in memory.

### Step 3: User selects an AI model from dropdown

**Actor:** User  
**Action:** 
1. Clicks the "Model" dropdown in the sidebar.
2. Sees a list of available models (e.g., "Claude 3.5 Sonnet", "GPT-4 Turbo", "GPT-4o mini").
3. Selects a model.

See: `packages/ui/src/chat/ChatShell.tsx` (model selector), `packages/ai/src/models.ts` (model catalog)

**Result:** Selected model is stored in component state (not yet submitted).

### Step 4: System calculates transcript token count

**Actor:** System  
**Action:** 
1. Uses token counting library (e.g., `js-tiktoken` for OpenAI, `@anthropic-ai/sdk` for Anthropic) to estimate token count of the transcript.
2. Includes system prompt overhead in the calculation.
3. Formula: `transcript_tokens + system_prompt_tokens + safety_margin (10%)`

**Result:** Total estimated token count is computed.

### Step 5: System queries model context window limit

**Actor:** System  
**Action:** 
1. Looks up the selected model's context window in the local model catalog (`packages/ai/src/models.ts`).
2. Alternatively, queries `models.dev` API or cache for the latest context window specs.
3. Example: "Claude 3.5 Sonnet: 200k context window"

See: `packages/ai/src/models.ts`

**Result:** Context window limit is retrieved.

### Step 6: Decision — Transcript fits within context window?

**Success Path:**  
✅ `transcript_tokens ≤ model_context_window`  
→ Proceed to Step 7 (Ready state).

**Failure Path:**  
❌ `transcript_tokens > model_context_window`  
→ Jump to Step 6b (Warning UI).

### Step 6b: System displays context window warning

**Actor:** System  
**Action:** 
1. Shows warning banner in sidebar:
   - "Transcript exceeds model context window (X tokens > Y context)"
   - Offers suggestions:
     a. Select a different model with larger context window
     b. Summarize only a specific time range (e.g., "first 10 minutes")
     c. Use a fallback model automatically
   
See: `packages/ui/src/chat/ChatShell.tsx`

**Result:** User sees the warning and can choose an action.

### Step 7: System indicates model is ready

**Actor:** System  
**Action:** 
1. Displays a green checkmark or "Ready" badge next to the selected model name.
2. Enables the "Summarize" or "Send" button in the sidebar.

**Result:** User sees visual confirmation that the model is suitable for the transcript.

### Step 8: User proceeds with chosen model (or selects alternative)

**Actor:** User  
**Action:** 
1. Either clicks "Summarize" to proceed with the current model (if Step 7 was reached).
2. Or selects a different model from the dropdown and repeats Steps 4–7.

**Result:** User has confirmed a model selection that fits the transcript.

## Decision Tree

```
User opens sidebar on video page
    ↓
System extracts transcript
    ↓
User selects model
    ↓
System calculates token count
    ↓
System fetches model context window
    ↓
Does transcript fit?
    ├─ Yes → Display "Ready" badge → User can proceed ✅
    └─ No → Display warning → User selects different model ↻
```

## Outcome

- User is confident that the selected model can handle the entire transcript
- Prompts will not be truncated mid-request
- Extension prevents wasted API calls due to context overflow
- User has alternative paths if their chosen model cannot fit the transcript

## Related Components

- **Model Catalog:** `packages/ai/src/models.ts`
- **Sidebar UI:** `packages/ui/src/chat/ChatShell.tsx`
- **Background Worker:** `apps/extension/entrypoints/background.ts` (transcript fetching, token counting)
- **YouTube Utilities:** `apps/extension/lib/youtube.ts` (video ID, transcript extraction)
- **Message Routing:** `apps/extension/lib/messaging.ts` (communication between content script and background)
