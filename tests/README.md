# play-ai Extension Tests (Gauge-TS Style)

This directory contains the test suite for the play-ai browser extension in **gauge-ts** style. The tests are organized by user flow and can be executed once gauge-ts is formally integrated.

## Structure

```
tests/
├── specs/                     # Gauge spec files (.spec) describing test scenarios
│   ├── 01-setup-api-configuration.spec
│   ├── 02-context-window-validation.spec
│   └── 03-video-summarization-timestamps.spec
├── steps/                     # TypeScript step implementations
│   ├── setup-api-configuration.ts
│   ├── context-window-validation.ts
│   └── video-summarization-timestamps.ts
├── env/
│   └── default/
│       └── default.properties  # Environment configuration
├── manifest.json              # Gauge project manifest
└── README.md                  # This file
```

## User Flows Covered

### 1. Setup API Configuration (`01-setup-api-configuration.spec`)

Tests the extension setup flow where users:
- Select an LLM provider (OpenAI, Anthropic, Custom)
- Enter API credentials
- Verify the connection
- Store credentials securely

**Related components:**
- `packages/ui/src/onboarding/` — UI components
- `apps/extension/lib/storage.ts` — Credential storage
- `packages/ai/src/providers.ts` — API provider factory

### 2. Context Window Validation (`02-context-window-validation.spec`)

Tests token count validation before sending requests:
- Extract video transcript
- Calculate token count using appropriate tokenizer
- Fetch model context window limit
- Display warnings if transcript exceeds model capacity
- Allow users to select alternative models

**Related components:**
- `packages/ai/src/models.ts` — Model catalog with context windows
- `packages/ui/src/chat/ChatShell.tsx` — Model selector UI
- `apps/extension/lib/youtube.ts` — Transcript extraction

### 3. Video Summarization & Timestamps (`03-video-summarization-timestamps.spec`)

Tests the core feature:
- Send transcript to LLM
- Receive summary with embedded timestamps
- Parse timestamps from LLM response
- Render clickable timestamp links
- Seek video player to clicked timestamps

**Related components:**
- `apps/extension/entrypoints/background.ts` — LLM request & response handling
- `packages/ui/src/chat/ChatMessage.tsx` — Summary rendering
- `apps/extension/entrypoints/content/index.ts` — Video player control

## Step Implementation Format

Each step file contains a TypeScript class with methods decorated by `@Step("text from spec")`. Steps are organized as:

```typescript
@Step("Step description matching the .spec file")
public async stepName(param1: string, param2: string): Promise<void> {
  // TODO: Implementation notes
  // Actual implementation code (stubs shown)
}
```

### Implementation Notes in Steps

Each step includes comments explaining:
- What the step does
- Which source files are involved
- How to implement it with agent-browser CLI (browser automation)
- How to verify expected behavior

## Running Tests (When Gauge-TS is Ready)

### Prerequisites

1. Install gauge-ts:
   ```bash
   npm install -D @gauge-ts/cli @gauge-ts/core
   ```

2. Configure the environment:
   ```bash
   cp tests/env/default/default.properties ~/.gauge-ts/env/
   ```

3. Build the extension:
   ```bash
   bun run build --filter extension
   ```

### Run All Tests

```bash
gauge run tests
```

### Run Specific Flow Tests

```bash
# Setup API Configuration only
gauge run tests/specs/01-setup-api-configuration.spec

# Context Window Validation only
gauge run tests/specs/02-context-window-validation.spec

# Video Summarization only
gauge run tests/specs/03-video-summarization-timestamps.spec
```

### Run Specific Scenarios

```bash
gauge run --tags "setup,success" tests
```

## Browser Automation

All tests use **agent-browser CLI** (not Playwright directly) for browser automation. See the project `CLAUDE.md` for configuration:

```bash
agent-browser --extension apps/extension/.output/chrome-mv3 \
  --state scripts/youtube-cookies.json \
  open "https://www.youtube.com/watch?v=..."
```

The SOCS cookie (stored in `scripts/youtube-cookies.json`) bypasses YouTube's consent interstitial.

## Mock Data & Configuration

Test configuration is in `tests/env/default/default.properties`:

- **Browser**: Headless mode, 30s timeout
- **Extension**: Points to `.output/chrome-mv3` build
- **YouTube**: Test video URLs and cookie file path
- **LLM**: Mock or real API endpoints (toggle `test.use_mock_llm`)
- **Mocks**: Mock transcript tokens, LLM summary with timestamps

## Environment Variables

Override test configuration via environment:

```bash
gauge run tests -e headless=true
gauge run tests -e use_mock_llm=false
gauge run tests -e log.level=INFO
```

## Test Reports

After running tests, reports are generated in:

```
test-reports/
├── index.html              # HTML report
├── results.json            # JSON results
└── gauge.log               # Test logs
```

## Extending the Tests

### Adding a New Scenario

1. Add `## Scenario: ...` block to a `.spec` file
2. Write steps using `* Step description <param>`
3. Implement corresponding `@Step()` method in the `.ts` file

### Adding a New Flow

1. Create `docs/flows/04-new-flow.md` (follow the existing template)
2. Create `tests/specs/04-new-flow.spec` with Gauge markdown
3. Create `tests/steps/new-flow.ts` with TypeScript implementations
4. Reference in this README

## Notes for Implementation

- **No external dependencies yet** — gauge-ts is not installed. These are scaffolds ready for wiring.
- **TODO comments** guide implementation using agent-browser, messaging APIs, and storage APIs.
- **Step stubs** reference actual source files (e.g., `packages/ai/src/models.ts`) for context.
- **Network mocking** — Consider mocking LLM APIs during CI to avoid rate limits and costs.
- **Video mocking** — Tests can use a small local test video instead of YouTube for faster, more reliable tests.

## See Also

- `docs/flows/` — User flow documentation (referenced by tests)
- `CLAUDE.md` — Project guidelines and browser testing setup
- `packages/ai/src/models.ts` — Model definitions with context windows
- `apps/extension/lib/` — Storage, messaging, YouTube utilities
