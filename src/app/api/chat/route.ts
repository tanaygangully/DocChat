import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chats, documents, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type { ChatEvent } from "@/lib/chat-events";
import { rewriteAsStandaloneQuestion, streamAnswer, type ChatTurn } from "@/lib/gemini";
import { MAX_QUESTION_CHARS } from "@/lib/limits";
import { getOwnedChat, isUuid } from "@/lib/queries";
import { buildSystemPrompt, retrieve } from "@/lib/retrieve";

export const maxDuration = 60;

// POST /api/chat  { chatId?: string, message: string }
// The full RAG loop for one question, streamed back as NDJSON.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json()) as { chatId?: string | null; message?: string };
  const question = body.message?.trim() ?? "";
  if (!question) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  if (question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }

  const [readyDoc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.userId, user.id), eq(documents.status, "ready")))
    .limit(1);
  if (!readyDoc) {
    return NextResponse.json({ error: "Upload a PDF first" }, { status: 400 });
  }

  // 1. Find the chat, or start a new one titled after the first question
  let chatId: string;
  let history: ChatTurn[] = [];
  if (body.chatId) {
    const chat = isUuid(body.chatId) ? await getOwnedChat(user.id, body.chatId) : null;
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    chatId = chat.id;
    const recent = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(10);
    history = recent.reverse();
  } else {
    const title = question.length > 60 ? `${question.slice(0, 57)}…` : question;
    const [chat] = await db.insert(chats).values({ userId: user.id, title }).returning({ id: chats.id });
    chatId = chat.id;
  }

  await db.insert(messages).values({ chatId, role: "user", content: question });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        // 2. Turn follow-ups into a standalone search question
        const searchQuery = history.length ? await rewriteAsStandaloneQuestion(history, question) : question;

        // 3. Retrieve the closest chunks from this user's PDFs
        const sources = await retrieve(user.id, searchQuery);
        send({ type: "meta", chatId, sources });

        // 4. Generate the answer, streaming each piece to the browser
        const answerStream = await streamAnswer(buildSystemPrompt(sources), history, question);
        let answer = "";
        for await (const chunk of answerStream) {
          const text = chunk.text;
          if (text) {
            answer += text;
            send({ type: "text", text });
          }
        }

        // 5. Save the answer so it shows up in chat history
        await db.insert(messages).values({
          chatId,
          role: "assistant",
          content: answer || "Sorry, I couldn't generate an answer.",
          sources,
        });
        await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, chatId));
        send({ type: "done" });
      } catch (err) {
        console.error("Chat failed:", err);
        const status = (err as { status?: number }).status;
        send({
          type: "error",
          message:
            status === 429
              ? "The AI service is busy (rate limit). Wait a minute and try again."
              : "Something went wrong while answering. Please try again.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Chat-Id": chatId,
    },
  });
}
