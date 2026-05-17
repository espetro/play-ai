import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  manifest: {
    name: "Play AI - YouTube Chat",
    description: "Chat about YouTube videos with your AI model",
    permissions: ["storage", "scripting", "sidePanel"],
    host_permissions: ["*://www.youtube.com/*", "*://youtube.com/*", "<all_urls>"],
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
