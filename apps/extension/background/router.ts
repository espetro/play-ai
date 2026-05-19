import { router, procedure } from "./trpc";
import { chromeEventToAsyncGen } from "./utils/chromeEventToAsyncGen";
import { storageGetInput, storageSetInput, messageSchema } from "~/lib/schemas";
import { setConfigInput, testConnectionInput, getModelsInput } from "./schemas/crud";
import { fetchModels } from "@play-ai/ai";
import { nanoid } from "nanoid";
import type { AppConfig } from "@play-ai/ai/core/types";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import * as v from "valibot";
import {
  createConversationInput,
  deleteConversationInput,
  setActiveConversationInput,
  clearChatInput,
} from "./schemas/crud";
import { clearMessages } from "~/lib/storage";
import { activeStreams } from "./messages/streaming";
import type { Conversation } from "~/lib/storage";
import { trace, SpanStatusCode } from "@play-ai/observability";
import type { AsyncReturnType } from "type-fest";

/** We're just defining this function to circumvent type derivation issues with the overloaded 'browser.tabs.get' function */
const promisifiedGetTab = async (_: number) => browser.tabs.get(_);

type TabOrNull = AsyncReturnType<typeof promisifiedGetTab> | null;
type StorageListener = Parameters<typeof browser.storage.onChanged.addListener>[number];
type OnActivedInfoListener = Parameters<typeof browser.tabs.onActivated.addListener>[number];

interface LocalStorageState {
  conversations?: Record<string, Conversation>;
  activeConversationId?: string;
  streamingMessages?: Record<string, string>;
}
export const appRouter = router({
  tabs: router({
    list: procedure.query(async () => {
      return browser.tabs.query({});
    }),
    onActivated: procedure.subscription(async function* ({ signal }) {
      yield* chromeEventToAsyncGen<TabOrNull>((cb) => {
        const listener: OnActivedInfoListener = (info) => {
          browser.tabs
            .get(info.tabId)
            .then((tab) => cb(tab))
            .catch(() => cb(null));
        };
        browser.tabs.onActivated.addListener(listener);
        return () => browser.tabs.onActivated.removeListener(listener);
      }, signal);
    }),
  }),

  storage: router({
    get: procedure.input(storageGetInput).query(async ({ input }) => {
      const result = await browser.storage.local.get(input.key);
      return result[input.key] ?? null;
    }),
    set: procedure.input(storageSetInput).mutation(async ({ input }) => {
      await browser.storage.local.set({ [input.key]: input.value });
    }),
    onChanged: procedure.input(v.object({ key: v.string() })).subscription(async function* ({
      input,
      signal,
    }) {
      yield* chromeEventToAsyncGen<unknown>((cb) => {
        const listener: StorageListener = (changes, area) => {
          if (area === "local" && input.key in changes) {
            cb(changes[input.key]?.newValue);
          }
        };

        browser.storage.onChanged.addListener(listener);
        return () => browser.storage.onChanged.removeListener(listener);
      }, signal);
    }),
  }),

  config: router({
    set: procedure.input(setConfigInput).mutation(async ({ input }) => {
      const tracer = trace.getTracer("play-ai-extension");
      const span = tracer.startSpan("config.set");
      try {
        const { configs: existingConfigs } = (await browser.storage.local.get([
          "configs",
          "activeConfigId",
        ])) as {
          configs?: AppConfig[];
          activeConfigId?: string | null;
        };

        const configs = existingConfigs ?? [];
        const configWithId: AppConfig = {
          ...input,
          id: input.id || nanoid(),
        };

        const index = configs.findIndex((c) => c.id === configWithId.id);
        if (index >= 0) {
          configs[index] = configWithId;
        } else {
          configs.push(configWithId);
        }

        await browser.storage.local.set({
          configs,
          activeConfigId: configWithId.id,
        });
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (e) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(e) });
        span.recordException(e as Error);
        throw e;
      } finally {
        span.end();
      }
    }),

    getModels: procedure.input(getModelsInput).query(async () => {
      const tracer = trace.getTracer("play-ai-extension");
      const span = tracer.startSpan("config.getModels");
      try {
        const { configs, activeConfigId } = (await browser.storage.local.get([
          "configs",
          "activeConfigId",
        ])) as {
          configs?: AppConfig[];
          activeConfigId?: string | null;
        };

        const configList = configs ?? [];
        const config = activeConfigId ? configList.find((c) => c.id === activeConfigId) : null;

        if (!config) {
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return [];
        }

        const { provider, baseUrl, apiKey } = config;
        const result = await fetchModels({ provider, baseUrl, apiKey });
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      } catch (e) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(e) });
        span.recordException(e as Error);
        span.end();
        throw e;
      }
    }),

    testConnection: procedure.input(testConnectionInput).mutation(async ({ input }) => {
      const tracer = trace.getTracer("play-ai-extension");
      const span = tracer.startSpan("config.testConnection");
      try {
        const models = await fetchModels({
          provider: input.provider,
          baseUrl: input.baseUrl,
          apiKey: input.apiKey,
        });
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return { success: true, models };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error as Error);
        span.end();
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to test connection",
        };
      }
    }),
  }),

  chat: router({
    stream: procedure
      .input(v.object({ messages: v.array(messageSchema) }))
      .subscription(async function* ({ input, signal }) {
        const { textStream } = await streamText({
          model: openai("gpt-4o-mini"),
          messages: input.messages,
          abortSignal: signal,
        });
        for await (const chunk of textStream) {
          if (signal?.aborted) break;
          yield { type: "chunk" as const, text: chunk };
        }
        yield { type: "done" as const, text: "" };
      }),
  }),

  conversation: router({
    create: procedure.input(createConversationInput).mutation(async ({ input }) => {
      const tracer = trace.getTracer("play-ai-extension");
      const span = tracer.startSpan("conversation.create");
      try {
        const { videoId } = input;

        const conversationId = crypto.randomUUID();
        const now = Date.now();

        const { conversations } = (await browser.storage.local.get(["conversations"])) as {
          conversations?: Record<string, Conversation>;
        };

        const newConversation: Conversation = {
          id: conversationId,
          videoId,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };

        const updated = {
          ...conversations,
          [conversationId]: newConversation,
        };

        await browser.storage.local.set({
          conversations: updated,
          activeConversationId: conversationId,
        });

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return { conversationId };
      } catch (e) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(e) });
        span.recordException(e as Error);
        span.end();
        throw e;
      }
    }),

    delete: procedure.input(deleteConversationInput).mutation(async ({ input }) => {
      const tracer = trace.getTracer("play-ai-extension");
      const span = tracer.startSpan("conversation.delete");
      try {
        const { conversationId } = input;

        const stream = activeStreams.get(conversationId);
        if (stream) {
          stream.controller.abort();
          activeStreams.delete(conversationId);
        }

        const { conversations, activeConversationId, streamingMessages } =
          (await browser.storage.local.get([
            "conversations",
            "activeConversationId",
            "streamingMessages",
          ])) as LocalStorageState;

        const updated = { ...conversations };
        delete updated[conversationId];

        const updates: Record<string, unknown> = {
          conversations: updated,
        };

        if (activeConversationId === conversationId) {
          updates.activeConversationId = null;
        }

        if (streamingMessages && streamingMessages[conversationId]) {
          const updatedStreaming = { ...streamingMessages };
          delete updatedStreaming[conversationId];
          updates.streamingMessages = updatedStreaming;
        }

        await browser.storage.local.set(updates);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      } catch (e) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(e) });
        span.recordException(e as Error);
        span.end();
        throw e;
      }
    }),

    setActive: procedure.input(setActiveConversationInput).mutation(async ({ input }) => {
      const tracer = trace.getTracer("play-ai-extension");
      const span = tracer.startSpan("conversation.setActive");
      try {
        const { conversationId } = input;

        await browser.storage.local.set({
          activeConversationId: conversationId,
        });
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      } catch (e) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(e) });
        span.recordException(e as Error);
        span.end();
        throw e;
      }
    }),

    clearChat: procedure.input(clearChatInput).mutation(async ({ input }) => {
      const tracer = trace.getTracer("play-ai-extension");
      const span = tracer.startSpan("conversation.clearChat");
      try {
        const { videoId } = input;
        await clearMessages(videoId);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
      } catch (e) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(e) });
        span.recordException(e as Error);
        span.end();
        throw e;
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
