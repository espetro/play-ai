import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";

export default defineUnlistedScript((): string | null => {
  try {
    // Readability.parse() is DESTRUCTIVE — mutates DOM in-place
    // MUST clone first
    const clone = document.cloneNode(true) as Document;
    const reader = new Readability(clone);
    const article = reader.parse();

    if (!article?.content) return null;

    const td = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });

    return td.turndown(article.content);
  } catch {
    return null;
  }
});