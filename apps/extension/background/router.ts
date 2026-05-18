import { router, procedure } from './trpc';
import { chromeEventToAsyncGen } from './utils/chromeEventToAsyncGen';
import { storageGetInput, storageSetInput, messageSchema } from '~/lib/schemas';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import * as v from 'valibot';

export const appRouter = router({
  tabs: router({
    list: procedure.query(async () => {
      return browser.tabs.query({});
    }),
    onActivated: procedure.subscription(async function* ({ signal }) {
      type TabOrNull = Awaited<ReturnType<typeof browser.tabs.get>> | null;
      yield* chromeEventToAsyncGen<TabOrNull>(
        (cb) => {
          const listener = (info: { tabId: number; windowId: number }) => {
            browser.tabs.get(info.tabId).then((tab) => cb(tab)).catch(() => cb(null));
          };
          browser.tabs.onActivated.addListener(listener);
          return () => browser.tabs.onActivated.removeListener(listener);
        },
        signal,
      );
    }),
  }),

  storage: router({
    get: procedure
      .input(storageGetInput)
      .query(async ({ input }) => {
        const result = await browser.storage.local.get(input.key);
        return result[input.key] ?? null;
      }),
    set: procedure
      .input(storageSetInput)
      .mutation(async ({ input }) => {
        await browser.storage.local.set({ [input.key]: input.value });
      }),
    onChanged: procedure
      .input(v.object({ key: v.string() }))
      .subscription(async function* ({ input, signal }) {
        yield* chromeEventToAsyncGen<unknown>(
          (cb) => {
            const listener = (changes: Record<string, any>, area: string) => {
              if (area === 'local' && input.key in changes) {
                cb(changes[input.key].newValue);
              }
            };
            browser.storage.onChanged.addListener(listener);
            return () => browser.storage.onChanged.removeListener(listener);
          },
          signal,
        );
      }),
  }),

  chat: router({
    stream: procedure
      .input(v.object({ messages: v.array(messageSchema) }))
      .subscription(async function* ({ input, signal }) {
        const { textStream } = await streamText({
          model: openai('gpt-4o-mini'),
          messages: input.messages,
          abortSignal: signal,
        });
        for await (const chunk of textStream) {
          if (signal?.aborted) break;
          yield { type: 'chunk' as const, text: chunk };
        }
        yield { type: 'done' as const, text: '' };
      }),
  }),
});

export type AppRouter = typeof appRouter;
