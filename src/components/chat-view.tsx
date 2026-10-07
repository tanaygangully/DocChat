"use client";

import { ArrowUp, FileUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChatEvent, Source } from "@/lib/chat-events";
import { MAX_QUESTION_CHARS } from "@/lib/limits";
import { Answer, SourceList } from "./answer";
import { useDocuments } from "./documents-context";

export type UIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[] | null;
  pending?: boolean;
  error?: string;
};

const SUGGESTIONS = [
  "Summarize the key points",
  "What are the main conclusions?",
  "List the important dates and numbers",
];

export function ChatView({ chatId, initialMessages }: { chatId: string | null; initialMessages: UIMessage[] }) {
  const router = useRouter();
  const { readyCount, processingCount, uploads, uploadFiles } = useDocuments();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chatIdRef = useRef(chatId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canChat = readyCount > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Grow the textarea with its content (up to a limit).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const updateAssistant = (id: string, change: (m: UIMessage) => UIMessage) =>
    setMessages((all) => all.map((m) => (m.id === id ? change(m) : m)));

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy || !canChat) return;

    setInput("");
    setBusy(true);
    const assistantId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", content: question, sources: null },
      { id: assistantId, role: "assistant", content: "", sources: null, pending: true },
    ]);

    let returnedChatId: string | null = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chatIdRef.current, message: question }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      returnedChatId = res.headers.get("X-Chat-Id");

      // Read the NDJSON stream line by line as it arrives.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          const event = JSON.parse(line) as ChatEvent;
          if (event.type === "meta") updateAssistant(assistantId, (m) => ({ ...m, sources: event.sources }));
          if (event.type === "text") updateAssistant(assistantId, (m) => ({ ...m, content: m.content + event.text }));
          if (event.type === "error") updateAssistant(assistantId, (m) => ({ ...m, error: event.message }));
        }
      }
    } catch (err) {
      updateAssistant(assistantId, (m) => ({
        ...m,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    } finally {
      updateAssistant(assistantId, (m) => ({ ...m, pending: false }));
      setBusy(false);
      // A brand-new chat now has an id: move to its URL so it can be revisited.
      if (!chatIdRef.current && returnedChatId) {
        chatIdRef.current = returnedChatId;
        router.replace(`/chat/${returnedChatId}`);
      }
      router.refresh(); // updates the chat list in the sidebar
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {messages.length === 0 ? (
            <EmptyState
              canChat={canChat}
              processing={processingCount > 0 || uploads.length > 0}
              onPick={send}
              onUpload={uploadFiles}
            />
          ) : (
            <div className="space-y-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-stone-900 px-4 py-2.5 text-[15px] whitespace-pre-wrap text-white dark:bg-stone-100 dark:text-stone-900">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id}>
                    {m.pending && !m.content && !m.error && (
                      <p className="flex items-center gap-2 text-sm text-stone-500">
                        <Loader2 className="size-4 animate-spin" />
                        {m.sources ? "Writing an answer…" : "Searching your documents…"}
                      </p>
                    )}
                    {m.content && <Answer content={m.content} sources={m.sources} />}
                    {m.error && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                        {m.error}
                      </p>
                    )}
                    {!m.pending && m.sources && <SourceList content={m.content} sources={m.sources} />}
                  </div>
                ),
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-stone-200 bg-stone-50/80 px-4 pt-3 pb-4 backdrop-blur dark:border-stone-800 dark:bg-stone-950/80">
        <form
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-stone-300 bg-white p-2 shadow-sm focus-within:border-emerald-500 dark:border-stone-700 dark:bg-stone-900"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a new line
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            maxLength={MAX_QUESTION_CHARS}
            disabled={!canChat}
            placeholder={canChat ? "Ask a question about your PDFs…" : "Upload a PDF to start chatting"}
            className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] outline-none placeholder:text-stone-400 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy || !canChat}
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:bg-stone-300 dark:disabled:bg-stone-700"
            aria-label="Send"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-stone-500">
          Answers come only from your uploaded PDFs. Click a number to open the page it came from.
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  canChat,
  processing,
  onPick,
  onUpload,
}: {
  canChat: boolean;
  processing: boolean;
  onPick: (q: string) => void;
  onUpload: (files: FileList) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!canChat) {
    return (
      <div className="flex flex-col items-center pt-16 text-center">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {processing ? <Loader2 className="size-6 animate-spin" /> : <FileUp className="size-6" />}
        </div>
        <h2 className="text-xl font-semibold">{processing ? "Reading your PDF…" : "Start by uploading a PDF"}</h2>
        <p className="mt-2 max-w-sm text-sm text-stone-600 dark:text-stone-400">
          {processing
            ? "We're extracting the text and building the search index. This usually takes a few seconds per document."
            : "Once it's processed you can ask questions and get answers with page citations."}
        </p>
        {!processing && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-6 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Choose PDFs
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) onUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-16 text-center">
      <h2 className="text-2xl font-semibold tracking-tight">What do you want to know?</h2>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Ask anything about your documents.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm hover:border-emerald-500 hover:text-emerald-700 dark:border-stone-700 dark:bg-stone-900 dark:hover:text-emerald-400"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
