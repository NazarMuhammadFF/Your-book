import React, { useState, useMemo } from "react";
import styles from "./LibraryPage.module.css";
import { Book as IBook } from "../../books/types/book";
import { LibraryHeader } from "../components/LibraryHeader";
import { Bookshelf } from "../components/Bookshelf";
import { CreateBookModal } from "../../books/components/CreateBookModal";

export interface LibraryPageProps {
  books: IBook[];
  onOpenBook: (book: IBook) => void;
  onCreateBook: (book: IBook) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  books,
  onOpenBook,
  onCreateBook,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  return (
    <div className={styles.pageContainer}>
      {/* Top Library Header Bar */}
      <LibraryHeader
        bookCount={books.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewBookClick={() => setIsCreateModalOpen(true)}
      />

      {/* Main Bookshelf Area */}
      <main className={styles.shelfViewport}>
        {filteredBooks.length > 0 ? (
          <Bookshelf
            books={filteredBooks}
            onBookClick={onOpenBook}
            onAddNewClick={() => setIsCreateModalOpen(true)}
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

      {/* Create Book Modal Dialog */}
      <CreateBookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateBook={(newBook) => {
          onCreateBook(newBook);
          // Directly open workspace for the newly created book
          onOpenBook(newBook);
        }}
      />
    </div>
  );
};
