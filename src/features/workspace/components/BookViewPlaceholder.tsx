import React from "react";
import styles from "./BookViewPlaceholder.module.css";
import { Book } from "../../books/types/book";
import { MOCK_DOCUMENT_CONTENT, MockDocumentChapter } from "../../books/mock/mockBooks";
import { FONT_FAMILIES } from "../../../design/typography";

export interface BookViewPlaceholderProps {
  book: Book;
}

export const BookViewPlaceholder: React.FC<BookViewPlaceholderProps> = ({ book }) => {
  const chapters: MockDocumentChapter[] = MOCK_DOCUMENT_CONTENT.default;
  const fontConfig =
    FONT_FAMILIES.find((f) => f.id === book.typography.fontFamilyId) || FONT_FAMILIES[0];

  const leftChapter = chapters[0];
  const rightChapter = chapters[1] || chapters[0];

  const marginClass = styles[book.pageSettings.pageMargin] || styles.normal;

  return (
    <div className={styles.container}>
      {/* The Open Two-Page Physical Book Spread */}
      <div className={styles.bookSpread}>
        {/* Left Page Edge Stack Depth */}
        <div className={styles.leftPageStack} />

        {/* Left Page Leaf */}
        <div
          className={`${styles.pageLeaf} ${styles.leftPage} ${marginClass}`}
          style={
            {
              fontFamily: fontConfig.fontFamily,
              fontSize: `${book.typography.fontSize - 0.5}px`,
              lineHeight: book.typography.lineHeight,
              textAlign: book.typography.textAlignment,
            } as React.CSSProperties
          }
        >
          {/* Subtle Gutter Crease Shadow (Right side of Left Page) */}
          <div className={styles.leftGutterShadow} />

          {/* Running Header */}
          <div className={styles.runningHeader}>
            <span className={styles.runningTitle}>{book.title}</span>
          </div>

          {/* Left Page Content */}
          <div className={styles.pageContent}>
            {leftChapter && (
              <>
                <div className={styles.chapterNumber}>{leftChapter.chapterNumber}</div>
                <h2 className={styles.chapterTitle}>{leftChapter.title}</h2>
                <div className={styles.chapterOrnament}>❖</div>

                {leftChapter.content.slice(0, 3).map((block, idx) => {
                  if (block.type === "paragraph") {
                    return (
                      <p key={idx} className={styles.paragraph}>
                        {block.text}
                      </p>
                    );
                  }
                  if (block.type === "quote") {
                    return (
                      <blockquote key={idx} className={styles.blockquote}>
                        <p className={styles.quoteText}>{block.text}</p>
                      </blockquote>
                    );
                  }
                  return null;
                })}
              </>
            )}
          </div>

          {/* Left Page Number */}
          {book.pageSettings.showPageNumbers && (
            <div className={styles.pageFooter}>
              <span className={styles.pageNumber}>1</span>
            </div>
          )}
        </div>

        {/* Center Spine Stitch / Crease Line */}
        <div className={styles.centerGutterStitch} />

        {/* Right Page Leaf */}
        <div
          className={`${styles.pageLeaf} ${styles.rightPage} ${marginClass}`}
          style={
            {
              fontFamily: fontConfig.fontFamily,
              fontSize: `${book.typography.fontSize - 0.5}px`,
              lineHeight: book.typography.lineHeight,
              textAlign: book.typography.textAlignment,
            } as React.CSSProperties
          }
        >
          {/* Subtle Gutter Crease Shadow (Left side of Right Page) */}
          <div className={styles.rightGutterShadow} />

          {/* Running Header */}
          <div className={styles.runningHeader}>
            <span className={styles.runningTitle}>{rightChapter?.title || book.title}</span>
          </div>

          {/* Right Page Content */}
          <div className={styles.pageContent}>
            {rightChapter && (
              <>
                <div className={styles.chapterNumber}>{rightChapter.chapterNumber}</div>
                <h2 className={styles.chapterTitle}>{rightChapter.title}</h2>
                <div className={styles.chapterOrnament}>❖</div>

                {rightChapter.content.map((block, idx) => {
                  if (block.type === "paragraph") {
                    return (
                      <p key={idx} className={styles.paragraph}>
                        {block.text}
                      </p>
                    );
                  }
                  return null;
                })}

                {/* Simulated remaining list */}
                {leftChapter?.content.find((b) => b.type === "list")?.items && (
                  <ul className={styles.bulletList}>
                    {leftChapter.content
                      .find((b) => b.type === "list")
                      ?.items?.map((it, i) => (
                        <li key={i} className={styles.listItem}>
                          {it}
                        </li>
                      ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Right Page Number */}
          {book.pageSettings.showPageNumbers && (
            <div className={`${styles.pageFooter} ${styles.rightFooter}`}>
              <span className={styles.pageNumber}>2</span>
            </div>
          )}
        </div>

        {/* Right Page Edge Stack Depth */}
        <div className={styles.rightPageStack} />
      </div>

      {/* Page Flip & Pagination Adapter Notice */}
      <div className={styles.bookViewBanner}>
        <span>
          Book View Spread Preview • Dedicated Pagination & Flip Adapter active in Phase 5 & 6.
        </span>
      </div>
    </div>
  );
};
