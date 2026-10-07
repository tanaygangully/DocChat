import "server-only";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chats, documents, messages } from "@/db/schema";

// Small, reusable reads. Every one takes userId so a user can only ever
// see their own rows.

export type DocumentSummary = {
  id: string;
  name: string;
  status: "processing" | "ready" | "failed";
  pageCount: number | null;
  error: string | null;
};

export async function listDocuments(userId: string): Promise<DocumentSummary[]> {
  return db
    .select({
      id: documents.id,
      name: documents.name,
      status: documents.status,
      pageCount: documents.pageCount,
      error: documents.error,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
}

export async function countDocuments(userId: string) {
  const [row] = await db.select({ n: count() }).from(documents).where(eq(documents.userId, userId));
  return row.n;
}

export async function getOwnedDocument(userId: string, id: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
  return doc ?? null;
}

export async function listChats(userId: string) {
  return db
    .select({ id: chats.id, title: chats.title })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .limit(100);
}

export async function getOwnedChat(userId: string, id: string) {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, id), eq(chats.userId, userId)));
  return chat ?? null;
}

export async function getMessages(chatId: string) {
  return db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      sources: messages.sources,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));
}

// Postgres UUIDs: reject anything else before it reaches the database.
export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
