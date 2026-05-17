import { streamText, dynamicTool, stepCountIs } from "ai";
import { z } from "zod";
import { buildProvider, ANTHROPIC_MODELS, OPENAI_MODELS } from "@play-ai/ai";
import type { BackgroundMessage, BackgroundResponse, ChatMessage } from "@play-ai/ai/core/types";
import { storage } from "@play-ai/ai/core/store";

type SendMessageMessage = Extract<BackgroundMessage, { type: "SEND_MESSAGE" }>;

import { activePorts } from "./index";

async function broadcastStateUpdate(patch: Partial<{ messages: Record<string, ChatMessage[]> }>) {
  const tabs = await browser.tabs.query({ url: "*://*.youtube.com/*" });
  for (const tab of tabs) {
    if (tab.id) {
      browser.tabs.sendMessage(tab.id, { type: "STATE_UPDATE", patch }).catch(() => {});
    }
  }
  for (const port of activePorts) {
    port.postMessage({ type: "STATE_UPDATE", patch });
  }
}

function broadcastPartialMessage(videoId: string, message: ChatMessage) {
  for (const port of activePorts) {
    port.postMessage({ type: "MESSAGE_UPDATE", videoId, message });
  }
  browser.tabs.query({ url: "*://*.youtube.com/*" }).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        browser.tabs
          .sendMessage(tab.id, { type: "MESSAGE_UPDATE", videoId, message })
          .catch(() => {});
      }
    }
  });
}

export async function sendMessageHandler(message: SendMessageMessage): Promise<BackgroundResponse> {
  const { content } = message.payload;
  const state = await storage.getAll();

  if (!state.config) {
    return { type: "ERROR", payload: { message: "No config set" } };
  }

  const videoId = state.videoId;
  if (!videoId) {
    return { type: "ERROR", payload: { message: "No video ID available" } };
  }

  const messages = state.messages[videoId] ?? [];
  const userMessage: ChatMessage = {
    id: Math.random().toString(36).substr(2, 9),
    role: "user",
    content,
    timestamp: Date.now(),
  };

  const updatedMessages = { ...state.messages, [videoId]: [...messages, userMessage] };
  await storage.setPartial({ messages: updatedMessages });

  const provider = buildProvider(state.config);
  const models = state.config.provider === "anthropic" ? ANTHROPIC_MODELS : OPENAI_MODELS;
  const modelId = models.includes(state.config.model) ? state.config.model : models[0];

  const assistantMessageId = Math.random().toString(36).substr(2, 9);
  const assistantMessage: ChatMessage = {
    id: assistantMessageId,
    role: "assistant",
    content: "",
    timestamp: Date.now(),
  };

  let fullText = "";

  try {
    const stream = await streamText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: provider.languageModel(modelId),
      messages: [
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content },
      ],
      system:
        "You are a helpful assistant answering questions about YouTube videos. You have access to a transcript tool — use it proactively whenever the user asks about the video content, what was said, specific moments, quotes, or timestamps.",
      tools: {
        transcript: dynamicTool({
          description:
            "Fetches the full transcript/subtitles of the current YouTube video. Call this whenever the user asks about video content, what was said, specific moments, quotes, timestamps, or anything that requires knowing what the video contains.",
          inputSchema: z.object({}),
          execute: async () => {
            const tabs = await browser.tabs.query({
              url: `*://*.youtube.com/watch?v=${videoId}*`,
            });
            const tab = tabs[0];
            if (!tab?.id)
              return "YouTube video tab not found. Make sure the video tab is still open.";
            return new Promise<string>((resolve) => {
              browser.tabs.sendMessage(tab.id!, { type: "FETCH_TRANSCRIPT" }, (response) => {
                if (browser.runtime.lastError || !response) {
                  resolve("Could not reach the video tab to fetch transcript.");
                  return;
                }
                if (!response.available || !response.lines?.length) {
                  resolve(
                    "No transcript available for this video. It may not have subtitles enabled.",
                  );
                  return;
                }
                resolve((response.lines as string[]).join("\n"));
              });
            });
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
      },
      stopWhen: stepCountIs(3),
    });

    for await (const chunk of stream.textStream) {
      fullText += chunk;
      assistantMessage.content = fullText;
      broadcastPartialMessage(videoId, assistantMessage);
    }

    const finalMessages = {
      ...state.messages,
      [videoId]: [...(state.messages[videoId] ?? []), userMessage, assistantMessage],
    };
    await storage.setPartial({ messages: finalMessages });
    await broadcastStateUpdate({});
  } catch (error) {
    console.error("Stream error:", error);
    assistantMessage.content = "Error streaming response";
    const finalMessages = {
      ...state.messages,
      [videoId]: [...(state.messages[videoId] ?? []), userMessage, assistantMessage],
    };
    await storage.setPartial({ messages: finalMessages });
    await broadcastStateUpdate({});
  }

  return { type: "CHAT_RESPONSE", payload: assistantMessage };
}
