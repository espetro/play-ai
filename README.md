# Play AI — YouTube Chat Extension

A browser extension that enables you to chat about YouTube videos using your own AI API credentials (Anthropic Claude or OpenAI-compatible).

## Architecture

This is a **TypeScript 7 (@typescript/native-preview) WXT + React + TanStack Router + Tailwind v4 + Vercel AI SDK** monorepo project using Turborepo and Bun.

```
/
├── apps/extension/          # WXT browser extension
├── packages/ui/             # Shared React components (chat, onboarding)
├── packages/ai/             # Vercel AI SDK wrappers
├── turbo.json               # Monorepo pipeline
├── validate.ts              # Validation script (types, lint, build)
└── bun.lockb
```

## Stack

- **WXT** — browser extension framework (Manifest V3)
- **React 18** — component library
- **TanStack Router** — hash-based routing for extension pages
- **Tailwind v4** — CSS utility framework
- **Vercel AI SDK** — unified AI interface (Anthropic, OpenAI, OpenAI-compatible)
- **Turborepo** — monorepo task orchestration
- **Bun** — package manager & JS runtime

## Features

1. **YouTube Overlay** — injected React component in YouTube's sidebar using Shadow DOM
2. **Side Panel** — persistent Chrome side panel for power users
3. **Onboarding** — 3-step setup (provider selection, API key validation, model selection)
4. **Settings** — reconfigure provider/key/model at any time
5. **Multi-provider support** — Anthropic + OpenAI (or any OpenAI-compatible endpoint)
6. **Real-time chat** — stream-based responses powered by Vercel AI SDK

## Targets

- **Chrome** (side_panel)
- **Firefox** (sidebar_action)
- **Edge** (side_panel)

WXT auto-handles manifest differences across browsers.

## Development

### Install

```bash
bun install
```

### Dev Server

```bash
bun turbo dev
```

Starts WXT dev server on Chrome. HMR enabled, extension auto-reloads on file changes.

### Build

```bash
bun turbo build
```

Outputs `.output/` directory (unpacked extension). Use `bun turbo zip` to package.

### Validation

Run the full validation suite (types + lint + build):

```bash
bun validate
```

Outputs:

```
✅ Types
✅ Linter
✅ Build
```

## Project Files

### Key Entry Points

- `apps/extension/src/entrypoints/background.ts` — MV3 service worker (AI proxy + state hub)
- `apps/extension/src/entrypoints/content/index.ts` — YouTube content script (Shadow DOM overlay)
- `apps/extension/src/entrypoints/sidepanel/main.tsx` — Side panel UI (React + TanStack Router)
- `apps/extension/src/entrypoints/options/main.tsx` — Onboarding page (same routing structure)

### Shared Packages

- `packages/ai/src/providers.ts` — Vercel AI SDK provider factory
- `packages/ai/src/models.ts` — Model catalogs (Anthropic, OpenAI)
- `packages/ui/src/chat/` — ChatMessage, ChatInput, ChatShell components
- `packages/ui/src/onboarding/` — ProviderStep, ApiKeyStep, ModelStep components

### Utilities

- `apps/extension/src/lib/storage.ts` — chrome.storage.local helpers (no wxt/storage)
- `apps/extension/src/lib/messaging.ts` — typed chrome.runtime.sendMessage wrapper
- `apps/extension/src/lib/youtube.ts` — video ID extraction & SPA navigation detection

## State Management

**Source of truth:** `chrome.storage.local`

**Broadcast pattern:**

1. Background service worker reads/writes config and chat history
2. On change, background notifies all connected tabs and ports
3. Content script + side panel receive updates via `chrome.runtime.onMessage`

No Redux, no Context API across contexts — just typed messaging.

## AI Streaming

Background service worker uses `streamText()` from Vercel's `ai` package. Streams chunks back to content script / side panel via port messages for real-time updates.

## Known Limitations

- Side panel video detection uses polling (2s interval) on fallback if SPA navigation event isn't available
- Only supports chat; no transcript fetch (yet)
- No rate limiting or request batching (each message calls the provider)

## Next Steps

1. **Test on YouTube:**
   - Load extension in Chrome (chrome://extensions → Load unpacked)
   - Navigate to any YouTube video
   - Open side panel (extension icon → Open side panel)
   - Go through onboarding
   - Start chatting!

2. **Enhance:**
   - Add transcript fetching from YouTube API
   - Implement message persistence per video
   - Add model switching mid-conversation
   - Support more AI providers (Claude, Groq, etc.)
   - Add error handling & offline mode

3. **Package:**
   - Run `bun turbo zip` to create .zip for Chrome Web Store submission
