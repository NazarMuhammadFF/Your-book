import React from "react";
import styles from "./DocumentViewPlaceholder.module.css";
import { Book } from "../../books/types/book";
import { MOCK_DOCUMENT_CONTENT, MockDocumentChapter } from "../../books/mock/mockBooks";
import { FONT_FAMILIES } from "../../../design/typography";

export interface DocumentViewPlaceholderProps {
  book: Book;
}

export const DocumentViewPlaceholder: React.FC<DocumentViewPlaceholderProps> = ({ book }) => {
  const chapters: MockDocumentChapter[] = MOCK_DOCUMENT_CONTENT.default;
  const fontConfig =
    FONT_FAMILIES.find((f) => f.id === book.typography.fontFamilyId) || FONT_FAMILIES[0];

  return (
    <div className={styles.container}>
      <article
        className={styles.documentSheet}
        style={
          {
            fontFamily: fontConfig.fontFamily,
            fontSize: `${book.typography.fontSize}px`,
            lineHeight: book.typography.lineHeight,
            textAlign: book.typography.textAlignment,
            "--doc-p-spacing": `${book.typography.paragraphSpacing}px`,
          } as React.CSSProperties
        }
      >
        {/* Document Master Title Header */}
        <header className={styles.docHeader}>
          <div className={styles.docTypeTag}>Continuous Document View</div>
          <h1 className={styles.docTitle}>{book.title}</h1>
          {book.subtitle && <p className={styles.docSubtitle}>{book.subtitle}</p>}
          <div className={styles.headerRule} />
        </header>

        {/* Chapters Content Flow */}
        <div className={styles.contentBody}>
          {chapters.map((ch) => (
            <section key={ch.id} className={styles.chapterSection}>
              {ch.chapterNumber && (
                <div className={styles.chapterNumber}>{ch.chapterNumber}</div>
              )}
              <h2 className={styles.chapterTitle}>{ch.title}</h2>
              {ch.subtitle && <p className={styles.chapterSubtitle}>{ch.subtitle}</p>}

              <div className={styles.chapterBlocks}>
                {ch.content.map((block, idx) => {
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
                        {block.author && <cite className={styles.quoteCite}>— {block.author}</cite>}
                      </blockquote>
                    );
                  }
                  if (block.type === "list" && block.items) {
                    return (
                      <ul key={idx} className={styles.bulletList}>
                        {block.items.map((item, itemIdx) => (
                          <li key={itemIdx} className={styles.listItem}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return null;
                })}
              </div>
            </section>
          ))}

          {/* Interactive Writing Area Placeholder Notice */}
          <div className={styles.editorPlaceholderPrompt}>
            <span className={styles.promptCursor}>|</span>
            <span className={styles.promptText}>
              Document editor (Tiptap & SQLite persistence) will be activated in Phase 2 & 3.
            </span>
          </div>
        </div>
      </article>
    </div>
  );
};
