import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MAX_PDF_BYTES } from "@/lib/limits";

// The browser uploads the PDF straight to Vercel Blob (not through our server,
// which has a ~4.5 MB request limit). This route only hands out a short-lived
// upload token after checking who is asking.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Not signed in");
        // Every user's files live in their own folder.
        if (!pathname.startsWith(`${user.id}/`)) throw new Error("Invalid upload path");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_PDF_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }
}
