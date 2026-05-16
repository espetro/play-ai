export interface AppConfig {
  provider: 'anthropic' | 'openai'
  apiKey: string
  baseUrl?: string
  model: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface AppState {
  config: AppConfig | null
  videoId: string | null
  messages: Record<string, ChatMessage[]>
}

const DEFAULT_STATE: AppState = {
  config: null,
  videoId: null,
  messages: {},
}

export async function getState(): Promise<AppState> {
  const data = await chrome.storage.local.get(['config', 'videoId', 'messages'])
  return {
    config: data.config ?? null,
    videoId: data.videoId ?? null,
    messages: data.messages ?? {},
  }
}

export async function setState(updates: Partial<AppState>): Promise<void> {
  await chrome.storage.local.set(updates)
}

export async function getConfig(): Promise<AppConfig | null> {
  const { config } = await chrome.storage.local.get('config')
  return config ?? null
}

export async function setConfig(config: AppConfig): Promise<void> {
  await chrome.storage.local.set({ config })
}

export async function getMessages(videoId: string): Promise<ChatMessage[]> {
  const { messages } = await chrome.storage.local.get('messages')
  return messages?.[videoId] ?? []
}

export async function setMessages(
  videoId: string,
  messages: ChatMessage[]
): Promise<void> {
  const { messages: allMessages } = await chrome.storage.local.get('messages')
  const updated = { ...allMessages, [videoId]: messages }
  await chrome.storage.local.set({ messages: updated })
}

export async function addMessage(
  videoId: string,
  message: ChatMessage
): Promise<void> {
  const messages = await getMessages(videoId)
  messages.push(message)
  await setMessages(videoId, messages)
}

export async function clearMessages(videoId: string): Promise<void> {
  const { messages } = await chrome.storage.local.get('messages')
  const updated = { ...messages }
  delete updated[videoId]
  await chrome.storage.local.set({ messages: updated })
}

export async function clearAll(): Promise<void> {
  await chrome.storage.local.clear()
}
