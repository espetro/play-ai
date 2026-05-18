import { useSyncExternalStore, useEffect } from 'react';
import { trpcClient } from '~/lib/trpc';
import { tabStore } from '~/lib/stores/tabStore';

export function useActiveTab() {
  useEffect(() => {
    const sub = trpcClient.tabs.onActivated.subscribe(undefined, {
      onData: (tab) => tabStore.update(tab),
    });
    return () => sub.unsubscribe();
  }, []);

  return useSyncExternalStore(tabStore.subscribe, tabStore.getSnapshot, tabStore.getSnapshot);
}
