import React, { useMemo } from "react";
import styles from "./BookViewPlaceholder.module.css";
import { Book } from "../../books/types/book";
import { MOCK_DOCUMENT_CONTENT } from "../../books/mock/mockBooks";
import { COVER_PALETTES } from "../../../design/typography";
import { createPrototypeReaderPages } from "../../reader/prototype/createPrototypeReaderPages";
import { BookFlipView } from "../../reader/components/BookFlipView";

export interface BookViewPlaceholderProps {
  book: Book;
  pageIndex: number;
  onPageIndexChange: (pageIndex: number) => void;
}

export const BookViewPlaceholder: React.FC<BookViewPlaceholderProps> = ({
  book,
  pageIndex,
  onPageIndexChange,
}) => {
  const pages = useMemo(
    () => createPrototypeReaderPages(MOCK_DOCUMENT_CONTENT.default),
    [],
  );
  const palette =
    COVER_PALETTES.find((p) => p.id === book.cover.paletteId) || COVER_PALETTES[0];

  return (
    <div
      className={styles.container}
      style={{ "--reader-cover-trim": palette.primary } as React.CSSProperties}
    >
      <BookFlipView
        book={book}
        pages={pages}
        pageIndex={pageIndex}
        onPageIndexChange={onPageIndexChange}
      />
    </div>
  );
};
