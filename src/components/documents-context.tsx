"use client";

import { upload } from "@vercel/blob/client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { MAX_PDF_BYTES } from "@/lib/limits";
import type { DocumentSummary } from "@/lib/queries";

// Shared state for the user's PDFs, used by both the sidebar (list, upload,
// delete) and the chat (is anything ready to chat with yet?).

type Upload = { tempId: string; name: string; progress: number };

type DocumentsState = {
  documents: DocumentSummary[];
  uploads: Upload[];
  readyCount: number;
  processingCount: number;
  error: string | null;
  clearError: () => void;
  uploadFiles: (files: FileList | File[]) => void;
  removeDocument: (id: string) => Promise<void>;
};

const DocumentsContext = createContext<DocumentsState | null>(null);

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used inside <DocumentsProvider>");
  return ctx;
}

export function DocumentsProvider({
  userId,
  initialDocuments,
  children,
}: {
  userId: string;
  initialDocuments: DocumentSummary[];
  children: ReactNode;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [error, setError] = useState<string | null>(null);

  const processingCount = documents.filter((d) => d.status === "processing").length;
  const readyCount = documents.filter((d) => d.status === "ready").length;

  // While any PDF is processing, ask the server for fresh statuses every 2.5s.
  useEffect(() => {
    if (processingCount === 0) return;
    const timer = setInterval(async () => {
      const res = await fetch("/api/documents");
      if (res.ok) setDocuments(await res.json());
    }, 2500);
    return () => clearInterval(timer);
  }, [processingCount]);

  const uploadOne = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError(`${file.name} is not a PDF.`);
        return;
      }
      if (file.size > MAX_PDF_BYTES) {
        setError(`${file.name} is larger than 20 MB.`);
        return;
      }

      const tempId = crypto.randomUUID();
      setUploads((u) => [...u, { tempId, name: file.name, progress: 0 }]);

      try {
        // 1. Browser → Vercel Blob (our /api/upload route only issues the token)
        const safeName = file.name.replace(/[^\w.-]+/g, "-");
        const blob = await upload(`${userId}/${safeName}`, file, {
          access: "private",
          handleUploadUrl: "/api/upload",
          contentType: "application/pdf",
          multipart: file.size > 5 * 1024 * 1024,
          onUploadProgress: ({ percentage }) =>
            setUploads((u) => u.map((x) => (x.tempId === tempId ? { ...x, progress: percentage } : x))),
        });

        // 2. Tell our server about it; it starts processing in the background
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url, name: file.name, size: file.size }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not save the document");
        setDocuments((d) => [data as DocumentSummary, ...d]);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Uploading ${file.name} failed.`);
      } finally {
        setUploads((u) => u.filter((x) => x.tempId !== tempId));
      }
    },
    [userId],
  );

  const uploadFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      Array.from(files).forEach((f) => void uploadOne(f));
    },
    [uploadOne],
  );

  const removeDocument = useCallback(async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) setDocuments((d) => d.filter((x) => x.id !== id));
    else setError("Could not delete the document.");
  }, []);

  return (
    <DocumentsContext.Provider
      value={{
        documents,
        uploads,
        readyCount,
        processingCount,
        error,
        clearError: () => setError(null),
        uploadFiles,
        removeDocument,
      }}
    >
      {children}
    </DocumentsContext.Provider>
  );
}
