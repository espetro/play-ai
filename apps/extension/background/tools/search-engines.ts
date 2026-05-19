import { getLogger } from "~/lib/logger";

const logger = getLogger(["background", "searchEngines"]);

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchEngine {
  buildUrl(query: string): string;
  /** Self-contained function for executeScript injection — NO closures, NO imports */
  scrapeResults: () => WebSearchResult[];
}

// MOVE the exact scrapeGoogleResults function from web-search.ts here.
// It must remain self-contained (no closures, no imports) because it's injected via browser.scripting.executeScript.
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
        if (t.length > 20) {
          snippet = t;
          break;
        }
      }
    }
    out.push({ title, url, snippet });
    if (out.length >= 10) break;
  }
  return out;
}

export const google: SearchEngine = {
  buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=en`,
  scrapeResults: scrapeGoogleResults,
};
