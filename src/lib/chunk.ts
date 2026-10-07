export type PageChunk = { pageNumber: number; content: string };

// Splits each page into ~1000-character pieces with a 200-character overlap.
// Chunking per page means every chunk knows which page it came from,
// so answers can cite "p.4".
export function chunkPages(pages: string[], size = 1000, overlap = 200): PageChunk[] {
  const result: PageChunk[] = [];

  pages.forEach((pageText, i) => {
    const text = pageText.replace(/\s+/g, " ").trim();
    if (text.length < 20) return; // skip blank or near-empty pages

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + size, text.length);
      if (end < text.length) {
        // prefer ending at a sentence, then at a word
        const sentenceEnd = text.lastIndexOf(". ", end);
        const space = text.lastIndexOf(" ", end);
        if (sentenceEnd > start + size / 2) end = sentenceEnd + 1;
        else if (space > start) end = space;
      }
      result.push({ pageNumber: i + 1, content: text.slice(start, end).trim() });
      if (end >= text.length) break;
      start = end - overlap > start ? end - overlap : end; // always move forward
    }
  });

  return result;
}
