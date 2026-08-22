import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./Bookshelf.module.css";
import { Book as IBook } from "../../books/types/book";
import { Book } from "../../books/components/Book";

export interface SortableBookSlotProps {
  book: IBook;
  globalIndex: number;
  maxRowHeight: number;
  isActive: boolean;
  activeSide: "front" | "back";
  isReturning: boolean;
  currentSlotLeft: number;
  containerWidth: number;
  onSelectBook: (book: IBook) => void;
  onOpenBook: (book: IBook) => void;
  onSideChange: (side: "front" | "back") => void;
  onReturnToShelf: () => void;
}

export const SortableBookSlot: React.FC<SortableBookSlotProps> = ({
  book,
  globalIndex,
  maxRowHeight,
  isActive,
  activeSide,
  isReturning,
  currentSlotLeft,
  containerWidth,
  onSelectBook,
  onOpenBook,
  onSideChange,
  onReturnToShelf,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: book.id,
    disabled: isActive, // Don't allow drag-reordering if book is currently extracted/inspected
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 250ms cubic-bezier(0.2, 0.9, 0.3, 1)",
    height: `${maxRowHeight}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.bookSlot} ${isDragging ? styles.liftedSlot : ""}`}
      data-book-id={book.id}
      data-book-index={globalIndex}
      {...attributes}
      {...listeners}
    >
      <Book
        book={book}
        mode="shelf"
        isActive={isActive}
        isGhost={isDragging}
        activeSide={activeSide}
        isReturning={isReturning}
        onSelect={onSelectBook}
        onOpenBook={onOpenBook}
        onSideChange={onSideChange}
        onReturnToShelf={onReturnToShelf}
        slotLeft={currentSlotLeft}
        containerWidth={containerWidth}
        isInteractive={!isDragging}
      />
    </div>
  );
};
