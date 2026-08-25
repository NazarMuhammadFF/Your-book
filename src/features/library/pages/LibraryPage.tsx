import React, { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "./LibraryPage.module.css";
import { Book as IBook } from "../../books/types/book";
import { LibraryHeader } from "../components/LibraryHeader";
import { Bookshelf } from "../components/Bookshelf";
import { BookSettingsModal } from "../../books/components/CreateBookModal";
import { TrashBinWidget } from "../components/TrashBinWidget";
import { TrashDrawerModal } from "../components/TrashDrawerModal";

import { BookPlacement } from "../utils/shelfLayout";

export interface LibraryPageProps {
  books: IBook[];
  trashedBooks: IBook[];
  placements?: Record<string, BookPlacement>;
  onPlacementsChange?: (placements: Record<string, BookPlacement>) => void;
  onOpenBook: (book: IBook) => void;
  onCreateBook: (book: IBook) => void;
  onUpdateBook?: (book: IBook) => void;
  onReorderBooks?: (newBooks: IBook[]) => void;
  onMoveToTrash: (bookId: string) => void;
  onRestoreBook: (bookId: string) => void;
  onDeletePermanently: (bookId: string) => void;
  onEmptyTrash: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  books,
  trashedBooks,
  placements,
  onPlacementsChange,
  onOpenBook,
  onCreateBook,
  onUpdateBook,
  onReorderBooks,
  onMoveToTrash,
  onRestoreBook,
  onDeletePermanently,
  onEmptyTrash,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<IBook | null>(null);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isDragOverTrash, setIsDragOverTrash] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Books matching the search query, in shelf order. The shelf always shows ALL
  // books; matches are highlighted with a dashed outline instead of being filtered.
  const matchedBookIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return books
      .filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
          (b.cover.authorName && b.cover.authorName.toLowerCase().includes(q))
      )
      .map((b) => b.id);
  }, [books, searchQuery]);

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [searchQuery]);

  const safeMatchIndex =
    matchedBookIds.length > 0
      ? Math.min(activeMatchIndex, matchedBookIds.length - 1)
      : 0;

  // Smooth auto-scroll to the active matching book whenever the match or index changes.
  useEffect(() => {
    if (matchedBookIds.length === 0 || books.length === 0) return;
    const bookId = matchedBookIds[safeMatchIndex];
    const timer = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-book-id="${CSS.escape(bookId)}"]`
      );
      if (!el) return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [matchedBookIds, safeMatchIndex, books.length]);

  const highlightedBookIds = useMemo(() => new Set(matchedBookIds), [matchedBookIds]);

  const handleEditBook = (book: IBook) => {
    setEditingBook(book);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Top Library Header Bar */}
      <LibraryHeader
        bookCount={books.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewBookClick={() => {
          setEditingBook(null);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Match navigation pill: cycles through matching books across shelf rows */}
      {searchQuery.trim() && (
        <div className={styles.matchNav}>
          {matchedBookIds.length === 0 ? (
            <span className={styles.matchNavLabel}>
              No books matched "{searchQuery}"
            </span>
          ) : (
            <>
              <button
                type="button"
                className={styles.matchNavBtn}
                aria-label="Previous match"
                disabled={matchedBookIds.length < 2}
                onClick={() =>
                  setActiveMatchIndex(
                    (i) => (i - 1 + matchedBookIds.length) % matchedBookIds.length
                  )
                }
              >
                <ChevronUp size={14} />
              </button>
              <span className={styles.matchNavLabel}>
                {safeMatchIndex + 1} of {matchedBookIds.length}
              </span>
              <button
                type="button"
                className={styles.matchNavBtn}
                aria-label="Next match"
                disabled={matchedBookIds.length < 2}
                onClick={() =>
                  setActiveMatchIndex((i) => (i + 1) % matchedBookIds.length)
                }
              >
                <ChevronDown size={14} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Main Bookshelf Area — always shows every book; matches get dashed outline */}
      <main className={styles.shelfViewport}>
        {books.length > 0 ? (
          <Bookshelf
            books={books}
            highlightedBookIds={highlightedBookIds}
            placements={placements}
            onPlacementsChange={onPlacementsChange}
            onBookClick={onOpenBook}
            onAddNewClick={() => {
              setEditingBook(null);
              setIsCreateModalOpen(true);
            }}
            onEditBook={handleEditBook}
            onReorderBooks={onReorderBooks}
            onMoveToTrash={onMoveToTrash}
            isDragOverTrash={isDragOverTrash}
            onDragOverTrashChange={setIsDragOverTrash}
          />
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Your library is empty</p>
          </div>
        )}
      </main>

      {/* Always Visible Trash Bin Widget at Bottom-Right */}
      <TrashBinWidget
        trashedCount={trashedBooks.length}
        isDragOver={isDragOverTrash}
        onClick={() => setIsTrashModalOpen(true)}
      />

      {/* Trash Management Drawer Modal */}
      {isTrashModalOpen && (
        <TrashDrawerModal
          isOpen={isTrashModalOpen}
          trashedBooks={trashedBooks}
          onClose={() => setIsTrashModalOpen(false)}
          onRestore={onRestoreBook}
          onDeletePermanently={onDeletePermanently}
          onEmptyTrash={onEmptyTrash}
        />
      )}

      {/* Create / Edit Book Settings Modal */}
      {(isCreateModalOpen || editingBook) && (
        <BookSettingsModal
          isOpen={isCreateModalOpen || Boolean(editingBook)}
          initialBook={editingBook}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingBook(null);
          }}
          onSaveBook={(savedBook) => {
            if (editingBook) {
              onUpdateBook?.(savedBook);
            } else {
              onCreateBook(savedBook);
              onOpenBook(savedBook);
            }
            setIsCreateModalOpen(false);
            setEditingBook(null);
          }}
        />
      )}
    </div>
  );
};

