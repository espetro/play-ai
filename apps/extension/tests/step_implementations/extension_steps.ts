import { Step, BeforeSuite } from "gauge-ts";
import { $ } from "bun";
import { execSync } from "child_process";

export default class ExtensionSteps {
  @BeforeSuite()
  async buildExtension() {
    // Always run a production build before the suite — tests MUST use the built artifact
    console.log("[Gauge] Building extension...");
    execSync("bun run build", { cwd: ".", stdio: "inherit" });
    console.log("[Gauge] Extension built successfully");
  }

  @Step("Navigate to YouTube video <url>")
  async navigate(url: string) {
    console.log(`[Gauge] Opening ${url}`);
    execSync(
      `agent-browser --extension apps/extension/.output/chrome-mv3 --state scripts/youtube-cookies.json open "${url}"`,
      {
        stdio: "inherit",
      },
    );
  }

  @Step("Secondary sidebar should be present")
  async checkSidebar() {
    console.log("[Gauge] Checking for secondary sidebar...");
    const result = execSync(
      'agent-browser eval \'document.querySelector("#secondary") ? "found" : "missing"\'',
      { encoding: "utf-8" },
    ).trim();
    console.log(`[Gauge] Sidebar check result: ${result}`);
    if (!result.includes("found")) throw new Error("Secondary sidebar not found");
  }

  @Step("No consent wall should appear")
  async checkNoConsentWall() {
    console.log("[Gauge] Checking for consent wall...");
    const result = execSync(
      'agent-browser eval \'document.querySelector("ytd-consent-bump-v2-lightbox") ? "present" : "absent"\'',
      { encoding: "utf-8" },
    ).trim();
    console.log(`[Gauge] Consent wall check result: ${result}`);
    if (!result.includes("absent")) throw new Error("Consent wall is present");
  }

  @Step("Transcript should be available")
  async checkTranscript() {
    console.log("[Gauge] Checking transcript availability...");
    // Wait briefly then check sidepanel transcript status indicator
    const result = execSync(
      'agent-browser eval \'document.querySelector("[data-transcript-status=\\"available\\"]") ? "available" : "unavailable"\'',
      { encoding: "utf-8" },
    ).trim();
    console.log(`[Gauge] Transcript check result: ${result}`);
    if (!result.includes("available")) throw new Error("Transcript status not available");
  }

  @Step("Take screenshot")
  async screenshot() {
    console.log("[Gauge] Taking screenshot...");
    execSync("agent-browser screenshot", { stdio: "inherit" });
  }
}
