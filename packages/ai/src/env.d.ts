interface StorageArea {
  get(keys: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

interface BrowserExtension {
  storage: {
    local: StorageArea;
  };
}

declare global {
  var browser: BrowserExtension;
}

export {};
