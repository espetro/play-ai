import { tool } from "ai";
import * as v from "valibot";
import { valibotSchema } from "@ai-sdk/valibot";
import { waitForTabLoad, truncateResult } from "./tab-utils";
import { waitForConsent, injectConsentScript } from "~/background/lib/consent";
import { getLogger } from "~/lib/logger";

const logger = getLogger(["background", "webScrapeTool"]);

const SCRAPE_TIMEOUT_MS = 20_000;

export function createWebScrapeTool() {
  return tool({
    description:
      "Scrape the full content of a web page and return it as clean markdown. Use this after webSearch to read specific pages in depth. Returns the main article content with headings, paragraphs, code blocks, and links preserved.",
    inputSchema: valibotSchema(
      v.object({
        url: v.string("The URL of the web page to scrape"),
      }),
    ),
    execute: async ({ url }, { abortSignal }) => {
      logger.debug("Scraping URL: {url}", { url });
      let tabId: number | undefined;

      try {
        const tab = await browser.tabs.create({ url, active: false });
        tabId = tab.id;
        if (!tabId) throw new Error("Failed to create scrape tab");

        await waitForTabLoad(tabId, SCRAPE_TIMEOUT_MS, abortSignal);

        const consentDone = waitForConsent(tabId, abortSignal);
        await injectConsentScript(tabId);
        await consentDone;

        const results = await browser.scripting.executeScript({
          target: { tabId },
          files: ["/scrape-page.js"],
        });

        const markdown = results[0]?.result as string | null;
        if (!markdown) {
          throw new Error(
            "Failed to extract page content. The page may not have article content or may require JavaScript rendering.",
          );
        }

        logger.debug("Scraped {url}: {length} chars of markdown", {
          url,
          length: markdown.length,
        });

        return truncateResult(markdown);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.error("Web scrape failed for {url}: {error}", { url, error: message });
        throw new Error(`Web scrape failed: ${message}`);
      } finally {
        if (tabId !== undefined) {
          await browser.tabs.remove(tabId).catch(() => {});
        }
      }
    },
  });
}