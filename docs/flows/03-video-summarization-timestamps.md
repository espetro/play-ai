# Flow 3: Video Summarization and Timestamp Generation

## Summary

The core interaction where the user requests a summary of a video. The extension sends the video transcript to the configured LLM, receives a summary with embedded timestamps, renders the summary in the sidebar, and converts timestamps into clickable links that seek the video player to the exact moment.

## Entry Point

User has opened the extension sidebar on a video page and completed Flow 2 (context window validation). The sidebar shows a "Summarize Video" button and chat input ready for interaction.

## User Flow Steps

### Step 1: User clicks "Summarize Video" button

**Actor:** User  
**Action:** 
1. Clicks the "Summarize Video" button in the sidebar (or submits a prompt like "Give me a summary").
2. Optionally includes custom instructions (e.g., "Focus on technical details" or "Summary format: bullet points").

See: `packages/ui/src/chat/ChatInput.tsx`

**Result:** Request is initiated. Sidebar may show a loading spinner.

### Step 2: System extracts video transcript and metadata

**Actor:** System  
**Action:** 
1. Background script (`apps/extension/entrypoints/background.ts`) retrieves the previously cached transcript (from Flow 2).
2. If not cached, fetches transcript fresh from YouTube API.
3. Extracts full transcript with timestamp segments (e.g., `[0:00:12]`, `[0:05:34]`).
4. Preserves segment structure for later timestamp injection.

See: `apps/extension/lib/youtube.ts`

**Result:** Full transcript with timestamp metadata is ready to send.

### Step 3: System packages request for LLM

**Actor:** System  
**Action:** 
1. Constructs system prompt that instructs LLM to:
   - Summarize the video content concisely
   - **Embed timestamps in the response** using format: `[HH:MM:SS]` or similar
   - If user provided custom instructions, include those
   
2. Wraps the transcript into an API request payload (using `packages/ai/src/providers.ts` factory)
3. Includes metadata:
   - Video URL
   - Video title
   - Selected model identifier
   - User's custom instructions (if any)

See: `apps/extension/entrypoints/background.ts`, `packages/ai/src/providers.ts`

**Result:** Fully formatted API request is ready.

### Step 4: System sends request to LLM endpoint

**Actor:** System  
**Action:** 
1. Sends HTTP request to the configured LLM API (OpenAI, Anthropic, or custom endpoint).
2. Request includes:
   - System prompt (with timestamp embedding instructions)
   - Transcript text
   - Model identifier
   - Stored API key from Flow 1
3. Waits for response (may stream or return full response).

See: `packages/ai/src/providers.ts`

**Result:** LLM processes the request and begins returning response (streaming or batched).

### Step 5: System receives and parses LLM response

**Actor:** System  
**Action:** 
1. Receives summary from LLM (e.g., "This video discusses React patterns. [0:01:30] Introduction to state management. [0:05:12] Deep dive into hooks...")
2. Parses the response to extract embedded timestamps using regex or similar:
   - Pattern: `\[(\d{1,2}):(\d{2}):(\d{2})\]` or `\[(\d+):(\d+)\]`
   - Extracts start time (in seconds) for each timestamp
3. Splits response into segments: timestamp + text pairs
4. Caches the parsed summary.

See: `apps/extension/entrypoints/background.ts` (parsing logic)

**Result:** Summary is segmented into timestamp-indexed chunks.

### Step 6: System renders summary in sidebar with clickable timestamps

**Actor:** System  
**Action:** 
1. Sends parsed summary to sidebar React component (`packages/ui/src/chat/ChatMessage.tsx`).
2. Renders each timestamp as an **HTML button/link**:
   - Text: `[0:01:30]`
   - On click: triggers message to content script with timestamp
   - Styling: color-coded, hover state, accessibility labels
3. Renders summary text as plain paragraphs or formatted markdown.
4. Displays in chat history so user can scroll back.

See: `packages/ui/src/chat/ChatMessage.tsx`, `ChatShell.tsx`

**Result:** User sees the summary in the sidebar with clickable blue timestamp links like `[0:01:30]`.

### Step 7: User clicks a timestamp link

**Actor:** User  
**Action:** 
1. User sees summary: "...React patterns [0:01:30] are fundamental..."
2. Clicks the `[0:01:30]` link to jump to that moment in the video.

**Result:** Click event is triggered on the timestamp element.

### Step 8: System sends seek command to content script

**Actor:** System  
**Action:** 
1. Sidebar (React component) intercepts the click on the timestamp.
2. Extracts the time value (e.g., `90 seconds` for `[0:01:30]`).
3. Sends a message to the content script via `apps/extension/lib/messaging.ts`:
   - `{ type: "SEEK_VIDEO", seekTime: 90 }`

See: `apps/extension/lib/messaging.ts`

**Result:** Content script receives the seek instruction.

### Step 9: System injects JavaScript into video player

**Actor:** System (Content Script)  
**Action:** 
1. Content script (`apps/extension/entrypoints/content/index.ts`) receives the `SEEK_VIDEO` message.
2. Identifies the HTML5 `<video>` element in the page DOM.
3. Sets the video element's `currentTime` property: `video.currentTime = 90`
4. Optionally triggers `.play()` to resume playback.

See: `apps/extension/entrypoints/content/index.ts`

**Result:** Video player seeks to the exact timestamp and continues playing.

### Step 10: User watches video from the linked timestamp

**Actor:** User  
**Action:** 
1. Video jumps to the relevant moment (e.g., 1 minute 30 seconds).
2. User watches the corresponding segment in the context of the AI summary.

**Result:** User seamlessly navigates to the relevant video section.

## Decision Tree

```
User clicks "Summarize" button
    ↓
System extracts transcript + metadata
    ↓
System packages LLM request
    ↓
System sends to LLM API
    ↓
System receives + parses response
    ├─ Timestamps embedded in response? → Extract & segment ✅
    └─ No timestamps? → Display raw summary (degraded mode)
    ↓
System renders summary with clickable timestamps
    ↓
User clicks timestamp link
    ↓
System sends SEEK_VIDEO message to content script
    ↓
Content script sets video.currentTime
    ↓
User watches video from timestamp ✅
```

## Error Handling

- **LLM API failure:** Display error banner, suggest retry
- **Transcript not found:** Show fallback message, offer manual transcript input
- **Timestamp parsing fails:** Display raw summary without clickable links
- **Video element not found:** Graceful fallback (timestamp click does nothing)
- **Streaming interrupted:** Partial summary displayed, user can request again

## Outcome

- User receives a concise AI-generated summary of the video
- Summary includes embedded timestamps aligned with video content
- Clicking a timestamp instantly jumps the video to that moment
- User can seamlessly navigate between reading the summary and watching relevant video segments
- Entire experience is self-contained within the browser extension

## Related Components

- **Background Worker:** `apps/extension/entrypoints/background.ts` (transcript fetch, LLM request, response parsing)
- **Sidebar UI:** `packages/ui/src/chat/ChatShell.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`
- **Content Script:** `apps/extension/entrypoints/content/index.ts` (video player control, DOM injection)
- **Message Routing:** `apps/extension/lib/messaging.ts` (sidepanel ↔ content script communication)
- **YouTube Utilities:** `apps/extension/lib/youtube.ts` (transcript extraction, video ID detection)
- **AI Providers:** `packages/ai/src/providers.ts` (LLM API calls, response streaming)
- **Storage:** `apps/extension/lib/storage.ts` (caching summary, transcript)
