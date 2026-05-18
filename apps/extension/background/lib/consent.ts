import type { Browser } from "wxt/browser";
import { evalSnippets } from "@duckduckgo/autoconsent";
import { getLogger } from "~/lib/logger";

const logger = getLogger(["background", "consent"]);

export async function injectConsentScript(tabId: number): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    files: ["/consent.js"],
  });
  logger.debug("Injected consent script into tab {tabId}", { tabId });
}

export function waitForConsent(
  tabId: number,
  abortSignal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    const timeoutMs = 15_000;
    let timeout: ReturnType<typeof setTimeout>;
    let aborted = false;

    const cleanup = () => {
      clearTimeout(timeout);
      browser.runtime.onMessage.removeListener(listener);
    };

    const onAbort = () => {
      aborted = true;
      cleanup();
      logger.debug("Consent wait aborted for tab {tabId}", { tabId });
      resolve();
    };

    abortSignal?.addEventListener("abort", onAbort, { once: true });

    timeout = setTimeout(() => {
      cleanup();
      if (!aborted) {
        logger.warn("Consent wait timed out after {ms}ms for tab {tabId}", {
          ms: timeoutMs,
          tabId,
        });
        resolve();
      }
    }, timeoutMs);

    const listener = (
      msg: unknown,
      sender: Browser.runtime.MessageSender,
    ) => {
      const typedMsg = msg as { type: string; cmp?: string; totalClicks?: number; state?: { lifecycle: string }; id?: string; snippetId?: string };
      if (sender.tab?.id !== tabId) return;

      if (typedMsg.type === "autoconsentDone") {
        cleanup();
        logger.debug(
          "Consent completed for tab {tabId}: {cmp}, clicks: {clicks}",
          { tabId, cmp: typedMsg.cmp, clicks: typedMsg.totalClicks },
        );
        resolve();
        return;
      }

      if (typedMsg.type === "report" && typedMsg.state?.lifecycle === "nothingDetected") {
        cleanup();
        logger.debug("No consent banner detected for tab {tabId}", { tabId });
        resolve();
        return;
      }

      if (typedMsg.type === "eval") {
        handleEval({ id: typedMsg.id!, snippetId: typedMsg.snippetId! }, sender);
      }
    };

    browser.runtime.onMessage.addListener(listener);
  });
}

async function handleEval(
  msg: { id: string; snippetId: string },
  sender: Browser.runtime.MessageSender,
): Promise<void> {
  const tabId = sender.tab?.id;
  const frameId = sender.frameId;
  if (tabId === undefined || frameId === undefined) return;

  const snippet = evalSnippets[msg.snippetId as keyof typeof evalSnippets];
  if (!snippet) {
    await browser.tabs.sendMessage(tabId, {
      type: "evalResp",
      id: msg.id,
      result: undefined,
    }, { frameId });
    return;
  }

  try {
    const results = await browser.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      world: "MAIN",
      func: snippet,
    });
    await browser.tabs.sendMessage(
      tabId,
      { type: "evalResp", id: msg.id, result: results[0]?.result },
      { frameId },
    );
  } catch (err) {
    logger.error("Eval failed for snippet {id}: {error}", {
      id: msg.snippetId,
      error: String(err),
    });
    await browser.tabs.sendMessage(tabId, {
      type: "evalResp",
      id: msg.id,
      result: undefined,
    }, { frameId });
  }
}
