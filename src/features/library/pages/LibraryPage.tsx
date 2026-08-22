import React, { useState, useMemo } from "react";
import styles from "./LibraryPage.module.css";
import { Book as IBook } from "../../books/types/book";
import { LibraryHeader } from "../components/LibraryHeader";
import { Bookshelf } from "../components/Bookshelf";
import { BookSettingsModal } from "../../books/components/CreateBookModal";

export interface LibraryPageProps {
  books: IBook[];
  onOpenBook: (book: IBook) => void;
  onCreateBook: (book: IBook) => void;
  onUpdateBook?: (book: IBook) => void;
  onReorderBooks?: (newBooks: IBook[]) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  books,
  onOpenBook,
  onCreateBook,
  onUpdateBook,
  onReorderBooks,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<IBook | null>(null);

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const q = searchQuery.toLowerCase();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
        (b.cover.authorName && b.cover.authorName.toLowerCase().includes(q))
    );
  }, [books, searchQuery]);

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

      {/* Main Bookshelf Area */}
      <main className={styles.shelfViewport}>
        {filteredBooks.length > 0 ? (
          <Bookshelf
            books={filteredBooks}
            onBookClick={onOpenBook}
            onAddNewClick={() => {
              setEditingBook(null);
              setIsCreateModalOpen(true);
            }}
            onEditBook={handleEditBook}
            onReorderBooks={onReorderBooks}
          />
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No books matched "{searchQuery}"</p>
            <button
              type="button"
              className={styles.resetSearchBtn}
              onClick={() => setSearchQuery("")}
            >
              Clear search filter
            </button>
          </div>
        )}
      </main>

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
