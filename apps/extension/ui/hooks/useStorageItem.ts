import { useCallback, useSyncExternalStore } from "react";
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

  const subscribe = useCallback(
    (onChange: () => void) => {
      entry.notifiers.add(onChange);
      const unwatch = item.watch((newValue: T) => {
        entry.value = newValue ?? fallback;
        onChange();
      });
      return () => {
        entry.notifiers.delete(onChange);
        unwatch();
      };
    },
    [item, entry, fallback],
  );

  const getSnapshot = useCallback(() => entry.value, [entry]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}
