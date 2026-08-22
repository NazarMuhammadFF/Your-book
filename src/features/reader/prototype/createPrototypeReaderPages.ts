import { MockDocumentChapter } from "../../books/mock/mockBooks";
import { ReaderPageData } from "../types/readerPage";

/**
 * Creates fixed prototype leaves from shared mock content. This is deliberately not
 * pagination: each source block is assigned to one deterministic test page.
 */
export function createPrototypeReaderPages(
  chapters: MockDocumentChapter[],
): ReaderPageData[] {
  const pages: ReaderPageData[] = chapters.flatMap((chapter) =>
    chapter.content.map((block, blockIndex) => ({
      id: `${chapter.id}-page-${blockIndex + 1}`,
      pageNumber: 0,
      runningTitle: chapter.title,
      chapterNumber: blockIndex === 0 ? chapter.chapterNumber : undefined,
      title: blockIndex === 0 ? chapter.title : undefined,
      subtitle: blockIndex === 0 ? chapter.subtitle : undefined,
      blocks: [block],
    })),
  );

  if (pages.length % 2 !== 0) {
    pages.push({
      id: "prototype-end-leaf",
      pageNumber: 0,
      runningTitle: "End Notes",
      title: "A quiet place to continue",
      blocks: [],
      kind: "end",
    });
  }

  return pages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
}
