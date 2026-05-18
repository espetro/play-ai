import { getLogger } from "~/lib/logger";

const logger = getLogger(["background", "tabUtils"]);

export function waitForTabLoad(
  tabId: number,
  timeoutMs: number,
  abortSignal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      browser.tabs.onRemoved.removeListener(onRemoved);
      reject(new Error("Tab load timeout"));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      abortSignal?.removeEventListener("abort", onAbort);
      browser.tabs.onUpdated.removeListener(listener);
      browser.tabs.onRemoved.removeListener(onRemoved);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    abortSignal?.addEventListener("abort", onAbort, { once: true });

    const onRemoved = (removedTabId: number) => {
      if (removedTabId === tabId) {
        cleanup();
        reject(new Error("Tab was closed"));
      }
    };
    browser.tabs.onRemoved.addListener(onRemoved);

    function listener(updatedTabId: number, changeInfo: { status?: string }) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        cleanup();
        resolve();
      }
    }
    browser.tabs.onUpdated.addListener(listener);
  });
}

export function truncateResult(text: string, maxChars = 20_000): string {
  if (text.length <= maxChars) return text;
  logger.debug("Truncating result from {original} to {max} chars", {
    original: text.length,
    max: maxChars,
  });
  return text.slice(0, maxChars) + `\n[Truncated ${text.length - maxChars} chars]`;
}
