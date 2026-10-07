import { after, NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { processDocument } from "@/lib/ingest";
import { countDocuments, listDocuments } from "@/lib/queries";

// Processing a big PDF can take a while (embedding hundreds of chunks).
export const maxDuration = 300;

const MAX_DOCUMENTS_PER_USER = 25;

// GET /api/documents — the sidebar polls this while files are processing
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json(await listDocuments(user.id));
}

// POST /api/documents — called right after the browser finishes uploading to Blob
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { url, name, size } = (await request.json()) as { url?: string; name?: string; size?: number };
  if (!url || !name || typeof size !== "number") {
    return NextResponse.json({ error: "Missing url, name or size" }, { status: 400 });
  }

  // Only accept files from Vercel Blob that sit in this user's own folder.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  const isBlob = parsed.hostname.endsWith(".blob.vercel-storage.com");
  if (!isBlob || !parsed.pathname.startsWith(`/${user.id}/`)) {
    return NextResponse.json({ error: "Invalid file location" }, { status: 400 });
  }

  if ((await countDocuments(user.id)) >= MAX_DOCUMENTS_PER_USER) {
    return NextResponse.json(
      { error: `You can keep up to ${MAX_DOCUMENTS_PER_USER} PDFs. Delete one to add more.` },
      { status: 400 },
    );
  }

  const [doc] = await db
    .insert(documents)
    .values({ userId: user.id, name: name.slice(0, 200), blobUrl: url, sizeBytes: size })
    .returning({ id: documents.id, name: documents.name, status: documents.status });

  // Reply immediately; keep processing in the background. The UI shows
  // "Processing…" and polls GET /api/documents until it says ready.
  after(() => processDocument(doc.id));

  return NextResponse.json({ ...doc, pageCount: null, error: null }, { status: 201 });
}
