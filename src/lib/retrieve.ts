import "server-only";
import { and, cosineDistance, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { chunks, documents, type Source } from "@/db/schema";
import { embedQuery } from "./gemini";

// The "R" in RAG: find the chunks whose meaning is closest to the question,
// only searching this user's own PDFs.
export async function retrieve(userId: string, question: string, topK = 6): Promise<Source[]> {
  const queryVector = await embedQuery(question);

  // cosine distance: 0 = same meaning, 2 = opposite. similarity = 1 - distance.
  const distance = cosineDistance(chunks.embedding, queryVector);
  const similarity = sql<number>`1 - (${distance})`;

  const rows = await db
    .select({
      documentId: chunks.documentId,
      documentName: documents.name,
      page: chunks.pageNumber,
      content: chunks.content,
      similarity,
    })
    .from(chunks)
    .innerJoin(documents, eq(chunks.documentId, documents.id))
    .where(and(eq(chunks.userId, userId), eq(documents.status, "ready")))
    // Sort by raw distance (smallest first) — this exact form lets Postgres use the HNSW index.
    .orderBy(distance)
    .limit(topK);

  return rows.map((r, i) => ({
    n: i + 1,
    documentId: r.documentId,
    documentName: r.documentName,
    page: r.page,
    snippet: r.content,
    similarity: Number(r.similarity),
  }));
}

// The "A" in RAG: put the retrieved chunks into the instructions for the model.
export function buildSystemPrompt(sources: Source[]) {
  const context = sources
    .map((s) => `[${s.n}] (${s.documentName}, page ${s.page})\n${s.snippet}`)
    .join("\n\n---\n\n");

  return `You are a helpful assistant that answers questions about the user's PDF documents.

Rules:
- Answer ONLY from the context below. Do not use outside knowledge.
- After each fact, cite the context number in square brackets, like [1] or [2][3].
- If the context does not contain the answer, say you couldn't find it in the uploaded documents. Do not guess.
- Be concise. Use short paragraphs or bullet points. Use Markdown.

Context:
${context || "(no relevant passages found)"}`;
}
