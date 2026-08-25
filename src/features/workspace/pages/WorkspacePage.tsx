import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import styles from "./WorkspacePage.module.css";
import { Book, BookTypography } from "../../books/types/book";
import { WorkspaceViewMode } from "../../../types/navigation";
import { WorkspaceHeader } from "../components/WorkspaceHeader";
import { DocumentView } from "../components/DocumentView";
import { PDFDocumentViewer } from "../../reader/components/PDFDocumentViewer";
import { BookViewPlaceholder } from "../components/BookViewPlaceholder";
import { BookSettingsModal } from "../../books/components/CreateBookModal";
import { transitions } from "../../../design/motion";
import { JSONContent } from "@tiptap/react";
import { createEmptyDocumentContent } from "../../document/utils/initialContent";

export interface WorkspacePageProps {
  book: Book;
  onBackToLibrary: () => void;
  onUpdateBook?: (book: Book) => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  book,
  onBackToLibrary,
  onUpdateBook,
}) => {
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>("document");
  const [readerPageIndex, setReaderPageIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Shared Canonical Document State
  const [documentContent, setDocumentContent] = useState<JSONContent>(() => {
    return book.content || createEmptyDocumentContent();
  });

  // Sync if another book is opened
  useEffect(() => {
    setDocumentContent(book.content || createEmptyDocumentContent());
  }, [book.id]);

  const handleUpdateContent = (newContent: JSONContent) => {
    setDocumentContent(newContent);
    onUpdateBook?.({
      ...book,
      content: newContent,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateTypography = (newTypography: BookTypography) => {
    onUpdateBook?.({
      ...book,
      typography: newTypography,
      pageSettings: {
        ...book.pageSettings,
        margins: newTypography.margins || book.pageSettings?.margins,
      },
      content: documentContent,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className={styles.workspaceContainer}>
      {/* Workspace App Bar */}
      <WorkspaceHeader
        book={book}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onBackToLibrary={onBackToLibrary}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace Stage */}
      <main className={styles.workspaceStage}>
        <AnimatePresence mode="wait">
          {viewMode === "document" ? (
            <motion.div
              key="doc-view"
              className={styles.viewPane}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={transitions.fast}
            >
              {book.format === "pdf" ? (
                <PDFDocumentViewer book={book} />
              ) : (
                <DocumentView
                  book={book}
                  content={documentContent}
                  onUpdateContent={handleUpdateContent}
                  onUpdateTypography={handleUpdateTypography}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="book-view"
              className={styles.viewPane}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitions.fast}
            >
              <BookViewPlaceholder
                book={book}
                content={documentContent}
                pageIndex={readerPageIndex}
                onPageIndexChange={setReaderPageIndex}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Book Physical Settings Modal */}
      {isSettingsOpen && (
        <BookSettingsModal
          isOpen={isSettingsOpen}
          initialBook={book}
          onClose={() => setIsSettingsOpen(false)}
          onSaveBook={(updatedBook) => {
            onUpdateBook?.({
              ...updatedBook,
              content: documentContent,
            });
            setIsSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
};
