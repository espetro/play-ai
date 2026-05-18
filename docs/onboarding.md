# Play AI — Onboarding Guide

Welcome to Play AI! This guide walks you through installing the extension, setting up your AI provider, and using it on YouTube.

## Prerequisites

- A Chromium-based browser (Chrome, Edge, or Brave) or Firefox
- An AI API key (see [Getting an API Key](#getting-an-api-key) below if you don't have one)

---

## Step 1 — Install the Extension

Download the latest release from [GitHub](https://github.com/espetro/play-ai/releases) and load it into your browser:

**Chrome / Edge / Brave:**

1. Download `play-ai-chrome.zip` from the [latest release](https://github.com/espetro/play-ai/releases)
2. Unzip the file
3. Open `chrome://extensions/`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** and select the unzipped folder

**Firefox:**

1. Download `play-ai-firefox.zip` from the [latest release](https://github.com/espetro/play-ai/releases)
2. Open `about:addons`
3. Click the gear icon → **Install Add-on From File**
4. Select the downloaded `.xpi` file

---

## Step 2 — Configure Your AI Provider

After installing, click the Play AI icon in your browser's toolbar. You'll be prompted to select a provider and enter your API key.

**Supported providers:**

- **Anthropic Claude** — Uses your Anthropic API key with `https://api.anthropic.com`
- **OpenAI** — Uses your OpenAI API key with `https://api.openai.com`
- **Custom** — Use any OpenAI-compatible endpoint (model provider, self-hosted, etc.)

If you don't have an API key, see the section below.

### Getting an API Key

You can get started for free using [OpenRouter](https://openrouter.ai/), which aggregates many models including several **free** options:

- **Google** — `gemini-2.0-flash` (free, fast)
- **Meta** — `llama-3.3-70b-instruct` (free)
- **Mistral** — `mistral-nemo-instruct-2407` (free)
- **DeepSeek** — `deepseek-chat-v3-0324` (free)

To use OpenRouter with Play AI:

1. Go to [openrouter.ai](https://openrouter.ai/) and create a free account
2. Navigate to **Keys** and generate a new API key (no payment required for free models)
3. In Play AI, select **Custom** provider
4. Enter your OpenRouter API key
5. Set the **Base URL** to `https://openrouter.ai/api/v1`
6. Choose your preferred free model from the model list

All free models on OpenRouter work with Play AI — just select the one you want from the model dropdown after configuring the base URL.

---

## Step 3 — Use Play AI

1. Open any YouTube video (e.g., `https://www.youtube.com/watch?v=ypzNhwpmOD4`)
2. Click the **Play AI** extension icon in your browser toolbar, or use the side panel
3. A chat interface appears alongside the video
4. Ask questions about the video content, request summaries, or explore topics

That's it — no tabs, no context switching. The conversation is saved automatically and persists for each video.

---

## Troubleshooting

**Extension doesn't appear?**
Make sure the extension is enabled in `chrome://extensions/` and that you have clicked its icon to open the side panel.

**API connection errors?**
Double-check your API key, base URL, and that your account has credits or access to free models. OpenRouter requires no payment for free-tier models.

**YouTube blocks the page?**
Try using [Invidious](https://invidious.io/) as a fallback. The extension supports both YouTube and Invidious.

**Need help?**
Open an issue on [GitHub](https://github.com/espetro/play-ai) or refer to the [Dev Guidelines](dev-guidelines.md) for development setup.
