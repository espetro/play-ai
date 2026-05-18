import * as v from 'valibot';

export const messageSchema = v.object({
  role: v.picklist(['user', 'assistant', 'system']),
  content: v.string(),
});

export const storageGetInput = v.object({ key: v.string() });
export const storageSetInput = v.object({ key: v.string(), value: v.unknown() });

export type Message = v.InferOutput<typeof messageSchema>;
