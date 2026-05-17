import { useCallback, useSyncExternalStore } from "react";
import type { WxtStorageItem } from "#imports";

const cache = new WeakMap<WxtStorageItem<any, {}>, { value: any }>();

function getEntry<T>(item: WxtStorageItem<T, {}>, fallback: T) {
  let entry = cache.get(item);
  if (!entry) {
    entry = { value: fallback };
    cache.set(item, entry);
  }
  return entry as { value: T };
}

export function useStorageItem<T>(item: WxtStorageItem<T, {}>, fallback: T): T {
  const entry = getEntry(item, fallback);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const unwatch = item.watch((newValue: T) => {
        entry.value = newValue ?? fallback;
        onChange();
      });
      item.getValue().then((v: T | null) => {
        entry.value = v ?? fallback;
        onChange();
      });
      return unwatch;
    },
    [item, entry, fallback],
  );

  const getSnapshot = useCallback(() => entry.value, [entry]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}
