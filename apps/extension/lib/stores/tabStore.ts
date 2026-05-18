type TabSnapshot = { tab: ReturnType<typeof browser.tabs.get> | null };

let snapshot: TabSnapshot = { tab: null };
const listeners = new Set<() => void>();

export const tabStore = {
  getSnapshot: () => snapshot,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  update: (tab: Awaited<ReturnType<typeof browser.tabs.get>> | null) => {
    snapshot = { tab };
    listeners.forEach((l) => l());
  },
};
