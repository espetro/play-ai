# Product Requirements Document

## Product Overview

Play AI is a browser extension that enables AI-powered chat about YouTube videos. It works natively within YouTube's interface, allowing users to ask questions about video content, get AI-powered answers, and have conversational interactions about the videos they're watching.

**Core value proposition:** Transform passive video watching into active learning and exploration through AI-powered conversation.

**Technical approach:** Browser extension that injects AI chat functionality directly into YouTube's interface using Shadow DOM, with support for Anthropic Claude and OpenAI models.

### Key Differentiators

- **Native integration** - Works seamlessly within YouTube without requiring users to leave the platform
- **Real-time streaming** - AI responses stream in real-time as they're generated
- **Multi-provider support** - Switch between Anthropic Claude and OpenAI (or custom endpoints)
- **State persistence** - Conversations are saved per video and persist across sessions
- **Cross-browser compatibility** - Works on Chrome, Firefox, and Edge

## Target Users

### Primary Users

**Content Researchers**
- **Needs:** Analyze video content quickly, extract key information, summarize long videos
- **Pain points:** Time-consuming to watch entire videos, hard to find specific information
- **Use case:** Researching tutorials, documentaries, and educational content

**Students**
- **Needs:** Study help, clarification of complex concepts, note-taking assistance
- **Pain points:** Difficulty understanding dense material, missing key concepts
- **Use case:** Learning from educational videos, reviewing course materials, studying for exams

**Professionals**
- **Needs:** Meeting summaries, content extraction, quick information retrieval
- **Pain points:** Limited time, need to absorb meeting content efficiently
- **Use case:** Business meetings, conference recordings, training videos

### Secondary Users

**Content Creators**
- **Needs:** Analyze competitor content, generate ideas, review own content
- **Use case:** Researching trending topics, analyzing audience engagement patterns

**Language Learners**
- **Needs:** Practice conversations, get explanations in target language
- **Use case:** Watching foreign language videos with AI assistance

## Core Features

### 1. AI Chat Interface

**Conversational AI about video content**

**User interactions:**
- Ask questions about video content ("What are the main points discussed in this video?")
- Request specific information ("Timestamp where they discuss machine learning")
- Ask for clarification ("Can you explain that concept in simpler terms?")
- Request summaries ("Summarize the key takeaways from this video")

**Technical implementation:**
- Shadow DOM overlay in YouTube sidebar
- Real-time streaming responses using Vercel AI SDK
- Persistent conversation history per video
- Support for multiple AI providers

**UI components:**
- Chat message display with streaming animation
- Input field with send button
- Conversation history list
- Clear chat functionality

**See:** `apps/extension/components/chat-container.tsx`, `apps/extension/components/chat-message.tsx`

### 2. Video Transcript Support

**Extract and display video transcripts**

**User interactions:**
- View full video transcript
- Search within transcript
- Get AI-powered analysis of transcript content

**Technical implementation:**
- YouTube API integration for transcript fetching
- Transcript parsing and formatting
- Search functionality within transcript
- AI analysis of transcript content

**UI components:**
- Transcript viewer with timestamps
- Search interface for transcript content
- AI-generated insights about transcript

**See:** `docs/flows/03-video-summarization-timestamps.md`, `apps/extension/background/messages/getTranscript.ts`

### 3. Multi-Provider AI Support

**Switch between different AI providers**

**Supported providers:**
- Anthropic Claude (claude-3, claude-3-5-sonnet-20241022)
- OpenAI (gpt-4, gpt-4o, gpt-3.5-turbo)
- Custom OpenAI-compatible endpoints

**User interactions:**
- Select preferred AI provider during setup
- Choose specific model from provider's catalog
- Switch providers without losing conversation history
- Test connection to verify API credentials

**Technical implementation:**
- Vercel AI SDK provider abstraction
- Model catalog management
- Connection testing and validation
- Secure credential storage

**See:** `packages/ai/src/providers.ts`, `packages/ai/src/models.ts`, `docs/flows/01-setup-api-configuration.md`

### 4. State Persistence

**Save conversations and settings across sessions**

**Persistence scope:**
- Conversation history per video
- User configuration (provider, API key, model selection)
- UI preferences and settings

**Technical implementation:**
- Chrome storage local as single source of truth
- Broadcast pattern for state synchronization
- Automatic save on state changes
- Restore state on extension reload

**See:** `apps/extension/lib/storage.ts`, `apps/extension/background/messages/getState.ts`

### 5. Content Script Integration

**Inject AI functionality into YouTube's interface**

**Integration points:**
- YouTube sidebar injection using Shadow DOM
- Automatic detection of video pages
- SPA navigation support for dynamic YouTube
- Fallback support for alternative platforms

**Technical implementation:**
- WXT content script framework
- Shadow DOM for UI isolation
- Video detection and SPA navigation
- Platform adapters for different video sites

**See:** `apps/extension/entrypoints/content/index.ts`, `apps/extension/lib/youtube.ts`

## User Flows

### Setup Flow

**Reference:** `docs/flows/01-setup-api-configuration.md`

**Steps:**
1. User installs extension from browser extension store
2. Extension opens onboarding page on first install
3. User selects AI provider (OpenAI, Anthropic, or custom)
4. User enters API key and optionally custom base URL
5. System validates API connection
6. System stores credentials securely
7. System marks extension as configured

**Entry point:** Extension icon click or direct navigation to options page

**Success metrics:**
- Extension loads without errors
- API connection test passes
- Configuration saved successfully
- User sees confirmation message

### Chat Flow

**Reference:** `docs/flows/02-context-window-validation.md`

**Steps:**
1. User navigates to YouTube video page
2. Extension detects video and injects chat interface
3. User asks question about video content
4. System processes request through background service worker
5. AI provider generates streaming response
6. System displays response in real-time
7. Conversation history is maintained

**Entry point:** YouTube video page with injected chat interface

**Success metrics:**
- Chat interface loads correctly
- Questions are processed without errors
- Responses stream in real-time
- Conversation history persists

### Transcript Flow

**Reference:** `docs/flows/03-video-summarization-timestamps.md`

**Steps:**
1. User requests transcript from video
2. System fetches transcript from YouTube API
3. System parses and formats transcript content
4. User can search within transcript
5. System can provide AI analysis of transcript

**Entry point:** Transcript button in chat interface or side panel

**Success metrics:**
- Transcript fetches successfully
- Transcript displays with timestamps
- Search functionality works
- AI analysis generates meaningful insights

## Success Metrics

### Technical Metrics

**Extension Performance:**
- Extension loads without errors (100% success rate)
- Chat responses stream correctly (no >2s delays)
- Transcripts extract successfully (90%+ success rate for videos with captions)
- Settings persist across sessions (100% reliability)

**Error Handling:**
- API connection failures handled gracefully
- Network timeouts handled appropriately
- Invalid user inputs validated before processing
- Extension recovers from unexpected errors

**User Experience:**
- UI renders within 500ms of page load
- Chat responses update within 200ms of chunk reception
- All interactive elements respond immediately
- Extension works across different video qualities and page layouts

### User Experience Metrics

**Engagement:**
- Users start conversations within 30 seconds of video load
- Average conversation length: 5+ messages
- Return usage rate: 70%+ of active users
- Feature adoption: 90%+ of users utilize chat functionality

**Satisfaction:**
- Users find answers to their questions (85%+ success rate)
- Responses are relevant and helpful (4.0+ average rating)
- Extension saves users time (50%+ time reduction for research)
- Users recommend the extension (70%+ net promoter score)

## Technical Constraints

### Browser Extension Constraints

**Manifest V3 Requirements:**
- Service worker architecture (no background pages)
- Limited storage quotas (Chrome: 10MB, Firefox: 2MB)
- Network request restrictions for some APIs
- Content script isolation from page context

**Cross-Browser Compatibility:**
- Chrome: Full Manifest V3 support, sidePanel API
- Firefox: Limited sidePanel API, uses sidebar_action fallback
- Edge: Chrome-compatible with sidePanel API
- Safari: Not currently supported (future consideration)

**Security Requirements:**
- API keys stored only in browser local storage
- No external communication of credentials
- Content script isolation from page scripts
- Secure messaging between contexts

### API Integration Constraints

**Vercel AI SDK Limitations:**
- Streaming responses require continuous connection
- Rate limiting enforced by provider APIs
- Token counting and quota management
- Model-specific response formats and capabilities

**Provider-Specific Constraints:**
- OpenAI: Rate limits, token costs, model availability
- Anthropic: Context window limitations, rate limits
- Custom endpoints: Must implement OpenAI-compatible API

### Performance Constraints

**Memory Usage:**
- Background service worker should not exceed 100MB RAM
- Content script should not cause page performance degradation
- Large conversation histories should not impact UI responsiveness

**Network Usage:**
- AI requests should be optimized for bandwidth
- Streaming responses should not overload the connection
- Caching should reduce redundant API calls

**UI Performance:**
- Shadow DOM should not cause layout thrashing
- Real-time updates should not block main thread
- Large transcripts should scroll smoothly

## Non-Functional Requirements

### Performance Requirements

**Response Time:**
- AI chat responses should stream within 500ms of request
- UI should update within 200ms of receiving response chunks
- Transcript fetch should complete within 3 seconds for most videos

**Load Time:**
- Extension should initialize within 2 seconds of page load
- Chat interface should render within 1 second of detection
- Settings should load within 500ms

### Reliability Requirements

**Error Handling:**
- All API failures should have graceful fallbacks
- Network timeouts should be handled with retry logic
- Invalid user inputs should be validated before processing

**Data Recovery:**
- Conversations should survive extension reloads
- Settings should persist across browser restarts
- Partial responses should be recoverable from streaming errors

### Security Requirements

**Data Protection:**
- API keys never leave browser local storage
- No external servers process user data
- Extension sandbox prevents malicious access

**Privacy:**
- User conversations are never logged or stored externally
- Extension does not track user browsing history
- All processing happens locally in browser

### Accessibility Requirements

**Keyboard Navigation:**
- All interactive elements should be keyboard accessible
- Chat input should support Enter/Shift+Enter for send/newline
- Tab order should follow logical flow

**Screen Reader Support:**
- Chat interface should be readable by screen readers
- Status updates should be announced (connection state, responses)
- Form inputs should have proper labels and descriptions

## Technical Debt and Future Considerations

### Current Limitations

**Known Issues:**
- Side panel video detection uses polling (not event-driven)
- No transcript fetch implementation yet
- No rate limiting or request batching
- Chrome-only features for some APIs

**Performance Concerns:**
- Large conversation histories may impact performance
- Streaming responses could cause memory issues with very long responses
- Shadow DOM injection may conflict with YouTube's DOM changes

### Future Enhancements

**Planned Features:**
- Transcript fetching and analysis
- Message persistence per video
- Model switching mid-conversation
- More AI provider support (Claude, Groq, etc.)
- Error handling and offline mode

**Technical Improvements:**
- Event-driven video detection (polling removal)
- Request batching and rate limiting
- Memory optimization for long conversations
- Better error recovery mechanisms

**Platform Expansion:**
- Safari browser support
- Mobile browser extensions
- Additional video platforms (Twitch, Vimeo, etc.)

## Competitive Analysis

**Direct Competitors:**
- **YouTube AI extensions** - Various third-party AI extensions for YouTube
- **Browser AI chat tools** - General-purpose AI browser assistants

**Competitive Advantages:**
- **Native YouTube integration** - Works within YouTube interface
- **Multi-provider support** - Not locked to single AI provider
- **Real-time streaming** - Better UX than static responses
- **State persistence** - Conversations saved per video

**Market Opportunity:**
- Growing demand for AI-powered content analysis
- Increasing adoption of browser extensions
- Need for efficient content consumption tools
- Integration with existing platforms

## Success Criteria

### Phase 1 (Current)
- Extension loads and works on YouTube
- Basic chat functionality with AI providers
- Settings persistence and configuration
- Cross-browser compatibility

### Phase 2 (Next Quarter)
- Transcript fetching and analysis
- Improved error handling and user feedback
- Model selection and switching
- Performance optimizations

### Phase 3 (Future)
- Additional video platform support
- Advanced AI features and summarization
- Mobile extension support
- Enterprise features and analytics