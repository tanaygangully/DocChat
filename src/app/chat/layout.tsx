import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { listChats, listDocuments } from "@/lib/queries";

// Everything under /chat requires sign-in. The layout loads the sidebar data
// once; router.refresh() re-runs it after a new chat is created or deleted.
export default async function ChatLayout({ children }: LayoutProps<"/chat">) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [documents, chats] = await Promise.all([listDocuments(user.id), listChats(user.id)]);

  return (
    <div className="h-dvh">
      <AppShell user={user} chats={chats} initialDocuments={documents}>
        {children}
      </AppShell>
    </div>
  );
}
