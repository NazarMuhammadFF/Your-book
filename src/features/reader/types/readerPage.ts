import { MockDocumentBlock } from "../../books/mock/mockBooks";

export interface ReaderPageData {
  id: string;
  pageNumber: number;
  runningTitle: string;
  chapterNumber?: string;
  title?: string;
  subtitle?: string;
  blocks: MockDocumentBlock[];
  kind?: "content" | "end";
}
