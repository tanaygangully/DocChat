import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedDocument, isUuid } from "@/lib/queries";

// DELETE /api/documents/:id — removes the PDF, its chunks (cascade) and the file
export async function DELETE(_req: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await ctx.params;
  const doc = isUuid(id) ? await getOwnedDocument(user.id, id) : null;
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(documents).where(eq(documents.id, doc.id));
  try {
    await del(doc.blobUrl);
  } catch (err) {
    console.error("Blob delete failed (row already removed):", err);
  }
  return NextResponse.json({ ok: true });
}
