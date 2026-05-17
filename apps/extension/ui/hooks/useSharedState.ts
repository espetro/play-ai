import { useCallback } from "react";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import type { AppConfig, AppState, ChatMessage } from "~/lib/storage";

// Must stay in sync with AppState in lib/storage.ts
export type ExtensionState = AppState;

type StorageKeys = "config" | "videoId" | "messages";

const STORAGE_KEYS = ["config", "videoId", "messages"] satisfies StorageKeys[];

const DEFAULT_STATE: ExtensionState = {
  config: null,
  videoId: null,
  messages: {},
};

const $config = atom<AppConfig | null>(DEFAULT_STATE.config);
const $videoId = atom<string | null>(DEFAULT_STATE.videoId);
const $messages = atom<Record<string, ChatMessage[]>>(DEFAULT_STATE.messages);

const ATOM_MAP = {
  config: $config,
  videoId: $videoId,
  messages: $messages,
} as const;

let storageListenerRegistered = false;

async function syncFromStorage() {
  const response = await browser.storage.local.get(STORAGE_KEYS);
  const data = response as {
    config?: AppConfig | null;
    videoId?: string | null;
    messages?: Record<string, ChatMessage[]>;
  };

  $config.set(data.config ?? null);
  $videoId.set(data.videoId ?? null);
  $messages.set(data.messages ?? {});
}

function ensureStorageListener() {
  if (storageListenerRegistered) return;
  storageListenerRegistered = true;

  syncFromStorage();

  browser.storage.onChanged.addListener(function handleStorageChange(changes, areaName) {
    if (areaName !== "local") return;

    for (const key of STORAGE_KEYS) {
      if (key in changes) {
        const change = changes[key as keyof typeof changes];
        const atom = ATOM_MAP[key as keyof ExtensionState];
        atom.set(change?.newValue);
      }
    }
  });
}

export function useExtensionState(): [
  ExtensionState,
  (partial: Partial<ExtensionState>) => Promise<void>,
] {
  ensureStorageListener();

  const config = useStore($config);
  const videoId = useStore($videoId);
  const messages = useStore($messages);

  const state: ExtensionState = {
    config,
    videoId,
    messages,
  };

  const setPartial = useCallback(async (partial: Partial<ExtensionState>) => {
    if ("config" in partial) $config.set(partial.config as AppConfig | null);
    if ("videoId" in partial) $videoId.set(partial.videoId as string | null);
    if ("messages" in partial) $messages.set(partial.messages as Record<string, ChatMessage[]>);

    await browser.storage.local.set(partial);
  }, []);

  return [state, setPartial];
}

export function useSharedState<K extends keyof ExtensionState>(
  key: K,
): [ExtensionState[K], (value: ExtensionState[K]) => Promise<void>] {
  ensureStorageListener();

  const $atom = ATOM_MAP[key];
  const value = useStore($atom) as ExtensionState[K];

  const setValue = useCallback(
    async (value: ExtensionState[K]) => {
      $atom.set(value);
      await browser.storage.local.set({ [key]: value });
    },
    [key, $atom],
  );

  return [value, setValue];
}
