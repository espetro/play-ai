# play-ai

YouTube AI chat browser extension (WXT + React, targets Chrome/Firefox/Edge). Extension-specific rules in `apps/extension/CLAUDE.md`.

## Local development

**Package manager**: Always use `bun`. Check `packageManager` in root `package.json`.

**Build extension**: `cd apps/extension && bun run build`. Output: `.output/chrome-mv3/` (and `-firefox` variant).

**Test extension**: `bash scripts/test-extension.sh --youtube` or `--invidious` — uses agent-browser, injects YouTube consent cookies via `scripts/youtube-cookies.json`.

## Docs & Guidelines

- **Architecture**: `docs/architecture.md` — Layers, data flow, communication patterns
- **Dev Guidelines**: `docs/dev-guidelines.md` — Design system, component workflow, hooks policy
- **PRD**: `docs/prd.md` — Product requirements, features, success metrics
- **Extension-specific rules**: `apps/extension/CLAUDE.md` — UI architecture, browser APIs, testing, design system rules
