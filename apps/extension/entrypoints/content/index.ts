import { defineContentScript } from "wxt/utils/define-content-script";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { createAdapter, detectPlatform } from "@play-ai/ai/core/adapters";
import { onVideoChange } from "~/lib/youtube";
import { configureLogger } from "~/lib/logger";
import "./style.css";

async function updateVideoId() {
  const platform = detectPlatform();
  const adapter = createAdapter(platform);
  if (adapter) {
    const videoId = adapter.getVideoId();
    if (videoId) {
      await browser.storage.local.set({ videoId });
    }
  }
}

function findAnchor(): HTMLElement | null {
  return (
    document.querySelector("#secondary") ||
    document.querySelector('[aria-label="Secondary"]') ||
    document.querySelector("ytd-watch-flexy #related")
  );
}

function isWatchPage(): boolean {
  return new URLSearchParams(window.location.search).has("v");
}

let mounted = false;

function ensureMounted(ui: { mount: () => void; remove: () => void; _anchorObserver?: MutationObserver }, observer?: MutationObserver) {
  if (mounted) return;
  try {
    ui.mount();
    mounted = true;
    if (observer) {
      observer.disconnect();
    }
  } catch (error) {
    console.warn("[play-ai]", error);
  }
}

function watchForAnchor(ui: any) {
  if (!isWatchPage()) {
    return;
  }

  // Null guard: document.body may not exist yet in edge cases
  if (!document.body) {
    console.warn("[play-ai] document.body not available, skipping anchor observation");
    return;
  }

  const anchor = findAnchor();
  const observeTarget = anchor || document.body;

  if (!observeTarget) return;

  let rafId: number | null = null;

  const observer = new MutationObserver(() => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(function run() {
      rafId = null;
      const currentAnchor = findAnchor();
      if (!currentAnchor && ui) {
        mounted = false;
        ui.remove();
      } else if (currentAnchor && !document.querySelector("#play-ai-root")) {
        ensureMounted(ui, observer);
      }
    });
  });

  observer.observe(observeTarget, {
    childList: true,
    subtree: true,
  });

  // Store disconnect on ui so we can clean up via ctx.onInvalidated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ui as any)._anchorObserver = observer;
}

async function renderApp(container: HTMLElement) {
  const React = await import("react");
  const ReactDOM = await import("react-dom/client");
  const AppModule = await import("./App");
  const App = AppModule.default;

  const root = document.createElement("div");
  root.id = "play-ai-root";
  container.append(root);

  container.style.fontSize = "16px";

  const appRoot = ReactDOM.createRoot(root);
  appRoot.render(React.createElement(App));
}

export default defineContentScript({
  matches: ["*://*.youtube.com/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    await configureLogger();

    const ui = await createShadowRootUi(ctx, {
      name: "play-ai-overlay",
      position: "inline",
      anchor: findAnchor,
      onMount(container: HTMLElement) {
        renderApp(container);
      },
    });

    if (isWatchPage()) {
      ensureMounted(ui);
      await updateVideoId();
    }

    const cleanup = onVideoChange(async () => {
      mounted = false;
      ui.remove();
      if (isWatchPage()) {
        ensureMounted(ui);
        await updateVideoId();
      }
    });

    ctx.onInvalidated(() => {
      cleanup();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const observer = (ui as any)._anchorObserver;
      if (observer) {
        observer.disconnect();
      }
      ui.remove();
    });

    watchForAnchor(ui);
  },
});
