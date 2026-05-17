#!/usr/bin/env bun
/**
 * Test the play-ai extension against YouTube or Invidious
 *
 * Usage:
 *  bun run scripts/test-extension.ts [--youtube|--invidious] [--headed]
 */
import { $, argv } from "bun";
import { parseArgs } from "util";
import { join } from "path";
import { existsSync } from "fs";
import { homedir } from "os";

const PROJECT_ROOT = join(import.meta.dir, "..");
const EXT_OUTPUT = join(`${PROJECT_ROOT}/apps/extension/.output/chrome-mv3`);
const STATE_FILE = join(`${PROJECT_ROOT}/scripts/youtube-cookies.json`);

// Resolve browser binary: env var → Helium → Brave
const HOME = homedir();
const CHROMIUM_CANDIDATES = [
  `${HOME}/Applications/Helium.app/Contents/MacOS/Helium`,
  `${HOME}/Applications/Brave.app/Contents/MacOS/Brave Browser`,
];
const browserBinary =
  process.env.BROWSER_EXECUTABLE_PATH ||
  CHROMIUM_CANDIDATES.find((p) => existsSync(p));

if (browserBinary) {
  process.env.AGENT_BROWSER_EXECUTABLE_PATH = browserBinary;
}

const getInput = () => {
  const { values } = parseArgs({
    args: argv.slice(2),
    options: {
      youtube: {
        type: "string",
      },
      invidious: {
        type: "string",
      },
      headed: {
        type: "string",
      },
    },
  });

  if (values.invidious) {
    return { target: "invidious" };
  } else if (values.headed) {
    return { headed: true };
  }

  return { target: "youtube" };
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
  console.log(`Target: ${target}`);
  console.log("");

  const headedFlag = headed ? "--headed" : "";

  if (target === "youtube") {
    const VIDEO_URL = "https://www.youtube.com/watch?v=ypzNhwpmOD4";

    // For YouTube: use --state flag at launch to inject cookies before navigation
    console.log("Testing play-ai extension on YouTube (with consent bypass)...");
    console.log("");

    await $`agent-browser --extension ${EXT_OUTPUT} --state ${STATE_FILE} ${headedFlag} open ${VIDEO_URL}`;

    console.log("");
    console.log("Waiting for page load...");
    await $`sleep 3`;

    console.log("Taking screenshot...");
    await $`agent-browser --extension ${EXT_OUTPUT} ${headedFlag} screenshot`;

    console.log("");
    console.log("Checking page state (consent wall, video player)...");
    await $`agent-browser --extension ${EXT_OUTPUT} ${headedFlag} eval 'document.querySelector("ytd-consent-bump-v2-lightbox, tp-yt-paper-dialog") ? "consent wall present" : "consent wall absent"'`;

    console.log("");
    console.log("Checking for extension overlay...");
    await $`agent-browser --extension ${EXT_OUTPUT} ${headedFlag} eval 'document.querySelector("#secondary") ? "secondary sidebar found" : "secondary sidebar not found"'`;

    console.log("");
    console.log("Snapshot of interactive elements...");
    await $`agent-browser --extension ${EXT_OUTPUT} ${headedFlag} snapshot -i`;
  } else {
    // Invidious: no cookie bypass needed (different domain, no consent wall)
    const VIDEO_URL = "https://inv.nadeko.net/watch?v=FDXWH51IJBY";

    console.log("Testing play-ai extension on Invidious (alternative video platform)...");
    console.log("");

    await $`agent-browser --extension ${EXT_OUTPUT} ${headedFlag} open ${VIDEO_URL}`;

    console.log("");
    console.log("Waiting for page load...");
    await $`sleep 3`;

    console.log("Taking screenshot...");
    await $`agent-browser --extension ${EXT_OUTPUT} ${headedFlag} screenshot`;

    console.log("");
    console.log("Checking for video player...");
    await $`agent-browser --extension ${EXT_OUTPUT} ${headedFlag} eval 'document.querySelector("video") ? "video player found" : "video player not found"'`;

    console.log("");
    console.log("Snapshot of interactive elements...");
    await $`agent-browser --extension ${EXT_OUTPUT} ${headedFlag} snapshot -i`;
  }

  console.log("");
  console.log("Test complete!");
  console.log("");
  console.log("Expected results:");

  if (target === "youtube") {
    console.log("  ✓ No consent/cookie dialog visible (SOCS cookie injected)");
    console.log("  ✓ Video player present");
    console.log("  ✓ Secondary sidebar (where extension overlay mounts) present");
  } else {
    console.log("  ✓ Video player present");
    console.log("  ✓ Extension can interact with page");
  }
};

await main();
