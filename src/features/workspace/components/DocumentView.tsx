import React, { useState, useMemo } from "react";
import { EditorContent, JSONContent } from "@tiptap/react";
import { Book, BookTypography, getBookPageMetrics, getBookPageMargins } from "../../books/types/book";
import { useBookEditor } from "../../document/hooks/useBookEditor";
import { EditorToolbar } from "../../document/components/EditorToolbar";
import { EditorBubbleMenu } from "../../document/components/EditorBubbleMenu";
import { SlashCommandMenu } from "../../document/components/SlashCommandMenu";
import { ImageInsertDialog } from "../../document/components/ImageInsertDialog";
import { calculateDocumentStats } from "../../document/utils/docStats";
import { FONT_FAMILIES } from "../../../design/typography";
import styles from "./DocumentView.module.css";

export interface DocumentViewProps {
  book: Book;
  content: JSONContent;
  onUpdateContent: (content: JSONContent) => void;
  onUpdateTypography: (newTypography: BookTypography) => void;
}

export const DocumentView: React.FC<DocumentViewProps> = ({
  book,
  content,
  onUpdateContent,
  onUpdateTypography,
}) => {
  const [layoutMode, setLayoutMode] = useState<"vertical" | "spread">("vertical");
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("Just now");
  const [pageCount, setPageCount] = useState<number>(() => {
    if (content.content && Array.isArray(content.content)) {
      const pages = content.content.filter((n) => n.type === "page");
      return Math.max(1, pages.length);
    }
    return 1;
  });

  const pageMetrics = useMemo(() => getBookPageMetrics(book), [book]);
  const margins = useMemo(() => getBookPageMargins(book), [book]);
  const typography = book.typography;

  const fontConfig =
    FONT_FAMILIES.find((f) => f.id === typography.fontFamilyId) || FONT_FAMILIES[0];

  const editor = useBookEditor({
    content,
    book,
    editable: true,
    onUpdate: (newJson) => {
      onUpdateContent(newJson);
      setLastSaved("Just now");
      if (newJson.content && Array.isArray(newJson.content)) {
        const pages = newJson.content.filter((n) => n.type === "page");
        setPageCount(Math.max(1, pages.length));
      }
    },
    onPageCountChange: (count) => {
      setPageCount(Math.max(1, count));
    },
  });

  const stats = useMemo(
    () => calculateDocumentStats(content, pageCount),
    [content, pageCount]
  );

  const handleInsertImage = (options: {
    src: string;
    alt?: string;
    caption?: string;
    align?: "left" | "center" | "right" | "full";
    wrapMode?: "inline" | "wrap-left" | "wrap-right" | "break-text";
    width: string;
  }) => {
    if (editor) {
      editor.chain().focus().setCustomImage(options).run();
    }
  };

  return (
    <div
      className={`${styles.container} ${layoutMode === "spread" ? styles.spreadContainer : ""}`}
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
          "--doc-font-size": `${typography.fontSize || 15.5}px`,
          "--doc-line-height": `${typography.lineHeight || 1.60}`,
          "--doc-p-spacing": `${typography.paragraphSpacing || 12}px`,
          "--doc-text-align": typography.textAlignment || "left",
        } as React.CSSProperties
      }
    >
      {/* Top Floating Formatting Toolbar */}
      <div className={styles.toolbarContainer}>
        <EditorToolbar
          editor={editor}
          book={book}
          layoutMode={layoutMode}
          onToggleLayoutMode={() =>
            setLayoutMode((m) => (m === "vertical" ? "spread" : "vertical"))
          }
          onUpdateTypography={onUpdateTypography}
          onOpenImageDialog={() => setIsImageDialogOpen(true)}
        />
      </div>

      {/* Real Single Paginated ProseMirror Editor View */}
      <div className={styles.editorHost}>
        <EditorBubbleMenu editor={editor} />
        <SlashCommandMenu
          editor={editor}
          onOpenImageDialog={() => setIsImageDialogOpen(true)}
        />
        <EditorContent editor={editor} />
      </div>

      {/* Status Bar */}
      <footer className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.badge}>{pageMetrics.presetLabel}</span>
          <span className={styles.dimDot}>•</span>
          <span>
            {pageMetrics.width} × {pageMetrics.height} mm
          </span>
          <span className={styles.dimDot}>•</span>
          <span>
            {pageCount} {pageCount === 1 ? "page" : "pages"}
          </span>
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
