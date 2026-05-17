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

export interface ExtensionState {
  config?: AppConfig;
  videoId?: string;
  messages: Record<string, ChatMessage[]>;
  transcript?: TranscriptLine[];
}

export type BackgroundMessage =
  | { type: "GET_STATE" }
  | { type: "SET_CONFIG"; payload: AppConfig }
  | { type: "SEND_MESSAGE"; payload: { videoId: string; content: string } }
  | { type: "CLEAR_CHAT"; payload: { videoId: string } }
  | {
      type: "TEST_CONNECTION";
      payload: { provider: ProviderType; baseUrl?: string; apiKey: string };
    }
  | { type: "GET_TRANSCRIPT"; payload: { videoId: string } }
  | { type: "STATE_UPDATE" };

export type BackgroundResponse =
  | { type: "ERROR"; payload: { message: string } }
  | { type: "STATE"; payload: ExtensionState }
  | { type: "CONNECTION_TEST"; payload: { models: string[] } | { error: string } }
  | { type: "CHAT_RESPONSE"; payload: ChatMessage }
  | { type: "TRANSCRIPT_RESULT"; payload: TranscriptLine[] };
