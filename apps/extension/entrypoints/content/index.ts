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

interface MountableUi {
  mount: () => void;
  remove: () => void;
  _anchorObserver?: MutationObserver;
}

let mounted = false;

function ensureMounted(ui: MountableUi, observer?: MutationObserver) {
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

function watchForAnchor(ui: MountableUi) {
  if (!isWatchPage()) {
    return;
  }

  // Happy path: anchor already in DOM, mount immediately
  if (findAnchor()) {
    ensureMounted(ui);
    if (mounted) return; // sync mount succeeded, no observer needed
  }

  // Anchor not ready — observe document.body for mutations
  if (!document.body || !document.body.isConnected) return;

  let rafId: number | null = null;

  const observer = new MutationObserver(() => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!mounted && findAnchor()) {
        ensureMounted(ui, observer);
        if (mounted) {
          // Deferred mount succeeded; write videoId now so sidepanel can check transcript
          updateVideoId().catch(console.error);
        }
      }
    });
  });

  try {
    observer.observe(document.body, { childList: true, subtree: true });
    ui._anchorObserver = observer;
  } catch (e) {
    console.warn("[play-ai] Failed to start anchor observer:", e);
  }
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

    const uiBase = await createShadowRootUi(ctx, {
      name: "play-ai-overlay",
      position: "inline",
      anchor: findAnchor,
      onMount(container: HTMLElement) {
        renderApp(container);
      },
    });
    const ui = uiBase as MountableUi;

    if (isWatchPage()) {
      watchForAnchor(ui);
      if (mounted) {
        await updateVideoId();
      }
    }

    const cleanup = onVideoChange(async () => {
      mounted = false;
      // Disconnect stale anchor observer before teardown
      const prevObserver = ui._anchorObserver;
      if (prevObserver) {
        prevObserver.disconnect();
        ui._anchorObserver = undefined;
      }
      ui.remove();
      if (isWatchPage()) {
        watchForAnchor(ui); // re-arms observer; handles sync and deferred mount
        if (mounted) {
          await updateVideoId(); // sync mount path: write storage immediately
        }
        // deferred mount path: updateVideoId() called inside watchForAnchor after mount
      }
    });

    ctx.onInvalidated(() => {
      cleanup();
      const observer = ui._anchorObserver;
      if (observer) {
        observer.disconnect();
      }
      mounted = false;
      ui.remove();
    });

    watchForAnchor(ui);
  },
});
