"use client";

import {
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  Trash2,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import { authClient } from "@/lib/auth-client";
import type { CurrentUser } from "@/lib/auth";
import { useDocuments } from "./documents-context";
import { Logo } from "./logo";

export type ChatSummary = { id: string; title: string };

export function Sidebar({ user, chats }: { user: CurrentUser; chats: ChatSummary[] }) {
  const pathname = usePathname();
  const router = useRouter();

  async function deleteChat(id: string) {
    if (!confirm("Delete this chat?")) return;
    const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("Could not delete the chat.");
    if (pathname === `/chat/${id}`) router.push("/chat");
    router.refresh(); // re-fetch the chat list from the server
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href="/chat">
          <Logo />
        </Link>
      </div>

      <div className="px-3">
        <Link
          href="/chat"
          className="flex w-full items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium shadow-xs transition hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800"
        >
          <Plus className="size-4" /> New chat
        </Link>
      </div>

      <DocumentsSection />

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="px-4 pb-1 text-xs font-medium tracking-wide text-stone-500 uppercase">Chats</p>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {chats.length === 0 && <p className="px-2 py-2 text-sm text-stone-500">No chats yet.</p>}
          {chats.map((chat) => {
            const active = pathname === `/chat/${chat.id}`;
            return (
              <div
                key={chat.id}
                className={`group flex items-center rounded-lg ${
                  active ? "bg-stone-200/80 dark:bg-stone-800" : "hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
                }`}
              >
                <Link href={`/chat/${chat.id}`} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm">
                  <MessageSquare className="size-4 shrink-0 text-stone-400" />
                  <span className="truncate">{chat.title}</span>
                </Link>
                <button
                  onClick={() => deleteChat(chat.id)}
                  className="mr-1 rounded p-1 text-stone-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600 focus:opacity-100"
                  aria-label="Delete chat"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3 border-t border-stone-200 px-4 py-3 dark:border-stone-800">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-emerald-600 text-sm text-white">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-stone-500">{user.email}</p>
        </div>
        <button
          onClick={async () => {
            await authClient.signOut();
            router.push("/");
            router.refresh();
          }}
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

function DocumentsSection() {
  const { documents, uploads, uploadFiles, removeDocument, error, clearError } = useDocuments();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between px-4 pb-1">
        <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
          Documents {documents.length > 0 && `(${documents.length})`}
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          <UploadIcon className="size-3.5" /> Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = ""; // allow picking the same file again
          }}
        />
      </div>

      {error && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={clearError} aria-label="Dismiss">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <ul className="max-h-56 overflow-y-auto px-2">
        {uploads.map((u) => (
          <li key={u.tempId} className="flex items-center gap-2 px-2 py-1.5 text-sm">
            <Loader2 className="size-4 shrink-0 animate-spin text-emerald-600" />
            <span className="min-w-0 flex-1 truncate">{u.name}</span>
            <span className="text-xs text-stone-500">{Math.round(u.progress)}%</span>
          </li>
        ))}

        {documents.length === 0 && uploads.length === 0 && (
          <li>
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-stone-300 px-3 py-4 text-center text-sm text-stone-500 hover:border-emerald-500 hover:text-emerald-700 dark:border-stone-700"
            >
              Upload your first PDF
            </button>
          </li>
        )}

        {documents.map((doc) => (
          <li
            key={doc.id}
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-200/50 dark:hover:bg-stone-800/50"
            title={doc.status === "failed" ? (doc.error ?? "Processing failed") : doc.name}
          >
            {doc.status === "processing" ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-amber-500" />
            ) : doc.status === "failed" ? (
              <AlertCircle className="size-4 shrink-0 text-red-500" />
            ) : (
              <FileText className="size-4 shrink-0 text-stone-400" />
            )}
            <span className="min-w-0 flex-1 truncate">{doc.name}</span>
            <span className="text-xs text-stone-500 group-hover:hidden">
              {doc.status === "processing" ? "Processing…" : doc.status === "failed" ? "Failed" : `${doc.pageCount} p`}
            </span>
            <span className="hidden items-center gap-0.5 group-hover:flex">
              {doc.status === "ready" && (
                <a
                  href={`/api/documents/${doc.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  aria-label="Open PDF"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              <button
                onClick={() => {
                  if (confirm(`Delete ${doc.name}?`)) void removeDocument(doc.id);
                }}
                className="rounded p-1 text-stone-400 hover:text-red-600"
                aria-label="Delete document"
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
