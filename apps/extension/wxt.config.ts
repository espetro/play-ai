import { existsSync } from "fs";
import { homedir } from "os";
import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const HOME = homedir();

// Resolve Chromium binary: env var → Helium → Brave → undefined (WXT default Chrome)
const CHROMIUM_CANDIDATES = [
  `${HOME}/Applications/Helium.app/Contents/MacOS/Helium`,
  `${HOME}/Applications/Brave.app/Contents/MacOS/Brave Browser`,
];
const chromiumBinary =
  process.env.BROWSER_EXECUTABLE_PATH ||
  CHROMIUM_CANDIDATES.find((p) => existsSync(p));

export default defineConfig({
  manifest: (env) => ({
    name: "Play AI - YouTube Chat",
    description: "Chat about YouTube videos with your AI model",
    permissions: [
      "storage",
      "scripting",
      // sidePanel is Chrome/Edge only — Firefox ignores this permission and the
      // side_panel manifest key. Firefox sidebar support would require a different
      // sidebar_action approach and a separate Firefox build target.
      "sidePanel",
      // Dev-only: auto-inject YouTube consent cookies to bypass "Before you continue" interstitial
      ...(env.mode === "development" ? (["cookies"] as const) : []),
    ],
    host_permissions: ["*://www.youtube.com/*", "*://youtube.com/*", "<all_urls>"],
  }),
  // Uses the first available Chromium browser (Helium → Brave) and your real profile
  // so YouTube sees a legitimate session instead of a fresh ephemeral one.
  // Set BROWSER_EXECUTABLE_PATH in .env to override the binary.
  // Set CHROME_USER_DATA_DIR in .env to use your real browser profile.
  webExt: {
    ...(chromiumBinary && {
      binaries: { chrome: chromiumBinary },
    }),
    ...(process.env.CHROME_USER_DATA_DIR && {
      chromiumProfile: `${process.env.CHROME_USER_DATA_DIR}/Default`,
      keepProfileChanges: true,
    }),
  },
  vite: () => ({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@play-ai/ai": new URL("../../packages/ai/src", import.meta.url).pathname,
      },
    },
  }),
});
