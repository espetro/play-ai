import { useCallback, useSyncExternalStore } from "react";
import type { AppConfig, AppState, ChatMessage } from "~/lib/storage";

// TODO: Replace with ExtensionState from @play-ai/ai/core/types once packages/ai is created
// Must stay in sync with AppState in lib/storage.ts
export type ExtensionState = AppState;

const STORAGE_KEYS = Object.keys({
  config: null,
  videoId: null,
  messages: null,
}) as (keyof ExtensionState)[];

const DEFAULT_STATE: ExtensionState = {
  config: null,
  videoId: null,
  messages: {},
};

type Listener = () => void;

const listeners = new Set<Listener>();
let cachedSnapshot: ExtensionState | undefined;
let cachePromise: Promise<ExtensionState> | undefined;

function emitChange() {
  cachedSnapshot = undefined;
  cachePromise = undefined;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readFullState(): Promise<ExtensionState> {
  const data = (await browser.storage.local.get(STORAGE_KEYS)) as {
    config?: AppConfig | null;
    videoId?: string | null;
    messages?: Record<string, ChatMessage[]>;
  };
  return {
    config: data.config ?? null,
    videoId: data.videoId ?? null,
    messages: data.messages ?? {},
  };
}

let storageListenerRegistered = false;

function ensureStorageListener() {
  if (storageListenerRegistered) return;
  storageListenerRegistered = true;

  browser.storage.onChanged.addListener(function handleStorageChange(changes, areaName) {
    if (areaName !== "local") return;

    const changedKeys = Object.keys(changes) as (keyof ExtensionState)[];
    const relevantChange = changedKeys.some((k) => STORAGE_KEYS.includes(k));
    if (relevantChange) {
      emitChange();
    }
  });
}

export function useExtensionState(): [
  ExtensionState | undefined,
  (partial: Partial<ExtensionState>) => void,
] {
  ensureStorageListener();

  const getSnapshot = useCallback((): ExtensionState | undefined => {
    if (cachedSnapshot !== undefined) return cachedSnapshot;
    // undefined signals "loading" — getServerSnapshot is used until subscribe fires
    return undefined;
  }, []);

  const getServerSnapshot = useCallback((): ExtensionState => DEFAULT_STATE, []);

  const subscribeWithInit = useCallback(
    (listener: Listener): (() => void) => {
      const unsubscribe = subscribe(listener);

      if (cachedSnapshot === undefined && cachePromise === undefined) {
        cachePromise = readFullState().then((state) => {
          cachedSnapshot = state;
          cachePromise = undefined;
          listener();
        });
      }

      return unsubscribe;
    },
    [],
  );

  const state = useSyncExternalStore(subscribeWithInit, getSnapshot, getServerSnapshot);

  const setPartial = useCallback(async (partial: Partial<ExtensionState>) => {
    await browser.storage.local.set(partial);
    // browser.storage.onChanged listener handles emitChange
  }, []);

  return [state, setPartial];
}

export function useSharedState<K extends keyof ExtensionState>(
  key: K,
): [ExtensionState[K] | undefined, (value: ExtensionState[K]) => void] {
  const [fullState, setPartial] = useExtensionState();
  const value = fullState?.[key] ?? DEFAULT_STATE[key];

  const setValue = useCallback(
    (value: ExtensionState[K]) => {
      setPartial({ [key]: value } as Partial<ExtensionState>);
    },
    [key, setPartial],
  );

  return [value, setValue];
}
