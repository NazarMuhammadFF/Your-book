import React from "react";
import { Book } from "../../books/types/book";
import { FONT_FAMILIES } from "../../../design/typography";
import { ReaderPageData } from "../types/readerPage";
import styles from "./ReaderPage.module.css";

export interface ReaderPageProps {
  book: Book;
  page: ReaderPageData;
}

export const ReaderPage = React.forwardRef<HTMLDivElement, ReaderPageProps>(
  ({ book, page }, ref) => {
    const fontConfig =
      FONT_FAMILIES.find((font) => font.id === book.typography.fontFamilyId) ??
      FONT_FAMILIES[0];
    const marginClass = styles[book.pageSettings.pageMargin] ?? styles.normal;
    const sideClass = page.pageNumber % 2 === 0 ? styles.leftPage : styles.rightPage;

    return (
      <div
        ref={ref}
        className={`${styles.page} ${sideClass} ${marginClass}`}
        data-density="soft"
        style={
          {
            fontFamily: fontConfig.fontFamily,
            fontSize: `${book.typography.fontSize - 0.5}px`,
            lineHeight: book.typography.lineHeight,
            textAlign: book.typography.textAlignment,
            "--reader-paragraph-spacing": `${book.typography.paragraphSpacing}px`,
          } as React.CSSProperties
        }
      >
        <div className={styles.paperLight} aria-hidden="true" />
        <header className={styles.runningHeader}>{page.runningTitle}</header>

        <main className={styles.content}>
          {page.chapterNumber && (
            <div className={styles.chapterNumber}>{page.chapterNumber}</div>
          )}
          {page.title && <h2 className={styles.title}>{page.title}</h2>}
          {page.subtitle && <p className={styles.subtitle}>{page.subtitle}</p>}
          {page.title && <div className={styles.ornament}>◆</div>}

          {page.blocks.map((block, index) => {
            if (block.type === "quote") {
              return (
                <blockquote key={`${page.id}-block-${index}`} className={styles.quote}>
                  <p>{block.text}</p>
                  {block.author && <cite>{block.author}</cite>}
                </blockquote>
              );
            }

            if (block.type === "list") {
              return (
                <ul key={`${page.id}-block-${index}`} className={styles.list}>
                  {block.items?.map((item) => <li key={item}>{item}</li>)}
                </ul>
              );
            }

            if (block.type === "heading") {
              return <h3 key={`${page.id}-block-${index}`}>{block.text}</h3>;
            }

            return (
              <p key={`${page.id}-block-${index}`} className={styles.paragraph}>
                {block.text}
              </p>
            );
          })}

          {page.kind === "end" && (
            <p className={styles.endNote}>
              This final leaf closes the interaction prototype without adding new document
              content.
            </p>
          )}
        </main>

        {book.pageSettings.showPageNumbers && (
          <footer className={styles.footer}>{page.pageNumber}</footer>
        )}
      </div>
    );
  },
);

ReaderPage.displayName = "ReaderPage";
