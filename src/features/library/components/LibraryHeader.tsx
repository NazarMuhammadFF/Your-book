import React from "react";
import { BookOpen, Plus, Search } from "lucide-react";
import styles from "./LibraryHeader.module.css";
import { Button } from "../../../components/ui/Button";

export interface LibraryHeaderProps {
  bookCount: number;
  onNewBookClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const LibraryHeader: React.FC<LibraryHeaderProps> = ({
  bookCount,
  onNewBookClick,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.brandGroup}>
        <div className={styles.logoIconWrapper}>
          <BookOpen size={20} className={styles.logoIcon} />
        </div>
        <div className={styles.titleInfo}>
          <h1 className={styles.appTitle}>BookNote</h1>
          <span className={styles.bookCountBadge}>
            Personal Library • {bookCount} {bookCount === 1 ? "Book" : "Books"}
          </span>
        </div>
      </div>

      <div className={styles.actionsGroup}>
        {/* Search Mockup */}
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Find in library..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
            aria-label="Search books"
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Primary New Book Action */}
        <Button
          variant="primary"
          size="md"
          icon={<Plus size={16} />}
          onClick={onNewBookClick}
        >
          New Book
        </Button>
      </div>
    </header>
  );
};
