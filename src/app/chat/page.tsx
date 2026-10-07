import { ChatView } from "@/components/chat-view";

// /chat — a fresh, empty chat. It gets an id when the first answer comes back.
export default function NewChatPage() {
  return <ChatView key="new" chatId={null} initialMessages={[]} />;
}
