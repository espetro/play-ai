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
  vite: () => ({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@play-ai/ai": new URL("../../packages/ai/src", import.meta.url).pathname,
      },
    },
  }),
});
