import { storage } from "#imports";

export interface AppConfig {
  provider: "anthropic" | "openai";
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface AppState {
  config: AppConfig | null;
  videoId: string | null;
  messages: Record<string, ChatMessage[]>;
}

export const DEFAULT_STATE: AppState = {
  config: null,
  videoId: null,
  messages: {},
};

export async function getState(): Promise<AppState> {
  const data = (await browser.storage.local.get(["config", "videoId", "messages"])) as {
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

export async function setState(updates: Partial<AppState>): Promise<void> {
  await browser.storage.local.set(updates);
}

export async function getConfig(): Promise<AppConfig | null> {
  const { config } = (await browser.storage.local.get("config")) as { config?: AppConfig | null };
  return config ?? null;
}

export async function setConfig(config: AppConfig): Promise<void> {
  await browser.storage.local.set({ config });
}

export async function getMessages(videoId: string): Promise<ChatMessage[]> {
  const { messages } = (await browser.storage.local.get("messages")) as {
    messages?: Record<string, ChatMessage[]>;
  };
  return messages?.[videoId] ?? [];
}

export async function setMessages(videoId: string, messages: ChatMessage[]): Promise<void> {
  const { messages: allMessages } = (await browser.storage.local.get("messages")) as {
    messages?: Record<string, ChatMessage[]>;
  };
  const updated = { ...allMessages, [videoId]: messages };
  await browser.storage.local.set({ messages: updated });
}

export async function addMessage(videoId: string, message: ChatMessage): Promise<void> {
  const messages = await getMessages(videoId);
  messages.push(message);
  await setMessages(videoId, messages);
}

export async function clearMessages(videoId: string): Promise<void> {
  const { messages } = (await browser.storage.local.get("messages")) as {
    messages?: Record<string, ChatMessage[]>;
  };
  const updated = { ...messages };
  delete updated[videoId];
  await browser.storage.local.set({ messages: updated });
}

export async function clearAll(): Promise<void> {
  await browser.storage.local.clear();
}

export const $videoId = storage.defineItem<string | null>("local:videoId", {
  fallback: null,
});

export const $messages = storage.defineItem<Record<string, ChatMessage[]>>("local:messages", {
  fallback: {},
});

export const $config = storage.defineItem<AppConfig | null>("local:config", {
  fallback: null,
});

export interface Conversation {
  id: string;
  videoId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export const $conversations = storage.defineItem<Record<string, Conversation>>(
  "local:conversations",
  {
    fallback: {},
  },
);

export const $activeConversationId = storage.defineItem<string | null>(
  "local:activeConversationId",
  {
    fallback: null,
  },
);

export const $streamingMessages = storage.defineItem<Record<string, string>>(
  "local:streamingMessages",
  {
    fallback: {},
  },
);

export const $configs = storage.defineItem<AppConfig[]>("local:configs", {
  fallback: [],
});

export const $activeConfigId = storage.defineItem<string | null>("local:activeConfigId", {
  fallback: null,
});

export async function getActiveConfig(): Promise<AppConfig | null> {
  const configs = await browser.storage.local.get(["configs", "activeConfigId"]);
  const configList = (configs.configs as AppConfig[] | undefined) ?? [];
  const activeId = (configs.activeConfigId as string | null | undefined) ?? null;
  if (!activeId) return null;
  return configList.find((c) => c.id === activeId) ?? null;
}
