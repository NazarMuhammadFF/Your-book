import React from "react";
import styles from "./Bookshelf.module.css";
import { Book as IBook } from "../../books/types/book";
import { Book } from "../../books/components/Book";

export interface ShelfRowProps {
  books: IBook[];
  onBookClick: (book: IBook) => void;
  showAddCard?: boolean;
  onAddNewClick?: () => void;
}

export const ShelfRow: React.FC<ShelfRowProps> = ({
  books,
  onBookClick,
  showAddCard = false,
  onAddNewClick,
}) => {
  return (
    <div className={styles.shelfRow}>
      {/* Books row container standing directly on the shelf plank */}
      <div className={styles.booksRow}>
        {books.map((book) => (
          <div key={book.id} className={styles.bookSlot}>
            <Book book={book} onClick={onBookClick} isInteractive />
          </div>
        ))}

        {showAddCard && (
          <div className={styles.bookSlot}>
            <button
              type="button"
              className={styles.addBookSlot}
              onClick={onAddNewClick}
              aria-label="Create new book"
            >
              <div className={styles.addBookCard}>
                <span className={styles.addIcon}>+</span>
                <span className={styles.addLabel}>New Book</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* The physical wooden/stone shelf structure */}
      <div className={styles.plankStructure}>
        <div className={styles.plankTop} />
        <div className={styles.plankFace} />
        <div className={styles.plankShadow} />
      </div>
    </div>
  );
};
