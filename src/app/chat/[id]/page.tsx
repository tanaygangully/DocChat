import { notFound, redirect } from "next/navigation";
import { ChatView } from "@/components/chat-view";
import { getCurrentUser } from "@/lib/auth";
import { getMessages, getOwnedChat, isUuid } from "@/lib/queries";

// /chat/:id — an existing chat, loaded from the database.
export default async function ChatPage({ params }: PageProps<"/chat/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;
  const chat = isUuid(id) ? await getOwnedChat(user.id, id) : null;
  if (!chat) notFound();

  const messages = await getMessages(chat.id);

  // key={id} gives each chat its own fresh component state
  return <ChatView key={chat.id} chatId={chat.id} initialMessages={messages} />;
}
