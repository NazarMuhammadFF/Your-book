import React, { useState, useMemo, useEffect } from "react";
import { Book, getBookPageMetrics } from "../../books/types/book";
import { JSONContent, EditorContent } from "@tiptap/react";
import { useBookEditor } from "../../document/hooks/useBookEditor";
import { EditorToolbar } from "../../document/components/EditorToolbar";
import { ImageInsertDialog } from "../../document/components/ImageInsertDialog";
import { ImageContextMenu } from "../../document/components/ImageContextMenu";
import { PageCanvas } from "../../document/components/PageCanvas";
import { FONT_FAMILIES } from "../../../design/typography";
import { calculateDocumentStats } from "../../document/utils/docStats";
import {
  computePaginationBreakPositions,
  computePaginationMetrics,
  paginateDocument,
} from "../../document/utils/pagination";
import "../../document/styles/editor.css";
import styles from "./DocumentView.module.css";

export interface DocumentViewProps {
  book: Book;
  content: JSONContent;
  onUpdateContent: (content: JSONContent) => void;
}

export const DocumentView: React.FC<DocumentViewProps> = ({
  book,
  content,
  onUpdateContent,
}) => {
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("Just now");
  const [measuredPageCount, setMeasuredPageCount] = useState(0);
  const pageMetrics = useMemo(() => getBookPageMetrics(book), [book]);
  const paginationMetrics = useMemo(() => computePaginationMetrics(book), [book]);
  const fontFamily = useMemo(
    () => FONT_FAMILIES.find((font) => font.id === book.typography.fontFamilyId)
      ?.fontFamily ?? FONT_FAMILIES[0].fontFamily,
    [book.typography.fontFamilyId]
  );

  const editor = useBookEditor({
    content,
    book,
    editable: true,
    onUpdate: (newContent) => {
      onUpdateContent(newContent);
      setLastSaved("Just now");
    },
    onPageCountChange: setMeasuredPageCount,
  });

  useEffect(() => {
    setMeasuredPageCount(0);
  }, [book.id, book.pageSettings.pageMargin, book.pageSettings.pageSizePreset]);

  // Sync content if changed externally (e.g. from Book View)
  useEffect(() => {
    if (editor && content && !editor.isFocused) {
      const currentJson = editor.getJSON();
      if (JSON.stringify(currentJson) !== JSON.stringify(content)) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, editor]);

  // Shared automatic pagination
  const paginatedPages = useMemo(
    () => paginateDocument(content, book),
    [content, book]
  );
  const estimatedPageCount = useMemo(
    () => Math.max(
      paginatedPages.length,
      computePaginationBreakPositions(content, book).length + 1
    ),
    [book, content, paginatedPages.length]
  );
  const pageCount = measuredPageCount || estimatedPageCount;

  const stats = useMemo(
    () => calculateDocumentStats(content, pageCount),
    [content, pageCount]
  );

  const handleInsertImage = (options: {
    src: string;
    alt?: string;
    caption?: string;
    align: "left" | "center" | "right" | "full";
    width: string;
  }) => {
    if (editor) {
      editor.chain().focus().setCustomImage(options).run();
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Floating Formatting Toolbar */}
      <div className={styles.toolbarContainer}>
        <EditorToolbar
          editor={editor}
          onOpenImageDialog={() => setIsImageDialogOpen(true)}
        />
        {editor && editor.isActive("image") && (
          <div className={styles.contextMenuWrapper}>
            <ImageContextMenu editor={editor} />
          </div>
        )}
      </div>

      {/* One canonical editor flowing across fixed-size page sheets. */}
      <div
        className={styles.multiPageContainer}
        style={{
          maxWidth: `${pageMetrics.pageWidth}px`,
        }}
      >
        <div
          className={styles.pagedEditor}
          style={
            {
              height: `${pageCount * pageMetrics.pageHeight + (pageCount - 1) * 40}px`,
              "--editor-page-width": `${pageMetrics.pageWidth}px`,
              "--editor-page-height": `${pageMetrics.pageHeight}px`,
              "--editor-content-top": `${paginationMetrics.contentTop}px`,
              "--editor-content-horizontal": `${
                (pageMetrics.pageWidth - paginationMetrics.availableWidth) / 2
              }px`,
              "--doc-p-spacing": `${book.typography.paragraphSpacing}px`,
              fontFamily,
              fontSize: `${book.typography.fontSize}px`,
              lineHeight: book.typography.lineHeight,
              textAlign: book.typography.textAlignment,
              color: "var(--paper-text, #2a2723)",
            } as React.CSSProperties
          }
        >
          <div className={styles.pageStack} aria-hidden="true">
            {Array.from({ length: pageCount }, (_, index) => (
              <PageCanvas
                key={`document-sheet-${index + 1}`}
                book={book}
                pageNumber={index + 1}
                totalPages={pageCount}
                runningTitle={book.title}
                className={styles.canvasCard}
              />
            ))}
          </div>
          <div className={styles.editorHost}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.badge}>{pageMetrics.presetLabel}</span>
          <span className={styles.dimDot}>•</span>
          <span>{pageMetrics.width} × {pageMetrics.height} mm</span>
          <span className={styles.dimDot}>•</span>
          <span>{pageCount} {pageCount === 1 ? "page" : "pages"}</span>
        </div>

        <div className={styles.statusRight}>
          <span>{stats.wordCount} words</span>
          <span className={styles.dimDot}>•</span>
          <span>{stats.charCount} characters</span>
          <span className={styles.dimDot}>•</span>
          <span>~{stats.readingTimeMinutes} min read</span>
          <span className={styles.dimDot}>•</span>
          <span className={styles.savedStatus}>Saved ({lastSaved})</span>
        </div>
      </footer>

      {/* Image Insert Dialog */}
      <ImageInsertDialog
        isOpen={isImageDialogOpen}
        onClose={() => setIsImageDialogOpen(false)}
        onInsertImage={handleInsertImage}
      />
    </div>
  );
};
