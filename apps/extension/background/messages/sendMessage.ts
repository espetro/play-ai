import { streamText, stepCountIs } from "ai";
import { buildLanguageModel } from "@play-ai/ai";
import type {
  AppConfig,
  BackgroundMessage,
  BackgroundResponse,
  ChatMessage,
  Conversation,
} from "@play-ai/ai/core/types";
import { createWebSearchTool } from "~/background/tools/web-search";
import { createWebScrapeTool } from "~/background/tools/web-scrape";
import { createTranscriptTool } from "~/background/tools/transcript";
import {
  type ActiveStream,
  activeStreams,
  broadcastStateUpdate,
  broadcastPartialMessage,
  flushStreamingMessage,
} from "./streaming";

type SendMessageMessage = Extract<BackgroundMessage, { type: "SEND_MESSAGE" }>;

interface LocalStorageState {
  conversations?: Record<string, Conversation>;
  configs?: AppConfig[];
  activeConfigId?: string | null;
}

export async function sendMessageHandler(message: SendMessageMessage): Promise<BackgroundResponse> {
  const { conversationId, content } = message.payload;
  const { conversations, configs, activeConfigId } = (await browser.storage.local.get([
    "conversations",
    "configs",
    "activeConfigId",
  ])) as LocalStorageState;

  const configList = configs ?? [];
  const config = activeConfigId ? configList.find((c) => c.id === activeConfigId) : null;

  if (!config) {
    return { type: "ERROR", payload: { message: "No config set" } };
  }

  if (!conversations || !conversations[conversationId]) {
    return { type: "ERROR", payload: { message: "Conversation not found" } };
  }

  const conversation = conversations[conversationId];
  const videoId = conversation.videoId;
  const isVideoContext = videoId !== "_default";
  const messages = conversation.messages;

  const existing = activeStreams.get(conversationId);
  if (existing) {
    existing.controller.abort();
    if (existing.debounceTimer) clearTimeout(existing.debounceTimer);
    activeStreams.delete(conversationId);
  }

  const userMessage: ChatMessage = {
    id: Math.random().toString(36).substr(2, 9),
    role: "user",
    content,
    timestamp: Date.now(),
  };

  const updatedConversations = {
    ...conversations,
    [conversationId]: {
      ...conversation,
      messages: [...messages, userMessage],
      updatedAt: Date.now(),
    },
  };
  await browser.storage.local.set({ conversations: updatedConversations });

  const assistantMessageId = Math.random().toString(36).substr(2, 9);
  const assistantMessage: ChatMessage = {
    id: assistantMessageId,
    role: "assistant",
    content: "",
    timestamp: Date.now(),
  };

  const controller = new AbortController();
  const activeStream: ActiveStream = {
    conversationId,
    videoId: isVideoContext ? videoId : undefined,
    partialContent: "",
    controller,
  };
  activeStreams.set(conversationId, activeStream);

  const GENERAL_AGENT =
    "You are a helpful AI assistant with access to web search and web scraping tools. Use webSearch to look up current information, recent events, or facts you're not confident about. When a search result looks relevant but you need more detail, use webScrape to read the full page content. Answer the user's questions clearly and concisely.";

  const VIDEO_AGENT =
    "You are a helpful assistant answering questions about YouTube videos. You have access to a transcript tool — use it proactively whenever the user asks about the video content, what was said, specific moments, quotes, or timestamps. You also have web search and web scraping tools — use webSearch to find information beyond the video, and webScrape to read specific pages in depth when you need more detail than the search snippet provides.";

  const systemPrompt = isVideoContext ? VIDEO_AGENT : GENERAL_AGENT;

  try {
    const stream = await streamText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: buildLanguageModel(config),
      messages: [
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content },
      ],
      system: systemPrompt,
      tools: {
        webSearch: createWebSearchTool(),
        webScrape: createWebScrapeTool(),
        ...(isVideoContext ? { transcript: createTranscriptTool(videoId) } : {}),
      },
      stopWhen: stepCountIs(5),
      abortSignal: controller.signal,
      experimental_telemetry: {
        isEnabled: import.meta.env.DEV,
        functionId: "chat",
        metadata: {
          conversationId,
          videoId: videoId ?? "none",
          provider: config.provider,
          model: config.model,
        },
        recordInputs: true,
        recordOutputs: true,
      },
    });

    for await (const chunk of stream.textStream) {
      if (controller.signal.aborted) break;

      activeStream.partialContent += chunk;
      assistantMessage.content = activeStream.partialContent;

      broadcastPartialMessage(conversationId, assistantMessage);

      if (activeStream.debounceTimer) clearTimeout(activeStream.debounceTimer);
      activeStream.debounceTimer = setTimeout(() => {
        flushStreamingMessage(conversationId, activeStream.partialContent).catch(console.error);
      }, 400);
    }

    if (activeStream.debounceTimer) clearTimeout(activeStream.debounceTimer);
    assistantMessage.content = activeStream.partialContent;

    const finalConversations = {
      ...updatedConversations,
      [conversationId]: {
        ...updatedConversations[conversationId],
        messages: [
          //
          ...(updatedConversations?.[conversationId]?.messages ?? []),
          assistantMessage,
        ],
        updatedAt: Date.now(),
      },
    };
    const { streamingMessages: existingStreaming } = (await browser.storage.local.get([
      "streamingMessages",
    ])) as { streamingMessages?: Record<string, string> };
    const streamingMessages = { ...existingStreaming };
    delete streamingMessages[conversationId];
    await browser.storage.local.set({
      conversations: finalConversations,
      streamingMessages,
    });

    activeStreams.delete(conversationId);
    await broadcastStateUpdate(isVideoContext ? videoId : undefined);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      activeStreams.delete(conversationId);
      return { type: "ERROR", payload: { message: "Stream cancelled" } };
    }

    console.error("Stream error:", error);
    assistantMessage.content = "Error streaming response";
    const finalConversations = {
      ...updatedConversations,
      [conversationId]: {
        ...updatedConversations[conversationId],
        messages: [...(updatedConversations?.[conversationId]?.messages ?? []), assistantMessage],
        updatedAt: Date.now(),
      },
    };
    await browser.storage.local.set({
      conversations: finalConversations,
    });

    const { streamingMessages: errorStreaming } = (await browser.storage.local.get([
      "streamingMessages",
    ])) as { streamingMessages?: Record<string, string> };
    const streamingMessages = { ...errorStreaming };
    delete streamingMessages[conversationId];
    await browser.storage.local.set({ streamingMessages });

    activeStreams.delete(conversationId);
    await broadcastStateUpdate(isVideoContext ? videoId : undefined);
  }

  return { type: "CHAT_RESPONSE", payload: assistantMessage };
}

export function abortStreamForConversation(conversationId: string) {
  const stream = activeStreams.get(conversationId);
  if (stream) {
    stream.controller.abort();
    if (stream.debounceTimer) clearTimeout(stream.debounceTimer);
    activeStreams.delete(conversationId);
  }
}
