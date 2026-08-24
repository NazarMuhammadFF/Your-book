import React from "react";
import { Book, getBookPageMetrics, getBookPageMargins } from "../../books/types/book";
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
    const margins = getBookPageMargins(book);
    const fontConfig =
      FONT_FAMILIES.find((font) => font.id === book.typography.fontFamilyId) ??
      FONT_FAMILIES[0];

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
        className={`${styles.pageCanvas} ${sideClass} ${gutterClass} ${isActive ? styles.activeCanvas : ""} ${className}`}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onMouseDown={onMouseDown}
        style={
          {
            "--page-width": `${pageMetrics.pageWidth}px`,
            "--page-height": `${pageMetrics.pageHeight}px`,
            "--page-pad-top": `${margins.top}px`,
            "--page-pad-bottom": `${margins.bottom}px`,
            "--page-pad-left": `${margins.left}px`,
            "--page-pad-right": `${margins.right}px`,
            "--page-pad-x": `${(margins.left + margins.right) / 2}px`,
            "--doc-font-family": fontConfig.fontFamily,
            "--doc-font-size": `${book.typography.fontSize || 15.5}px`,
            "--doc-line-height": `${book.typography.lineHeight || 1.60}`,
            "--doc-p-spacing": `${book.typography.paragraphSpacing || 12}px`,
            "--doc-text-align": book.typography.textAlignment || "left",
            fontFamily: fontConfig.fontFamily,
            fontSize: `${book.typography.fontSize || 15.5}px`,
            lineHeight: `${book.typography.lineHeight || 1.60}`,
            textAlign: book.typography.textAlignment || "left",
            width: "100%",
            maxWidth: `${pageMetrics.pageWidth}px`,
            minHeight: `${pageMetrics.pageHeight}px`,
            maxHeight: `${pageMetrics.pageHeight}px`,
            height: `${pageMetrics.pageHeight}px`,
            padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
            ...style,
          } as React.CSSProperties
        }
      >
        {/* Tactile paper light sheen overlay */}
        <div className={styles.paperLight} aria-hidden="true" />

        {/* Running Header - absolutely positioned outside content flow */}
        <header
          className={styles.pageHeader}
          style={{
            left: `${margins.left}px`,
            right: `${margins.right}px`,
          }}
        >
          <span className={styles.headerText}>{runningTitle || book.title}</span>
        </header>

        {/* Page Content Body */}
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

        {/* Page Footer - absolutely positioned outside content flow */}
        {book.pageSettings?.showPageNumbers && !isEndCover && (
          <footer
            className={styles.pageFooter}
            style={{
              right: `${margins.right}px`,
            }}
          >
            <span className={styles.pageNumber}>
              {totalPages ? `Page ${pageNumber} of ${totalPages}` : `Page ${pageNumber}`}
            </span>
          </footer>
        )}
      </div>
    );
  }
);

PageCanvas.displayName = "PageCanvas";
