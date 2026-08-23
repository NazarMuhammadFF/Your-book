import React from "react";
import { Book, getBookPageMetrics } from "../../books/types/book";
import { FONT_FAMILIES } from "../../../design/typography";
import { JSONContent } from "@tiptap/react";
import { renderNodeContent } from "../../reader/components/ReaderPage";
import styles from "./PageCanvas.module.css";
import "../styles/editor.css";

export interface PageCanvasProps {
  book: Book;
  pageNumber: number;
  totalPages?: number;
  nodes?: JSONContent[];
  runningTitle?: string;
  isEndCover?: boolean;
  isActive?: boolean;
  side?: "left" | "right" | "single";
  showGutterShadow?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const PageCanvas = React.forwardRef<HTMLDivElement, PageCanvasProps>(
  (
    {
      book,
      pageNumber,
      totalPages,
      nodes,
      runningTitle,
      isEndCover = false,
      isActive = false,
      side = "single",
      showGutterShadow = false,
      children,
      className = "",
      style,
      onClick,
      onPointerDown,
      onMouseDown,
    },
    ref
  ) => {
    const pageMetrics = getBookPageMetrics(book);
    const fontConfig =
      FONT_FAMILIES.find((font) => font.id === book.typography.fontFamilyId) ??
      FONT_FAMILIES[0];
    const marginClass = styles[book.pageSettings?.pageMargin || "normal"] ?? styles.normal;

    let sideClass = "";
    if (side === "left") sideClass = styles.leftPage;
    else if (side === "right") sideClass = styles.rightPage;

    const gutterClass = showGutterShadow
      ? side === "left"
        ? styles.gutterShadowLeft
        : styles.gutterShadowRight
      : "";

    return (
      <div
        ref={ref}
        className={`${styles.pageCanvas} ${marginClass} ${sideClass} ${gutterClass} ${isActive ? styles.activeCanvas : ""} ${className}`}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onMouseDown={onMouseDown}
        data-density="soft"
        style={
          {
            fontFamily: fontConfig.fontFamily,
            fontSize: `${book.typography.fontSize}px`,
            lineHeight: book.typography.lineHeight,
            textAlign: book.typography.textAlignment,
            "--doc-p-spacing": `${book.typography.paragraphSpacing}px`,
            width: "100%",
            maxWidth: `${pageMetrics.pageWidth}px`,
            minHeight: `${pageMetrics.pageHeight}px`,
            maxHeight: `${pageMetrics.pageHeight}px`,
            height: `${pageMetrics.pageHeight}px`,
            aspectRatio: `${pageMetrics.width} / ${pageMetrics.height}`,
            ...style,
          } as React.CSSProperties
        }
      >
        {/* Tactile paper light sheen overlay */}
        <div className={styles.paperLight} aria-hidden="true" />

        {/* Running Header */}
        <header className={styles.pageHeader}>
          <span className={styles.headerText}>{runningTitle || book.title}</span>
        </header>

        {/* Hard-bounded Page Content Body */}
        <main className={`${styles.pageContent} booknote-prose`}>
          {isEndCover ? (
            <p className={styles.endNote}>
              This concludes the notes for <em>{book.title}</em>.
            </p>
          ) : children ? (
            children
          ) : (
            nodes?.map((node, i) => renderNodeContent(node, i))
          )}
        </main>

        {/* Page Footer */}
        {book.pageSettings?.showPageNumbers && !isEndCover && (
          <footer className={styles.pageFooter}>
            <span className={styles.pageNumber}>
              {totalPages ? `Page ${pageNumber} of ${totalPages}` : pageNumber}
            </span>
          </footer>
        )}
      </div>
    );
  }
);

PageCanvas.displayName = "PageCanvas";
