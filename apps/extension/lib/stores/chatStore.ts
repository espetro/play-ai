type ChatSnapshot = { status: 'idle' | 'streaming' | 'done' | 'error'; text: string };

let snapshot: ChatSnapshot = { status: 'idle', text: '' };
const listeners = new Set<() => void>();

export const chatStore = {
  getSnapshot: () => snapshot,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  update: (next: Partial<ChatSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((l) => l());
  },
  reset: () => chatStore.update({ status: 'idle', text: '' }),
};
