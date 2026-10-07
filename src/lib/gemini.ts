import "server-only";
import { GoogleGenAI, type Content } from "@google/genai";
import { EMBEDDING_DIMENSIONS } from "@/db/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-2";
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemini-3.5-flash";

// The free tier has per-minute limits. When Google answers "429 Too Many
// Requests", wait a bit and try again instead of failing the whole upload.
async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const retryable = status === 429 || status === 500 || status === 503;
      if (!retryable || i >= attempts) throw err;
      const delayMs = 2000 * 2 ** (i - 1); // 2s, 4s, 8s, 16s
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await withRetry(() =>
    ai.models.embedContent({
      model: EMBED_MODEL,
      // One Content object per text = one embedding per text.
      // (Passing plain strings would merge them into a single embedding.)
      contents: texts.map((text) => ({ parts: [{ text }] })),
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    }),
  );
  const vectors = res.embeddings?.map((e) => e.values ?? []) ?? [];
  if (vectors.length !== texts.length) {
    throw new Error(`Expected ${texts.length} embeddings, got ${vectors.length}`);
  }
  return vectors;
}

// gemini-embedding-2 takes the task as a text prefix: documents and questions
// are labelled differently so a question lands close to the passage that answers it.
export async function embedDocumentChunks(title: string, chunks: string[]) {
  const BATCH = 50;
  const all: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH).map((c) => `title: ${title} | text: ${c}`);
    all.push(...(await embed(batch)));
  }
  return all;
}

export async function embedQuery(question: string) {
  const [vector] = await embed([`task: search result | query: ${question}`]);
  return vector;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

const toContents = (turns: ChatTurn[]): Content[] =>
  turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] }));

// Follow-ups like "what about the second one?" are useless as a search query.
// Ask the model to rewrite them into a full question using the chat history.
export async function rewriteAsStandaloneQuestion(history: ChatTurn[], question: string) {
  const transcript = history
    .slice(-6)
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content.slice(0, 1000)}`)
    .join("\n");

  const res = await withRetry(() =>
    ai.models.generateContent({
      model: CHAT_MODEL,
      contents: `Conversation so far:\n${transcript}\n\nFollow-up: ${question}`,
      config: {
        systemInstruction:
          "Rewrite the follow-up as one standalone search question that makes sense without the conversation. " +
          "Keep names, numbers and terms exactly. Reply with the question only.",
        temperature: 0,
      },
    }),
  );
  return res.text?.trim() || question;
}

// Streams the final answer token by token.
export async function streamAnswer(systemInstruction: string, history: ChatTurn[], question: string) {
  return withRetry(() =>
    ai.models.generateContentStream({
      model: CHAT_MODEL,
      contents: toContents([...history, { role: "user", content: question }]),
      config: { systemInstruction, temperature: 0.2 },
    }),
  );
}
