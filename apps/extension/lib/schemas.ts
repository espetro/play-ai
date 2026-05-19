import * as v from "valibot";

export const storageGetInput = v.object({ key: v.string() });
export const storageSetInput = v.object({ key: v.string(), value: v.unknown() });

export const messageSchema = v.object({
  id: v.string(),
  role: v.union([v.literal("user"), v.literal("assistant")]),
  content: v.string(),
  timestamp: v.number(),
});
