"use client";

import ReactMarkdown from "react-markdown";
import type { Source } from "@/lib/chat-events";

const fileUrl = (s: Source) => `/api/documents/${s.documentId}/file#page=${s.page}`;

// Renders the model's Markdown and turns citations like [2] into small
// clickable chips that open the PDF at the right page.
export function Answer({ content, sources }: { content: string; sources: Source[] | null }) {
  const withLinks = content.replace(/\[(\d{1,2})\](?!\()/g, "[$1](#cite-$1)");

  return (
    <div className="answer">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("#cite-")) {
              const n = Number(href.slice(6));
              const source = sources?.find((s) => s.n === n);
              if (!source) return <sup className="text-stone-400">[{n}]</sup>;
              return (
                <a
                  href={fileUrl(source)}
                  target="_blank"
                  rel="noreferrer"
                  title={`${source.documentName} · page ${source.page}`}
                  className="relative -top-px mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-emerald-100 px-1 align-middle text-[11px] leading-none font-semibold text-emerald-800 no-underline hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-200"
                >
                  {n}
                </a>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-emerald-700 underline dark:text-emerald-400">
                {children}
              </a>
            );
          },
        }}
      >
        {withLinks}
      </ReactMarkdown>
    </div>
  );
}

// The passages the answer actually cited, shown under the answer.
export function SourceList({ content, sources }: { content: string; sources: Source[] }) {
  const cited = new Set([...content.matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1])));
  const shown = sources.filter((s) => cited.has(s.n));
  if (shown.length === 0) return null;

  return (
    <details className="group mt-3">
      <summary className="cursor-pointer list-none text-xs font-medium text-stone-500 select-none hover:text-stone-800 dark:hover:text-stone-200">
        <span className="group-open:hidden">▸</span>
        <span className="hidden group-open:inline">▾</span> {shown.length} source{shown.length > 1 ? "s" : ""}
      </summary>
      <ul className="mt-2 grid gap-2">
        {shown.map((s) => (
          <li key={s.n}>
            <a
              href={fileUrl(s)}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-stone-200 bg-white p-3 text-xs hover:border-emerald-400 dark:border-stone-800 dark:bg-stone-900"
            >
              <p className="mb-1 font-medium">
                <span className="mr-1.5 inline-grid size-4 place-items-center rounded bg-emerald-100 text-[10px] text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  {s.n}
                </span>
                {s.documentName} · page {s.page}
              </p>
              <p className="line-clamp-3 text-stone-600 dark:text-stone-400">{s.snippet}</p>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
