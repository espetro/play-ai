# Play AI

Transform passive video watching into active learning and exploration through AI-powered conversation.

Play AI is a browser extension that lets you chat about YouTube videos using your own AI API credentials. It lives inside YouTube — no tabs, no context switching.

<!-- TODO: Add screenshot/GIF here -->

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
