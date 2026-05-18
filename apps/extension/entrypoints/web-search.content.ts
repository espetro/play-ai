import { defineContentScript } from "wxt/utils/define-content-script";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function extractGoogleUrl(href: string): string {
  try {
    const url = new URL(href);
    if (url.hostname === "www.google.com" && url.pathname === "/url") {
      return url.searchParams.get("q") || href;
    }
  } catch {
    // ignore
  }
  return href;
}

function isConsentPage(): boolean {
  const url = window.location.href;
  if (url.includes("/consent/")) {
    return true;
  }
  const dialogRoot = document.querySelector("#cxOnboardingDialogRoot");
  if (dialogRoot) {
    return true;
  }
  const bodyText = document.body?.innerText || "";
  if (bodyText.includes("Before you continue")) {
    return true;
  }
  return false;
}

function getSnippet(element: Element): string {
  // Try .VwiC3b first (Google's snippet class)
  const vwi = element.querySelector(".VwiC3b");
  if (vwi?.textContent) {
    return vwi.textContent;
  }

  // Try data-sncf="1"
  const sncf = element.querySelector("[data-sncf='1']");
  if (sncf?.textContent) {
    return sncf.textContent;
  }

  // Fallback: find a span with substantive text (> 20 chars)
  const spans = element.querySelectorAll("span");
  for (const span of spans) {
    const text = span.textContent?.trim() || "";
    if (text.length > 20) {
      return text;
    }
  }

  return "";
}

async function main(): Promise<SearchResult[]> {
  // Wait for Google's JS rendering
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check for consent/interstitial pages
  if (isConsentPage()) {
    return [];
  }

  // Find search result containers
  const containers =
    document.querySelectorAll("#rso .g, #search .g");
  if (!containers.length) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const container of containers) {
    // Skip "People Also Ask" sections
    if (container.closest(".related-question-pair")) {
      continue;
    }

    const titleEl = container.querySelector("h3");
    const anchorEl = container.querySelector("a");

    const title = titleEl?.textContent?.trim() || "";
    const href = anchorEl?.getAttribute("href") || "";
    const url = extractGoogleUrl(href);
    const snippet = getSnippet(container);

    if (!title || !url) {
      continue;
    }

    results.push({ title, url, snippet });

    if (results.length >= 10) {
      break;
    }
  }

  return results;
}

export default defineContentScript({
  registration: "runtime",
  matches: ["*://www.google.com/*", "*://google.com/*"],
  async main() {
    try {
      return await main();
    } catch {
      return [];
    }
  },
});
