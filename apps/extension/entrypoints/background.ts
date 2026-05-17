import { createMessageHandler, setupPortHandlers } from "~/background/messages";
import { getConfig, setConfig, type AppConfig } from "~/lib/storage";

export default defineBackground({
  main() {
    setupInstall();
    setupMessaging();
    setupPorts();
  },
});

function getDevEnvConfig(): AppConfig | null {
  if (import.meta.env.PROD) return null;

  const baseUrl = import.meta.env.VITE_AI_BASE_URL;
  const apiKey = import.meta.env.VITE_AI_API_KEY;
  const model = import.meta.env.VITE_AI_MODEL;

  if (!baseUrl || !model) return null;

  const provider = baseUrl.includes("anthropic") ? "anthropic" as const : "openai" as const;

  return {
    provider,
    apiKey: apiKey ?? "",
    baseUrl,
    model,
  };
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
