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

  // Global zoom state for both Document View and Book View
  const [documentZoom, setDocumentZoom] = useState<number>(() => {
    const saved = localStorage.getItem('booknote_document_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [bookViewZoom, setBookViewZoom] = useState<number>(() => {
    const saved = localStorage.getItem('booknote_bookview_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  // Sync if another book is opened
  useEffect(() => {
    setDocumentContent(book.content || createEmptyDocumentContent());
  }, [book.id]);

  // Save zoom to localStorage on change
  useEffect(() => {
    localStorage.setItem('booknote_document_zoom', String(documentZoom));
  }, [documentZoom]);

  useEffect(() => {
    localStorage.setItem('booknote_bookview_zoom', String(bookViewZoom));
  }, [bookViewZoom]);

  // Zoom constants
  const ZOOM_MIN = 0.6;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 0.2;

  // Document View zoom handlers
  const handleDocumentZoomIn = () => {
    setDocumentZoom(z => Math.min(ZOOM_MAX, Number((z + ZOOM_STEP).toFixed(1))));
  };

  const handleDocumentZoomOut = () => {
    setDocumentZoom(z => Math.max(ZOOM_MIN, Number((z - ZOOM_STEP).toFixed(1))));
  };

  const handleDocumentZoomReset = () => {
    setDocumentZoom(1.0);
  };

  // Book View zoom handlers
  const handleBookViewZoomIn = () => {
    setBookViewZoom(z => Math.min(ZOOM_MAX, Number((z + ZOOM_STEP).toFixed(1))));
  };

  const handleBookViewZoomOut = () => {
    setBookViewZoom(z => Math.max(ZOOM_MIN, Number((z - ZOOM_STEP).toFixed(1))));
  };

  const handleBookViewZoomReset = () => {
    setBookViewZoom(1.0);
  };

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          if (viewMode === 'document') {
            handleDocumentZoomIn();
          } else {
            handleBookViewZoomIn();
          }
        } else if (e.key === '-') {
          e.preventDefault();
          if (viewMode === 'document') {
            handleDocumentZoomOut();
          } else {
            handleBookViewZoomOut();
          }
        } else if (e.key === '0') {
          e.preventDefault();
          if (viewMode === 'document') {
            handleDocumentZoomReset();
          } else {
            handleBookViewZoomReset();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

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
                  zoom={documentZoom}
                  onZoomIn={handleDocumentZoomIn}
                  onZoomOut={handleDocumentZoomOut}
                  onZoomReset={handleDocumentZoomReset}
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
                zoom={bookViewZoom}
                onPageIndexChange={setReaderPageIndex}
                onZoomIn={handleBookViewZoomIn}
                onZoomOut={handleBookViewZoomOut}
                onZoomReset={handleBookViewZoomReset}
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
