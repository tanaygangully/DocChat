"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { CurrentUser } from "@/lib/auth";
import type { DocumentSummary } from "@/lib/queries";
import { DocumentsProvider } from "./documents-context";
import { Logo } from "./logo";
import { Sidebar, type ChatSummary } from "./sidebar";

export function AppShell({
  user,
  chats,
  initialDocuments,
  children,
}: {
  user: CurrentUser;
  chats: ChatSummary[];
  initialDocuments: DocumentSummary[];
  children: ReactNode;
}) {
  // On phones the sidebar slides in over the chat. Remembering *which page*
  // it was opened on means it closes by itself after navigating.
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);

  return (
    <DocumentsProvider userId={user.id} initialDocuments={initialDocuments}>
      <div className="flex h-full">
        {open && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-stone-200 bg-stone-100 transition-transform md:static md:translate-x-0 dark:border-stone-800 dark:bg-stone-900 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar user={user} chats={chats} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-3 md:hidden dark:border-stone-800">
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-1">
              <Menu className="size-5" />
            </button>
            <Logo />
          </div>
          {children}
        </main>
      </div>
    </DocumentsProvider>
  );
}
