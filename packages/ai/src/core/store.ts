/// <reference types="chrome" />
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

/**
 * IndexedDB adapter - standard Web API, works across browser contexts.
 * Uses a singleton database connection per adapter instance.
 */
export function createIndexedDBAdapter(
  dbName = "play-ai-storage",
  storeName = "keyval",
): StorageAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function getDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(storeName);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          dbPromise = null;
          reject(request.error);
        };
      });
    }
    return dbPromise;
  }

  return {
    async get(keys: string[]): Promise<Record<string, unknown>> {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          const req = store.get(key);
          req.onsuccess = () => {
            if (req.result !== undefined) result[key] = req.result;
          };
        }
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
      });
    },

    async set(items: Record<string, unknown>): Promise<void> {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        for (const [key, value] of Object.entries(items)) {
          store.put(value, key);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
  };
}

/**
 * Browser extension storage adapter - wraps chrome.storage.local.
 * Use this in extension contexts (background, popup, side panel).
 * Content scripts should use browser.runtime.sendMessage to delegate to background.
 */
export function createExtensionStorageAdapter(): StorageAdapter {
  const ext = globalThis as typeof globalThis & { browser: typeof chrome };
  return {
    get: (keys) => ext.browser.storage.local.get(keys),
    set: (items) => ext.browser.storage.local.set(items),
  };
}

/**
 * Default storage using IndexedDB (standard Web API).
 * Works in any browser context including service workers.
 *
 * For extension contexts that need cross-context sync via browser.storage.local,
 * use createStorage(createExtensionStorageAdapter()) instead.
 */
export const storage = createStorage(createIndexedDBAdapter());
