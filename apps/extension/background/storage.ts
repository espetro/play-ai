import { createStorage } from "@play-ai/ai/core/store";

// browser is the WXT auto-import — resolves to chrome in MV3, native browser in Firefox.
// We avoid createExtensionStorageAdapter because it accesses globalThis.browser
// which is undefined in Chrome (Chrome only exposes `chrome`, not `browser`).
export const storage = createStorage({
  get: (keys: string[]) => browser.storage.local.get(keys) as Promise<Record<string, unknown>>,
  set: (items: Record<string, unknown>) => browser.storage.local.set(items),
});
