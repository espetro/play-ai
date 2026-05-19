import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { WxtStorageItem } from "#imports";

interface CacheEntry<T> {
  value: T;
  notifiers: Set<() => void>;
}

const cache = new WeakMap<WxtStorageItem<any, {}>, CacheEntry<any>>();

function getEntry<T>(item: WxtStorageItem<T, {}>, fallback: T): CacheEntry<T> {
  let entry = cache.get(item) as CacheEntry<T> | undefined;
  if (!entry) {
    entry = { value: fallback, notifiers: new Set() };
    cache.set(item, entry);
    item.getValue().then((stored) => {
      if (stored !== null && stored !== undefined) {
        entry!.value = stored;
        entry!.notifiers.forEach((n) => n());
      }
    });
  }
  return entry;
}

export function useStorageItem<T>(item: WxtStorageItem<T, {}>, fallback: T): T {
  const entry = getEntry(item, fallback);

  // Stabilize fallback to prevent subscribe from recreating on every render.
  // Without this, an inline object fallback like {} would be a new reference
  // each render, causing useSyncExternalStore to teardown/recreate subscriptions.
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  // Register a single watcher on mount. watch() returns an unwatch function
  // that we call on unmount. This runs exactly once per mount regardless of
  // how many times subscribe's useCallback reference changes.
  useEffect(
    function watchStorageItemChanges() {
      const unwatch = item.watch((newValue: T) => {
        entry.value = newValue ?? fallbackRef.current;
        entry.notifiers.forEach((n) => n());
      });
      return function unwatchStorageItemChanges() {
        unwatch();
      };
    },
    [item, entry],
  );

  const subscribe = useCallback(
    (onChange: () => void) => {
      entry.notifiers.add(onChange);
      return () => entry.notifiers.delete(onChange);
    },
    [entry],
  );

  const getSnapshot = useCallback(() => entry.value, [entry]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallbackRef.current);
}
