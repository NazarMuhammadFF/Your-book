import React from "react";
import styles from "./BookViewPlaceholder.module.css";
import { Book } from "../../books/types/book";
import { JSONContent } from "@tiptap/react";
import { COVER_PALETTES } from "../../../design/typography";
import { BookFlipView } from "../../reader/components/BookFlipView";

export interface BookViewPlaceholderProps {
  book: Book;
  content: JSONContent;
  pageIndex: number;
  onPageIndexChange: (pageIndex: number) => void;
}

export const BookViewPlaceholder: React.FC<BookViewPlaceholderProps> = ({
  book,
  content,
  pageIndex,
  onPageIndexChange,
}) => {
  const palette =
    COVER_PALETTES.find((p) => p.id === book.cover.paletteId) || COVER_PALETTES[0];

  return (
    <div
      className={styles.container}
      style={{ "--reader-cover-trim": palette.primary } as React.CSSProperties}
    >
      <BookFlipView
        book={book}
        content={content}
        pageIndex={pageIndex}
        onPageIndexChange={onPageIndexChange}
      />
    </div>
  );
};
