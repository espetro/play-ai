import { tool } from "ai";
import * as v from "valibot";
import { valibotSchema } from "@ai-sdk/valibot";
import { waitForTabLoad, truncateResult } from "./tab-utils";
import { google } from "./search-engines";
import { waitForConsent, injectConsentScript } from "~/background/lib/consent";
import { getLogger } from "~/lib/logger";

const logger = getLogger(["background", "webSearchTool"]);

const SEARCH_TIMEOUT_MS = 15_000;

export function createWebSearchTool() {
  return tool({
    description:
      "Search the web using Google. Returns a list of search results with titles, URLs, and snippets. Use this to look up current information, facts, or any topic that requires up-to-date knowledge from the internet.",
    inputSchema: valibotSchema(
      v.object({
        query: v.string("The search query to look up on Google"),
      }),
    ),
    execute: async ({ query }, { abortSignal }) => {
      logger.debug("Searching for: {query}", { query });
      let tabId: number | undefined;

      try {
        const tab = await browser.tabs.create({
          url: google.buildUrl(query),
          active: false,
        });
        tabId = tab.id;
        if (!tabId) throw new Error("Failed to create search tab");

        await waitForTabLoad(tabId, SEARCH_TIMEOUT_MS, abortSignal);

        const consentDone = waitForConsent(tabId, abortSignal);
        await injectConsentScript(tabId);
        await consentDone;

        const results = await browser.scripting.executeScript({
          target: { tabId },
          func: google.scrapeResults,
        });

        const searchResults = results[0]?.result as
          | Array<{ title: string; url: string; snippet: string }>
          | undefined;

        if (!searchResults || searchResults.length === 0) {
          throw new Error("No search results found. Google may be showing a consent page or the query returned no results.");
        }

        logger.debug("Found {count} results for query: {query}", {
          count: searchResults.length,
          query,
        });

        const formatted = searchResults
          .map(
            (r, i) =>
              `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`,
          )
          .join("\n\n");

        return truncateResult(formatted);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error; // Let SDK handle abort
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.error("Web search failed: {error}", { error: message });
        throw new Error(`Web search failed: ${message}`);
      } finally {
        if (tabId !== undefined) {
          await browser.tabs.remove(tabId).catch(() => {});
        }
      }
    },
  });
}
