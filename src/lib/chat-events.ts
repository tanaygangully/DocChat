import type { Source } from "@/db/schema";

// The chat API streams one JSON object per line (NDJSON):
//   {"type":"meta", ...}   once, first: which chat + which PDF passages were used
//   {"type":"text", ...}   many: pieces of the answer as they are generated
//   {"type":"done"}        once, at the end
//   {"type":"error", ...}  if something breaks
export type ChatEvent =
  | { type: "meta"; chatId: string; sources: Source[] }
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type { Source };
