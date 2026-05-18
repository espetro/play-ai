export type ProviderType = "anthropic" | "openai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface AppConfig {
  provider: ProviderType;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface TranscriptLine {
  start: number;
  end: number;
  text: string;
}

export interface Conversation {
  id: string;
  videoId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ExtensionState {
  config?: AppConfig;
  videoId?: string;
  conversations: Record<string, Conversation>;
  activeConversationId?: string;
}

export type BackgroundMessage =
  | { type: "GET_STATE" }
  | { type: "SET_CONFIG"; payload: AppConfig }
  | { type: "SEND_MESSAGE"; payload: { conversationId: string; content: string } }
  | { type: "CREATE_CONVERSATION"; payload: { videoId: string } }
  | { type: "DELETE_CONVERSATION"; payload: { conversationId: string } }
  | { type: "SET_ACTIVE_CONVERSATION"; payload: { conversationId: string | null } }
  | {
      type: "TEST_CONNECTION";
      payload: { provider: ProviderType; baseUrl?: string; apiKey: string };
    }
  | { type: "GET_TRANSCRIPT"; payload: { videoId: string } }
  | { type: "GET_MODELS" }
  | { type: "CHECK_TRANSCRIPT"; payload: { videoId: string } }
  | { type: "STATE_UPDATE" };

export type BackgroundResponse =
  | { type: "ERROR"; payload: { message: string } }
  | { type: "STATE"; payload: ExtensionState }
  | { type: "CONNECTION_TEST"; payload: { models: string[] } | { error: string } }
  | { type: "CHAT_RESPONSE"; payload: ChatMessage }
  | { type: "CONVERSATION_CREATED"; payload: { conversationId: string } }
  | { type: "TRANSCRIPT_RESULT"; payload: TranscriptLine[] }
  | { type: "MODELS_LIST"; payload: string[] }
  | { type: "TRANSCRIPT_STATUS"; payload: { available: boolean } };
