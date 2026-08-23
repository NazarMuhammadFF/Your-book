import { JSONContent } from "@tiptap/react";

export interface ImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  width?: number | string; // e.g. "100%", "75%", "50%", "300px"
  align?: "left" | "center" | "right" | "full";
}

export interface DocumentStats {
  wordCount: number;
  charCount: number;
  paragraphCount: number;
  pageCount: number;
  readingTimeMinutes: number;
}

export interface PaginatedPage {
  pageNumber: number;
  nodes: JSONContent[];
  wordCount: number;
  charCount: number;
  hasContent: boolean;
}

export interface BookDocument {
  id: string;
  bookId: string;
  title: string;
  content: JSONContent;
  updatedAt: string;
}

export interface EditorSaveState {
  status: "saved" | "saving" | "unsaved";
  lastSavedAt: string | null;
}
