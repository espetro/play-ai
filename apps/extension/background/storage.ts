import { createStorage, createExtensionStorageAdapter } from "@play-ai/ai/core/store";

export const storage = createStorage(createExtensionStorageAdapter());