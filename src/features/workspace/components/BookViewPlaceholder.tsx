import React from "react";
import styles from "./BookViewPlaceholder.module.css";
import { Book } from "../../books/types/book";
import { JSONContent } from "@tiptap/react";
import { resolveCoverPalette } from "../../../design/typography";
import { BookFlipView } from "../../reader/components/BookFlipView";
import { PDFBookFlipViewer } from "../../reader/components/PDFBookFlipViewer";

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
  const palette = resolveCoverPalette(book.cover.paletteId);

  return (
    <div
      className={styles.container}
      style={{ "--reader-cover-trim": palette.primary } as React.CSSProperties}
    >
      {book.format === "pdf" ? (
        <PDFBookFlipViewer
          book={book}
          pageIndex={pageIndex}
          onPageIndexChange={onPageIndexChange}
        />
      ) : (
        <BookFlipView
          book={book}
          content={content}
          pageIndex={pageIndex}
          onPageIndexChange={onPageIndexChange}
        />
      )}
    </div>
  );
};

