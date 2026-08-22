import React, { useMemo } from "react";
import styles from "./Bookshelf.module.css";
import { Book as IBook } from "../../books/types/book";
import { ShelfRow } from "./ShelfRow";

export interface BookshelfProps {
  books: IBook[];
  onBookClick: (book: IBook) => void;
  onAddNewClick: () => void;
}

export const Bookshelf: React.FC<BookshelfProps> = ({
  books,
  onBookClick,
  onAddNewClick,
}) => {
  // Distribute books across multi-row shelves (4 books per shelf for comfortable desktop spacing)
  const shelfRows = useMemo(() => {
    const rows: IBook[][] = [];
    const booksPerRow = 4;
    
    for (let i = 0; i < books.length; i += booksPerRow) {
      rows.push(books.slice(i, i + booksPerRow));
    }
    
    // If no books exist, provide at least one empty shelf
    if (rows.length === 0) {
      rows.push([]);
    }
    
    return rows;
  }, [books]);

  return (
    <div className={styles.bookshelfContainer}>
      <div className={styles.shelvesStack}>
        {shelfRows.map((rowBooks, index) => {
          const isLastRow = index === shelfRows.length - 1;
          return (
            <ShelfRow
              key={`shelf-${index}`}
              books={rowBooks}
              onBookClick={onBookClick}
              showAddCard={isLastRow}
              onAddNewClick={onAddNewClick}
            />
          );
        })}
      </div>
    </div>
  );
};
