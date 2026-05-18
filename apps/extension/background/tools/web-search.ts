import { dynamicTool } from "ai";
import * as v from "valibot";
import { valibotSchema } from "@ai-sdk/valibot";

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

// This function is serialized and executed in the Google search tab.
// It must NOT reference any closures — only pure DOM operations.
function scrapeGoogleResults(): WebSearchResult[] {
  function extractUrl(href: string): string {
    try {
      const u = new URL(href);
      if (u.hostname === "www.google.com" && u.pathname === "/url") {
        return u.searchParams.get("q") || href;
      }
    } catch {}
    return href;
  }

  const isConsent =
    window.location.href.includes("/consent/") ||
    !!document.querySelector("#cxOnboardingDialogRoot") ||
    (document.body?.innerText || "").includes("Before you continue");
  if (isConsent) return [];

  const containers = document.querySelectorAll("#rso .g, #search .g");
  const out: WebSearchResult[] = [];

  for (const el of containers) {
    if (el.closest(".related-question-pair")) continue;
    const title = el.querySelector("h3")?.textContent?.trim() || "";
    const href = el.querySelector("a")?.getAttribute("href") || "";
    if (!title || !href) continue;
    const url = extractUrl(href);
    const vwi = el.querySelector(".VwiC3b")?.textContent?.trim();
    const sncf = el.querySelector("[data-sncf='1']")?.textContent?.trim();
    let snippet = vwi || sncf || "";
    if (!snippet) {
      for (const span of el.querySelectorAll("span")) {
        const t = span.textContent?.trim() || "";
        if (t.length > 20) { snippet = t; break; }
      }
    }
    out.push({ title, url, snippet });
    if (out.length >= 10) break;
  }
  return out;
}

function waitForTabLoad(
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

export function createWebSearchTool() {
  return dynamicTool({
    description:
      "Search the web using Google. Returns a list of search results with titles, URLs, and snippets. Use this to look up current information, facts, or any topic that requires up-to-date knowledge from the internet.",
    inputSchema: valibotSchema(
      v.object({
        query: v.string("The search query to look up on Google"),
      }),
    ),
    execute: async (input, { abortSignal }) => {
      const query = (input as { query: string }).query;
      const SEARCH_TIMEOUT_MS = 15_000;
      let tabId: number | undefined;

      try {
        const encoded = encodeURIComponent(query);
        const tab = await browser.tabs.create({
          url: `https://www.google.com/search?q=${encoded}&hl=en`,
          active: false,
        });
        tabId = tab.id;
        if (!tabId) throw new Error("Failed to create search tab");

        await waitForTabLoad(tabId, SEARCH_TIMEOUT_MS, abortSignal);

        const results = await browser.scripting.executeScript({
          target: { tabId },
          func: scrapeGoogleResults,
        });

        const searchResults = results[0]?.result as
          | Array<{ title: string; url: string; snippet: string }>
          | undefined;

        if (!searchResults || searchResults.length === 0) {
          return "No search results found. Google may be showing a consent page or the query returned no results.";
        }

        return searchResults
          .map(
            (r, i) =>
              `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`,
          )
          .join("\n\n");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return "Search was cancelled.";
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        return `Web search failed: ${message}`;
      } finally {
        if (tabId !== undefined) {
          await browser.tabs.remove(tabId).catch(() => {});
        }
      }
    },
    toModelOutput: ({ output }: { output: unknown }) => {
      if (typeof output === "string") return { type: "text" as const, value: output };
      return { type: "text" as const, value: JSON.stringify(output) };
    },
  });
}
