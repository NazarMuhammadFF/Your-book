import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import styles from "./WorkspacePage.module.css";
import { Book } from "../../books/types/book";
import { WorkspaceViewMode } from "../../../types/navigation";
import { WorkspaceHeader } from "../components/WorkspaceHeader";
import { DocumentViewPlaceholder } from "../components/DocumentViewPlaceholder";
import { BookViewPlaceholder } from "../components/BookViewPlaceholder";
import { BookSettingsModal } from "../../books/components/CreateBookModal";
import { transitions } from "../../../design/motion";

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
              <DocumentViewPlaceholder book={book} />
            </motion.div>
          ) : (
            <motion.div
              key="book-view"
              className={styles.viewPane}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={transitions.fast}
            >
              <BookViewPlaceholder
                book={book}
                pageIndex={readerPageIndex}
                onPageIndexChange={setReaderPageIndex}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Book Settings Modal */}
      {isSettingsOpen && (
        <BookSettingsModal
          isOpen={isSettingsOpen}
          initialBook={book}
          onClose={() => setIsSettingsOpen(false)}
          onSaveBook={(updatedBook) => {
            onUpdateBook?.(updatedBook);
            setIsSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
};
