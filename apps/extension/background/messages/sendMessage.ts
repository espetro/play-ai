import { streamText, dynamicTool, stepCountIs } from "ai";
import * as v from "valibot";
import { valibotSchema } from "@ai-sdk/valibot";
import { buildLanguageModel } from "@play-ai/ai";
import type {
  BackgroundMessage,
  BackgroundResponse,
  ChatMessage,
  Conversation,
  TranscriptLine,
} from "@play-ai/ai/core/types";
import { storage, getTranscriptCache, setTranscriptCache } from "~/background/storage";
import type { TranscriptResponse } from "~/lib/messaging";

type SendMessageMessage = Extract<BackgroundMessage, { type: "SEND_MESSAGE" }>;

import { activePorts } from "./index";

interface ActiveStream {
  conversationId: string;
  partialContent: string;
  controller: AbortController;
  debounceTimer?: NodeJS.Timeout;
}

const activeStreams = new Map<string, ActiveStream>();

function formatForPrompt(lines: TranscriptLine[]): string {
  return lines
    .map((l) => {
      const s = l.start;
      const mm = Math.floor(s / 60)
        .toString()
        .padStart(2, "0");
      const ss = Math.floor(s % 60)
        .toString()
        .padStart(2, "0");
      return `[${mm}:${ss}] ${l.text}`;
    })
    .join("\n");
}

async function broadcastStateUpdate() {
  const tabs = await browser.tabs.query({ url: "*://*.youtube.com/*" });
  for (const tab of tabs) {
    if (tab.id) {
      browser.tabs.sendMessage(tab.id, { type: "STATE_UPDATE", patch: {} }).catch(() => {});
    }
  }
  for (const port of activePorts) {
    port.postMessage({ type: "STATE_UPDATE", patch: {} });
  }
}

function broadcastPartialMessage(conversationId: string, message: ChatMessage) {
  for (const port of activePorts) {
    port.postMessage({ type: "MESSAGE_UPDATE", conversationId, message });
  }
  browser.tabs.query({ url: "*://*.youtube.com/*" }).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        browser.tabs
          .sendMessage(tab.id, { type: "MESSAGE_UPDATE", conversationId, message })
          .catch(() => {});
      }
    }
  });
}

async function flushStreamingMessage(conversationId: string, content: string) {
  const { streamingMessages } = (await browser.storage.local.get(["streamingMessages"])) as {
    streamingMessages?: Record<string, string>;
  };
  const updated = { ...streamingMessages, [conversationId]: content };
  await browser.storage.local.set({ streamingMessages: updated });
}

export async function sendMessageHandler(message: SendMessageMessage): Promise<BackgroundResponse> {
  const { conversationId, content } = message.payload;
  const { conversations, configs, activeConfigId } = (await browser.storage.local.get([
    "conversations",
    "configs",
    "activeConfigId",
  ])) as {
    conversations?: Record<string, Conversation>;
    configs?: any[];
    activeConfigId?: string | null;
  };

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

  // Abort any previous stream for this conversation
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

  // Add user message immediately
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
    partialContent: "",
    controller,
  };
  activeStreams.set(conversationId, activeStream);

  const systemPrompt = isVideoContext
    ? "You are a helpful assistant answering questions about YouTube videos. You have access to a transcript tool — use it proactively whenever the user asks about the video content, what was said, specific moments, quotes, or timestamps."
    : "You are a helpful AI assistant. Answer the user's questions clearly and concisely.";

  try {
    const stream = await streamText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: buildLanguageModel(config),
      messages: [
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content },
      ],
      system: systemPrompt,
      tools: isVideoContext
        ? {
            transcript: dynamicTool({
              description:
                "Fetches the full transcript/subtitles of the current YouTube video. Call this whenever the user asks about video content, what was said, specific moments, quotes, timestamps, or anything that requires knowing what the video contains.",
              inputSchema: valibotSchema(v.object({})),
              execute: async () => {
                // Check cache first
                const cached = await getTranscriptCache(videoId);
                if (cached) {
                  return formatForPrompt(cached);
                }

                const tabs = await browser.tabs.query({
                  url: `*://*.youtube.com/watch?v=${videoId}*`,
                });
                const tab = tabs[0];
                if (!tab?.id)
                  return "YouTube video tab not found. Make sure the video tab is still open.";
                try {
                  const response = await browser.tabs.sendMessage<TranscriptResponse>(tab.id!, {
                    type: "FETCH_TRANSCRIPT",
                  });
                  if (!response?.available || !response.lines?.length) {
                    return "No transcript available for this video. It may not have subtitles enabled.";
                  }
                  // Write to cache for future calls
                  await setTranscriptCache(videoId, response.lines);
                  return formatForPrompt(response.lines);
                } catch {
                  return "Could not reach the video tab to fetch transcript.";
                }
              },
              toModelOutput: ({ output }: { output: unknown }) => {
                if (typeof output === "string") return { type: "text" as const, value: output };
                if ("error" in (output as object))
                  return {
                    type: "text" as const,
                    value: (output as { error: string }).error,
                  };
                return { type: "text" as const, value: JSON.stringify(output) };
              },
            }),
          }
        : undefined,
      stopWhen: stepCountIs(3),
      abortSignal: controller.signal,
    });

    for await (const chunk of stream.textStream) {
      if (controller.signal.aborted) break;

      activeStream.partialContent += chunk;
      assistantMessage.content = activeStream.partialContent;

      // Broadcast to ports immediately for live updates
      broadcastPartialMessage(conversationId, assistantMessage);

      // Debounced flush to storage every 400ms
      if (activeStream.debounceTimer) clearTimeout(activeStream.debounceTimer);
      activeStream.debounceTimer = setTimeout(() => {
        flushStreamingMessage(conversationId, activeStream.partialContent).catch(console.error);
      }, 400);
    }

    // Final flush to storage
    if (activeStream.debounceTimer) clearTimeout(activeStream.debounceTimer);
    assistantMessage.content = activeStream.partialContent;

    const finalConversations = {
      ...updatedConversations,
      [conversationId]: {
        ...updatedConversations[conversationId],
        messages: [...updatedConversations[conversationId].messages, assistantMessage],
        updatedAt: Date.now(),
      },
    };
    await browser.storage.local.set({
      conversations: finalConversations,
      streamingMessages: {
        ...((await browser.storage.local.get(["streamingMessages"])) as any).streamingMessages,
      },
    });
    const streamingMessages =
      ((await browser.storage.local.get(["streamingMessages"])) as any).streamingMessages || {};
    delete streamingMessages[conversationId];
    await browser.storage.local.set({ streamingMessages });

    activeStreams.delete(conversationId);
    await broadcastStateUpdate();
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as any).name === "AbortError"
    ) {
      activeStreams.delete(conversationId);
      return { type: "ERROR", payload: { message: "Stream cancelled" } };
    }

    console.error("Stream error:", error);
    assistantMessage.content = "Error streaming response";
    const finalConversations = {
      ...updatedConversations,
      [conversationId]: {
        ...updatedConversations[conversationId],
        messages: [...updatedConversations[conversationId].messages, assistantMessage],
        updatedAt: Date.now(),
      },
    };
    await browser.storage.local.set({
      conversations: finalConversations,
    });

    const streamingMessages =
      ((await browser.storage.local.get(["streamingMessages"])) as any).streamingMessages || {};
    delete streamingMessages[conversationId];
    await browser.storage.local.set({ streamingMessages });

    activeStreams.delete(conversationId);
    await broadcastStateUpdate();
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
