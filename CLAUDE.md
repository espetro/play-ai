# play-ai

Browser extension — WXT + React, targets Chrome/Firefox/Edge.

## Package manager

Always use `bun`. Check `packageManager` in root `package.json`.

## Browser testing with agent-browser

NEVER use Playwright directly. Use the `agent-browser` CLI (not `dev-browser`).

### YouTube consent bypass

Before navigating to any `youtube.com` URL, inject the SOCS cookie via the `--state` flag at browser launch. This file uses Playwright's storageState format with the SOCS cookie (Reject All behavior) + CONSENT fallback.

```bash
agent-browser --extension apps/extension/.output/chrome-mv3 \
  --state scripts/youtube-cookies.json \
  open "https://www.youtube.com/watch?v=<videoId>"
```

The SOCS cookie must be loaded before any navigation to prevent the "Before you continue" interstitial from appearing.

### Extension testing

Run `scripts/test-extension.sh` to launch a full test session against YouTube or Invidious:

```bash
# Test YouTube (embedded overlay + sidebar API)
bash scripts/test-extension.sh --youtube

# Test Invidious fallback (different UI, verify sidebar API compat)
bash scripts/test-extension.sh --invidious
```

### Test targets

- **YouTube**: `https://www.youtube.com/watch?v=ypzNhwpmOD4`
- **Invidious**: `https://inv.nadeko.net/watch?v=FDXWH51IJBY` (fallback, tests sidebar API on alternative video platform)

## UI Architecture

All UI components live in `apps/extension/components/`. Single-app monorepo, so `packages/ui` was consolidated into the extension. See memory for details.
