import React from "react";
import styles from "./Bookshelf.module.css";
import { Book as IBook, getBookVisualThickness } from "../../books/types/book";
import { Book } from "../../books/components/Book";
import { ShelfSlotLayout } from "../utils/shelfLayout";

export interface ShelfRowProps {
  slots?: ShelfSlotLayout[];
  books: IBook[];
  startIndex: number;
  rowIndex?: number;
  activeBookId: string | null;
  activeSide: "front" | "back";
  returningBookId: string | null;
  draggingBookId: string | null;
  isSettling?: boolean;
  isDragTarget?: boolean;
  dragPlacementGuide?: { x: number; width: number; height: number } | null;
  onSelectBook: (book: IBook) => void;
  onOpenBook: (book: IBook) => void;
  onSideChange: (side: "front" | "back") => void;
  onReturnToShelf: () => void;
  onHoldStart?: (book: IBook, clientX: number, clientY: number, bookRect: DOMRect) => void;
  isEmptyContinuation?: boolean;
  maxRowHeight: number;
  containerWidth: number;
}

export const ShelfRow: React.FC<ShelfRowProps> = ({
  slots,
  books,
  startIndex,
  rowIndex = 0,
  activeBookId,
  activeSide,
  returningBookId,
  draggingBookId,
  isSettling = false,
  isDragTarget = false,
  dragPlacementGuide = null,
  onSelectBook,
  onOpenBook,
  onSideChange,
  onReturnToShelf,
  onHoldStart,
  isEmptyContinuation = false,
  maxRowHeight,
  containerWidth,
}) => {
  const slotItems: ShelfSlotLayout[] =
    slots && slots.length > 0
      ? slots
      : books.map((book, localIdx) => ({
          book,
          globalIndex: startIndex + localIdx,
          thickness: getBookVisualThickness(book),
          x: localIdx * (getBookVisualThickness(book) + 10),
          gapAfter: 10,
          leanAngle: 0,
          tallThinScore: 0,
        }));

  return (
    <div
      className={`${styles.shelfRow} ${isEmptyContinuation ? styles.emptyShelfRow : ""} ${isDragTarget ? styles.activeTargetShelfRow : ""}`}
      data-shelf-row-index={rowIndex}
      data-shelf-row-start={startIndex}
      data-shelf-row-count={slotItems.length}
      data-drop-target={isDragTarget ? "true" : undefined}
    >
      {/* Books row container standing directly on the shelf plank */}
      <div
        className={`${styles.booksRow} ${isEmptyContinuation ? styles.emptyBooksRow : ""}`}
        style={{
          height: isEmptyContinuation ? "90px" : `${maxRowHeight + 8}px`,
        }}
      >
        {/* Real-time Dashed Placement Guide Box when dragged book targets this shelf */}
        {isDragTarget && dragPlacementGuide && (
          <div
            className={styles.dragPlacementGuide}
            style={{
              left: `${40 + dragPlacementGuide.x}px`,
              width: `${dragPlacementGuide.width}px`,
              height: `${dragPlacementGuide.height}px`,
            }}
          />
        )}
        {slotItems.map((slotItem) => {
          const { book, globalIndex, thickness, x, leanAngle } = slotItem;
          const isActive = activeBookId === book.id;
          const isReturning = returningBookId === book.id;
          const isDraggingThis = draggingBookId === book.id;
          const currentSlotLeft = 40 + x;

          const slotStateClass = isDraggingThis
            ? isSettling
              ? styles.liftedSlotSettling
              : styles.liftedSlot
            : "";

          return (
            <div
              key={book.id}
              className={`${styles.bookSlot} ${slotStateClass}`}
              style={{
                left: `${currentSlotLeft}px`,
                width: `${thickness}px`,
                height: `${maxRowHeight}px`,
              }}
              data-book-id={book.id}
              data-book-index={globalIndex}
              data-drop-placeholder={isDraggingThis ? "true" : undefined}
            >
              <Book
                book={book}
                mode="shelf"
                isActive={isActive}
                isGhost={isDraggingThis}
                activeSide={activeSide}
                isReturning={isReturning}
                leanAngle={leanAngle}
                onSelect={onSelectBook}
                onOpenBook={onOpenBook}
                onSideChange={onSideChange}
                onReturnToShelf={onReturnToShelf}
                onHoldStart={onHoldStart}
                slotLeft={currentSlotLeft}
                containerWidth={containerWidth}
                isInteractive={!isDraggingThis}
              />
            </div>
          );
        })}
      </div>

      {/* The physical 3D wooden shelf structure */}
      <div className={styles.plankStructure}>
        <div className={styles.plankTop} />
        <div className={styles.plankFace} />
        <div className={styles.plankSideLeft} />
        <div className={styles.plankSideRight} />
        <div className={styles.plankShadow} />
      </div>
    </div>
  );
};
