import "server-only";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { extractText, getDocumentProxy } from "unpdf";
import { db } from "@/db";
import { chunks, documents } from "@/db/schema";
import { chunkPages } from "./chunk";
import { embedDocumentChunks } from "./gemini";

// The whole ingestion pipeline for one uploaded PDF:
// download → extract text per page → chunk → embed → save → mark ready.
export async function processDocument(documentId: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) return;

  try {
    // 1. Download the PDF from the private Blob store
    const file = await get(doc.blobUrl, { access: "private" });
    if (!file || file.statusCode !== 200) throw new Error("Could not read the uploaded file");
    const bytes = new Uint8Array(await new Response(file.stream).arrayBuffer());

    // 2. Extract text, one string per page
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text: pages } = await extractText(pdf, { mergePages: false });

    // 3. Chunk
    const pieces = chunkPages(pages);
    if (pieces.length === 0) {
      throw new Error("No text found — this PDF is probably scanned images.");
    }

    // 4. Embed
    const vectors = await embedDocumentChunks(
      doc.name,
      pieces.map((p) => p.content),
    );

    // 5. Save (in batches so one insert doesn't get huge)
    const rows = pieces.map((p, i) => ({
      documentId: doc.id,
      userId: doc.userId,
      pageNumber: p.pageNumber,
      content: p.content,
      embedding: vectors[i],
    }));
    for (let i = 0; i < rows.length; i += 100) {
      await db.insert(chunks).values(rows.slice(i, i + 100));
    }

    // 6. Done
    await db
      .update(documents)
      .set({ status: "ready", pageCount: totalPages, chunkCount: rows.length, error: null })
      .where(eq(documents.id, doc.id));
  } catch (err) {
    console.error(`Processing ${doc.name} failed:`, err);
    await db.delete(chunks).where(eq(chunks.documentId, doc.id));
    await db
      .update(documents)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message.slice(0, 300) : "Processing failed",
      })
      .where(eq(documents.id, doc.id));
  }
}
