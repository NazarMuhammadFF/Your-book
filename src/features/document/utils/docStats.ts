import { JSONContent } from "@tiptap/react";
import { DocumentStats } from "../types/document";

export function extractTextFromContent(node?: JSONContent | null): string {
  if (!node) return "";
  if (node.text) return node.text;
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((child) => extractTextFromContent(child)).join(" ");
  }
  return "";
}

export function calculateDocumentStats(content?: JSONContent | null, pageCount = 1): DocumentStats {
  if (!content) {
    return {
      wordCount: 0,
      charCount: 0,
      paragraphCount: 0,
      pageCount: 1,
      readingTimeMinutes: 1,
    };
  }

  const rawText = extractTextFromContent(content).trim();
  const words = rawText ? rawText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = rawText.replace(/\s+/g, "").length;

  let paragraphCount = 0;
  if (content.content && Array.isArray(content.content)) {
    paragraphCount = content.content.filter(
      (node) => node.type === "paragraph" || node.type?.includes("heading")
    ).length;
  }

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return {
    wordCount,
    charCount,
    paragraphCount,
    pageCount: Math.max(1, pageCount),
    readingTimeMinutes,
  };
}
