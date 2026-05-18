#!/usr/bin/env bun
/**
 * Test the play-ai extension against YouTube or Invidious
 *
 * Usage:
 *  bun run scripts/test-extension.ts [--youtube|--invidious] [--headed]
 *
 * Browser selection (env var override):
 *  BROWSER_EXECUTABLE_PATH=/path/to/binary bun run scripts/test-extension.ts ...
 *
 * Profile persistence:
 *  The extension profile is stored at ~/.agent-browser/profiles/play-ai and
 *  symlinked to the agent-browser temp dir so cookies/consent persist across reboots.
 *  To reset the profile: rm -rf ~/.agent-browser/profiles/play-ai
 */
import { $, argv } from "bun";
import { parseArgs } from "util";
import { join } from "path";
import { existsSync } from "fs";
import { homedir } from "os";

const PROJECT_ROOT = join(import.meta.dir, "..");
const EXT_OUTPUT = join(`${PROJECT_ROOT}/apps/extension/.output/chrome-mv3`);

// Resolve browser binary: env var → Helium → default (Playwright Chromium)
const HOME = homedir();
const CHROMIUM_CANDIDATES = [
  `${HOME}/Applications/Helium.app/Contents/MacOS/Helium`,
  `${HOME}/Applications/Brave.app/Contents/MacOS/Brave Browser`,
];
const browserBinary =
  process.env.BROWSER_EXECUTABLE_PATH ||
  CHROMIUM_CANDIDATES.find((p) => existsSync(p));

// Set env vars for agent-browser daemon auto-launch.
// This approach (env vars instead of CLI flags) ensures agent-browser v0.7.x
// properly loads extensions, since the CLI sends an empty launch command but
// the daemon's auto-launch reads these env vars.
process.env.AGENT_BROWSER_EXTENSIONS = EXT_OUTPUT;
if (browserBinary) {
  process.env.AGENT_BROWSER_EXECUTABLE_PATH = browserBinary;
}

const getInput = () => {
  const { values } = parseArgs({
    args: argv.slice(2),
    options: {
      youtube: { type: "boolean" },
      invidious: { type: "boolean" },
      headed: { type: "boolean" },
    },
  });

  if (values.invidious) {
    return { target: "invidious", headed: values.headed };
  }
  return { target: "youtube", headed: values.headed };
};

const main = async () => {
  const { target, headed } = getInput();

  const extOutputDir = await $`test -d ${EXT_OUTPUT}`.quiet();
  if (extOutputDir.exitCode != 0) {
    console.log("Extension not built. Building now...");
    await $`cd ${PROJECT_ROOT} && bun run --filter play-ai-extension build`;
  }

  const extOutputDirAgain = await $`test -d ${EXT_OUTPUT}`.quiet();
  if (extOutputDirAgain.exitCode != 0) {
    console.error(`Error: Extension output directory not found at ${EXT_OUTPUT}`);
    process.exit(1);
  }

  console.log(`Using extension from: ${EXT_OUTPUT}`);
  console.log(`Browser: ${browserBinary ?? "agent-browser default (Playwright Chromium)"}`);
  console.log(`Target: ${target}`);
  console.log("");

  if (headed) {
    process.env.AGENT_BROWSER_HEADED = "1";
  }

  if (target === "youtube") {
    const VIDEO_URL = "https://www.youtube.com/watch?v=ypzNhwpmOD4";

    console.log("Testing play-ai extension on YouTube...");
    console.log("");

    await $`agent-browser open ${VIDEO_URL}`;

    console.log("");
    console.log("Taking screenshot...");
    await $`agent-browser screenshot`;

    console.log("");
    console.log("Checking page state (consent wall, video player)...");
    await $`agent-browser eval 'document.querySelector("ytd-consent-bump-v2-lightbox, tp-yt-paper-dialog") ? "consent wall present" : "consent wall absent"'`;

    console.log("");
    console.log("Checking for extension overlay...");
    await $`agent-browser eval 'document.querySelector("#secondary") ? "secondary sidebar found" : "secondary sidebar not found"'`;

    console.log("");
    console.log("Snapshot of interactive elements...");
    await $`agent-browser snapshot -i`;
  } else {
    const VIDEO_URL = "https://inv.nadeko.net/watch?v=FDXWH51IJBY";

    console.log("Testing play-ai extension on Invidious (alternative video platform)...");
    console.log("");

    await $`agent-browser open ${VIDEO_URL}`;

    console.log("");
    console.log("Taking screenshot...");
    await $`agent-browser screenshot`;

    console.log("");
    console.log("Checking for video player...");
    await $`agent-browser eval 'document.querySelector("video") ? "video player found" : "video player not found"'`;

    console.log("");
    console.log("Snapshot of interactive elements...");
    await $`agent-browser snapshot -i`;
  }

  console.log("");
  console.log("Test complete!");
  console.log("");
  console.log("Expected results:");

  if (target === "youtube") {
    console.log("  ✓ Video player present");
    console.log("  ✓ Secondary sidebar (where extension overlay mounts) present");
  } else {
    console.log("  ✓ Video player present");
    console.log("  ✓ Extension can interact with page");
  }
};

await main();
