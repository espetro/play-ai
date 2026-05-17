import type { ExtensionState } from "./types";

export interface StorageAdapter {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

const DEFAULT_STATE: ExtensionState = {
  messages: {},
};

export function createStorage(adapter: StorageAdapter) {
  async function getAll(): Promise<ExtensionState> {
    const data = await adapter.get(["config", "videoId", "messages", "transcript"]);
    return {
      config: (data.config as ExtensionState["config"]) ?? undefined,
      videoId: (data.videoId as ExtensionState["videoId"]) ?? undefined,
      messages: (data.messages as ExtensionState["messages"]) ?? DEFAULT_STATE.messages,
      transcript: (data.transcript as ExtensionState["transcript"]) ?? undefined,
    };
  }

  async function set(key: string, value: unknown): Promise<void> {
    await adapter.set({ [key]: value });
  }

  async function setPartial(partial: Partial<ExtensionState>): Promise<void> {
    const current = await getAll();
    await adapter.set({
      config: partial.config ?? current.config,
      videoId: partial.videoId ?? current.videoId,
      messages: partial.messages ?? current.messages,
      transcript: partial.transcript ?? current.transcript,
    });
  }

  return { getAll, set, setPartial };
}

export const storage = createStorage({
  get: (keys) => globalThis.browser.storage.local.get(keys),
  set: (items) => globalThis.browser.storage.local.set(items),
});
