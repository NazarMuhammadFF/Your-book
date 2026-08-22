import React from "react";
import styles from "./DocumentViewPlaceholder.module.css";
import { Book } from "../../books/types/book";
import { MOCK_DOCUMENT_CONTENT, MockDocumentChapter } from "../../books/mock/mockBooks";
import { DocumentPage } from "./DocumentPage";

export interface DocumentViewPlaceholderProps {
  book: Book;
}

export const DocumentViewPlaceholder: React.FC<DocumentViewPlaceholderProps> = ({ book }) => {
  const chapters: MockDocumentChapter[] = MOCK_DOCUMENT_CONTENT.default;
  const chapterOne = chapters[0];
  const chapterTwo = chapters[1] || chapters[0];

  return (
    <div className={styles.container}>
      {/* Centered A4 Print Workspace Spread */}
      <div className={styles.a4WorkspaceSpread}>
        {/* Page 1 (Left A4 Print Page) */}
        <DocumentPage
          pageNumber={1}
          headerTitle={book.title}
          typography={book.typography}
          pageSettings={book.pageSettings}
          className={styles.pageCard}
        >
          {/* Master Document Header on Page 1 */}
          <div className={styles.docHeader}>
            <div className={styles.docTypeTag}>Draft Document</div>
            <h1 className={styles.docTitle}>{book.title}</h1>
            {book.subtitle && <p className={styles.docSubtitle}>{book.subtitle}</p>}
            <div className={styles.headerRule} />
          </div>

          {/* Chapter I Content Flow */}
          {chapterOne && (
            <section className={styles.chapterSection}>
              {chapterOne.chapterNumber && (
                <div className={styles.chapterNumber}>{chapterOne.chapterNumber}</div>
              )}
              <h2 className={styles.chapterTitle}>{chapterOne.title}</h2>

              <div className={styles.chapterBlocks}>
                {chapterOne.content.slice(0, 3).map((block, idx) => {
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
                  return null;
                })}
              </div>
            </section>
          )}
        </DocumentPage>

        {/* Page 2 (Right A4 Print Page) */}
        <DocumentPage
          pageNumber={2}
          headerTitle={chapterTwo?.title || book.title}
          typography={book.typography}
          pageSettings={book.pageSettings}
          className={styles.pageCard}
        >
          {/* Chapter II Content Flow */}
          {chapterTwo && (
            <section className={styles.chapterSection}>
              {chapterTwo.chapterNumber && (
                <div className={styles.chapterNumber}>{chapterTwo.chapterNumber}</div>
              )}
              <h2 className={styles.chapterTitle}>{chapterTwo.title}</h2>
              {chapterTwo.subtitle && (
                <p className={styles.chapterSubtitle}>{chapterTwo.subtitle}</p>
              )}

              <div className={styles.chapterBlocks}>
                {chapterTwo.content.map((block, idx) => {
                  if (block.type === "paragraph") {
                    return (
                      <p key={idx} className={styles.paragraph}>
                        {block.text}
                      </p>
                    );
                  }
                  return null;
                })}

                {/* Structured List Blocks */}
                {chapterOne?.content.find((b) => b.type === "list")?.items && (
                  <ul className={styles.bulletList}>
                    {chapterOne.content
                      .find((b) => b.type === "list")
                      ?.items?.map((item, itemIdx) => (
                        <li key={itemIdx} className={styles.listItem}>
                          {item}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* Interactive Writing Area Placeholder Prompt */}
          <div className={styles.editorPlaceholderPrompt}>
            <span className={styles.promptCursor}>|</span>
            <span className={styles.promptText}>
              A4 Print Layout Workspace • Ready for continuous drafting
            </span>
          </div>
        </DocumentPage>
      </div>

      {/* Workspace Status Tag */}
      <div className={styles.workspaceStatusBar}>
        <span>A4 Print Layout (210 × 297 mm) • 2 Pages</span>
      </div>
    </div>
  );
};
