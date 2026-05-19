import { createMessageHandler, setupPortHandlers } from "~/background/messages";
import { getConfig, setConfig, type AppConfig } from "~/lib/storage";
import { createChromeHandler } from "@kstonekuan/trpc-chrome/adapter";
import { appRouter } from "~/background/router";
import { configureLogger } from "~/lib/logger";
import { setupTelemetry, trace, SpanStatusCode } from "@play-ai/observability";

export default defineBackground({
  async main() {
    await configureLogger();
    try {
      await setupTelemetry();
      const tracer = trace.getTracer("play-ai-extension");
      const span = tracer.startSpan("service-worker-init");
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      const provider = trace.getTracerProvider();
      await provider.forceFlush();
    } catch (e) {
      console.error("[observability] Failed to setup telemetry:", e);
    }

    // Ensure clicking the toolbar button always opens the side panel.
    // Called here (not only in onInstalled) so it applies on every SW restart
    // and on dev reloads that don't bump the version.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (browser.sidePanel as any).setPanelBehavior({ openPanelOnActionClick: true });

    await setupStreamingCleanup();
    setupInstall();
    setupMessaging();
    setupPorts();
    setupYouTubeCookies();
    setupTrpc();
  },
});

function getDevEnvConfig(): AppConfig | null {
  if (import.meta.env.PROD) return null;

  const baseUrl = import.meta.env.VITE_AI_BASE_URL;
  const apiKey = import.meta.env.VITE_AI_API_KEY;
  const model = import.meta.env.VITE_AI_MODEL;

  if (!baseUrl || !model) return null;

  const provider = baseUrl.includes("anthropic") ? ("anthropic" as const) : ("openai" as const);

  return {
    id: "dev-default",
    provider,
    apiKey: apiKey ?? "",
    baseUrl,
    model,
  };
}

async function setupStreamingCleanup() {
  const { streamingMessages } = (await browser.storage.local.get(["streamingMessages"])) as {
    streamingMessages?: Record<string, string>;
  };

  if (streamingMessages && Object.keys(streamingMessages).length > 0) {
    const { conversations } = (await browser.storage.local.get(["conversations"])) as {
      conversations?: Record<string, any>;
    };

    const updatedConversations = { ...conversations };
    for (const conversationId of Object.keys(streamingMessages)) {
      if (updatedConversations[conversationId]) {
        updatedConversations[conversationId].messages.push({
          id: Math.random().toString(36).substr(2, 9),
          role: "assistant",
          content: "Response interrupted — the background process was restarted.",
          timestamp: Date.now(),
        });
      }
    }

    await browser.storage.local.set({
      conversations: updatedConversations,
      streamingMessages: {},
    });
  }
}

function setupInstall() {
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === "install") {
      const devConfig = getDevEnvConfig();
      if (devConfig) {
        const existing = await getConfig();
        if (!existing) {
          await setConfig(devConfig);
        }
      } else {
        const url = browser.runtime.getURL("/options.html" as `/options.html${string}`);
        browser.tabs.create({ url });
      }
    }
  });
}

function setupPorts() {
  browser.runtime.onConnect.addListener((port) => {
    setupPortHandlers(port);
  });
}

function setupMessaging() {
  browser.runtime.onMessage.addListener(createMessageHandler());
}

function setupTrpc() {
  createChromeHandler({ router: appRouter });
}

const YOUTUBE_CONSENT_COOKIES = [
  { name: "SOCS", value: "CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg" },
  { name: "CONSENT", value: "YES+cb.20210328-17-p0.en+FX+667" },
] as const;

async function setupYouTubeCookies() {
  if (import.meta.env.PROD) return;

  await Promise.all(
    YOUTUBE_CONSENT_COOKIES.map(({ name, value }) =>
      browser.cookies.set({
        url: "https://www.youtube.com",
        name,
        value,
        domain: ".youtube.com",
        path: "/",
        secure: true,
        sameSite: "lax",
      }),
    ),
  );
}
