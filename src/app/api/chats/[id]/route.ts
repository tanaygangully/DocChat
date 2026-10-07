import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chats } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedChat, isUuid } from "@/lib/queries";

// DELETE /api/chats/:id — messages are removed too (ON DELETE CASCADE)
export async function DELETE(_req: Request, ctx: RouteContext<"/api/chats/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await ctx.params;
  const chat = isUuid(id) ? await getOwnedChat(user.id, id) : null;
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(chats).where(eq(chats.id, chat.id));
  return NextResponse.json({ ok: true });
}
