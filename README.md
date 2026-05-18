# Play AI

Transform passive video watching into active learning and exploration through AI-powered conversation.

Play AI is a browser extension that lets you chat about YouTube videos using your own AI API credentials. It lives inside YouTube — no tabs, no context switching.

**[Install and get started →](docs/onboarding.md)**

![Play AI screenshot](docs/assets/screenshot.png)

## Features

- **Native YouTube integration** — chat overlay in the sidebar, no leaving the page
- **Real-time streaming** — AI responses stream as they're generated
- **Multi-provider** — switch between Anthropic Claude and OpenAI (or any OpenAI-compatible endpoint)
- **Persistent conversations** — chat history saved per video
- **Cross-browser** — Chrome, Firefox, Edge

## Quick Start

```bash
bun install
bun turbo dev
```

Opens Chrome with the extension loaded and HMR enabled.

### YouTube testing with a real Chrome profile

YouTube aggressively throttles browsers with fresh/ephemeral profiles (no cookies, no history). To avoid this, set `CHROME_USER_DATA_DIR` in `apps/extension/.env` to your Chrome user data directory so the dev runner copies your real profile:

```bash
# apps/extension/.env
CHROME_USER_DATA_DIR="/Users/<you>/Library/Application Support/Google/Chrome"   # macOS
# CHROME_USER_DATA_DIR="/home/<you>/.config/google-chrome"                       # Linux
# CHROME_USER_DATA_DIR="C:\Users\<you>\AppData\Local\Google\Chrome\User Data"    # Windows
```

Make sure Chrome is **not running** while `bun dev` is active — the profile is copied at startup, so changes made in your regular Chrome won't appear until the next dev session.

### Fallback: Invidious

If YouTube still causes issues, use [Invidious](https://invidious.io/) for development. It has no anti-automation measures and the same video page DOM structure:

```bash
bun turbo dev   # then manually navigate to any Invidious instance
```

Build for distribution:

```bash
bun turbo build    # unpacked extension in .output/
bun turbo zip      # .zip for Chrome Web Store
```

## Documentation

| Doc | What's inside |
|---|---|
| [Architecture](docs/architecture.md) | Layer structure, data flow, communication patterns, directory layout |
| [Dev Guidelines](docs/dev-guidelines.md) | Design system, component workflow, hooks policy, testing |
| [PRD](docs/prd.md) | Product requirements, target users, success metrics, roadmap |

## License

[Apache 2.0](LICENSE)
