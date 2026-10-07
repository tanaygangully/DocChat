import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedDocument, isUuid } from "@/lib/queries";

// GET /api/documents/:id/file — opens the PDF in the browser.
// Files are in a *private* Blob store, so they can only be read through here,
// after we've checked the file belongs to the signed-in user.
export async function GET(_req: Request, ctx: RouteContext<"/api/documents/[id]/file">) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });

  const { id } = await ctx.params;
  const doc = isUuid(id) ? await getOwnedDocument(user.id, id) : null;
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const file = await get(doc.blobUrl, { access: "private" });
  if (!file || file.statusCode !== 200) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(file.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.name)}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
    },
  });
}
