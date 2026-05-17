import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
  // When CHROME_USER_DATA_DIR is set, the dev runner copies your real Chrome profile
  // so YouTube sees a legitimate browser instead of a fresh ephemeral one.
  // This avoids YouTube's aggressive throttling of unknown profiles.
  // See .env.example for setup instructions.
  ...(process.env.CHROME_USER_DATA_DIR && {
    runner: {
      chromiumProfile: `${process.env.CHROME_USER_DATA_DIR}/Default`,
      keepProfileChanges: true,
    },
  }),
  vite: () => ({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@play-ai/ai": new URL("../../packages/ai/src", import.meta.url).pathname,
      },
    },
  }),
});
