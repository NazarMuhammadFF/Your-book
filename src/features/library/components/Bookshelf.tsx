import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Sliders } from "lucide-react";
import styles from "./Bookshelf.module.css";
import { Book as IBook } from "../../books/types/book";
import { ShelfRow } from "./ShelfRow";
import { Book as DraggedBook } from "../../books/components/Book";
import {
  BOOKSHELF_RETURN_DURATION_MS,
  BOOKSHELF_SETTLE_DURATION_MS,
  BOOKSHELF_SWITCH_DELAY_MS,
} from "../../../design/motion";
import {
  computeShelfRows,
  generateInitialPlacements,
  BookPlacement,
  PackedShelfRow,
} from "../utils/shelfLayout";

export interface BookshelfProps {
  books: IBook[];
  placements?: Record<string, BookPlacement>;
  onPlacementsChange?: (placements: Record<string, BookPlacement>) => void;
  onBookClick: (book: IBook) => void;
  onAddNewClick: () => void;
  onEditBook?: (book: IBook) => void;
  onReorderBooks?: (newBooks: IBook[]) => void;
}

interface ActiveDrag {
  book: IBook;
  sourceIndex: number;
  targetRowIndex: number;
  targetX: number;
  pointerX: number; // Viewport clientX
  pointerY: number; // Viewport clientY
  grabOffsetX: number; // Offset from left edge of book slot to clientX
  grabOffsetY: number; // Offset from top edge of book slot to clientY
  slotWidth: number; // Exact thickness of book
  slotHeight: number; // Exact height of row/book
  status: "dragging" | "settling";
  settleTarget?: { x: number; y: number };
}

export const Bookshelf: React.FC<BookshelfProps> = ({
  books,
  placements: externalPlacements,
  onPlacementsChange,
  onBookClick,
  onAddNewClick: _onAddNewClick,
  onEditBook,
  onReorderBooks,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);

  // Single active shelf book state (for 3D inspection)
  const [activeShelfBookId, setActiveShelfBookId] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [returningBookId, setReturningBookId] = useState<string | null>(null);

  // Switch & return timers for sequential book transition (finish returning first before extracting next)
  const switchTimerRef = useRef<number | null>(null);
  const returnTimerRef = useRef<number | null>(null);
  const returnDeadlineRef = useRef<number>(0);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
    };
  }, []);

  // Free shelf placements state (initialized with external placements if provided)
  const [placements, setPlacements] = useState<Record<string, BookPlacement>>(() =>
    generateInitialPlacements(books, 920, externalPlacements || {})
  );

  // Unified Pointer Drag & Reorder State
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  activeDragRef.current = activeDrag;

  // Sync external placements when provided from outside
  useEffect(() => {
    if (externalPlacements && Object.keys(externalPlacements).length > 0) {
      setPlacements((prev) => ({
        ...prev,
        ...externalPlacements,
      }));
    }
  }, [externalPlacements]);

  // Measure container width responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          const width = entry.contentRect.width;
          if (width > 0) {
            setContainerWidth(width);
          }
        }
      }
    });

    observer.observe(el);
    setContainerWidth(el.clientWidth || 1000);

    return () => observer.disconnect();
  }, []);

  // Update/generate placements when books are added, removed, or container resizes
  useEffect(() => {
    setPlacements((prev) => {
      const availableWidth = Math.max(320, containerWidth - 80);
      const merged = { ...prev, ...(externalPlacements || {}) };
      const updated = generateInitialPlacements(books, availableWidth, merged);
      if (Object.keys(updated).length !== Object.keys(merged).length) {
        onPlacementsChange?.(updated);
      }
      return updated;
    });
  }, [books, containerWidth, externalPlacements, onPlacementsChange]);

  // If search filtering removes the active or returning book, safely reset it
  useEffect(() => {
    if (activeShelfBookId && !books.some((b) => b.id === activeShelfBookId)) {
      setActiveShelfBookId(null);
    }
    if (returningBookId && !books.some((b) => b.id === returningBookId)) {
      setReturningBookId(null);
    }
  }, [books, activeShelfBookId, returningBookId]);

  // Active inspected book object
  const activeBook = useMemo(
    () => books.find((b) => b.id === activeShelfBookId) || null,
    [books, activeShelfBookId]
  );

  // Global keyboard listener for Escape and Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeDragRef.current) {
        if (e.key === "Escape") {
          e.preventDefault();
          // Cancel reorder on Escape
          setActiveDrag(null);
        }
        return;
      }

      if (!activeBook) return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleReturnToShelf();
      } else if (e.key === "Enter" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        handleOpenBook(activeBook);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeBook]);

  // Calculate target shelf row and horizontal position along that shelf
  const calculateTargetPlacement = useCallback(
    (
      _bookCenterX: number,
      bookCenterY: number,
      visualLeft: number
    ): { targetRowIndex: number; targetX: number } => {
      if (!containerRef.current) return { targetRowIndex: 0, targetX: 0 };

      const shelfRowElements = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>("[data-shelf-row-index]")
      );

      if (shelfRowElements.length === 0) return { targetRowIndex: 0, targetX: 0 };

      // 1. Identify target shelf row by vertical proximity
      let targetRowEl = shelfRowElements[0];
      let minRowDistance = Infinity;

      for (const rowEl of shelfRowElements) {
        const rect = rowEl.getBoundingClientRect();
        if (bookCenterY >= rect.top && bookCenterY <= rect.bottom) {
          targetRowEl = rowEl;
          break;
        }
        const rowCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(bookCenterY - rowCenterY);
        if (dist < minRowDistance) {
          minRowDistance = dist;
          targetRowEl = rowEl;
        }
      }

      const targetRowIndex = Number(targetRowEl.getAttribute("data-shelf-row-index") || "0");
      const rowRect = targetRowEl.getBoundingClientRect();
      const availableWidth = Math.max(320, containerWidth - 80);
      const slotWidth = activeDragRef.current?.slotWidth || 40;

      // 2. Calculate horizontal pixel offset relative to 40px row left padding
      const rawX = visualLeft - (rowRect.left + 40);
      const targetX = Math.max(0, Math.min(availableWidth - slotWidth, rawX));

      return { targetRowIndex, targetX };
    },
    [containerWidth]
  );

  // Global Pointer Event Listeners for 60fps Smooth Drag Tracking and Drop
  useEffect(() => {
    if (!activeDrag || activeDrag.status !== "dragging") return;

    const handlePointerMove = (e: PointerEvent) => {
      const current = activeDragRef.current;
      if (!current || current.status !== "dragging") return;

      const currentVisualLeft = e.clientX - current.grabOffsetX;
      const currentVisualTop = e.clientY - current.grabOffsetY;
      const bookCenterX = currentVisualLeft + current.slotWidth / 2;
      const bookCenterY = currentVisualTop + current.slotHeight / 2;

      const { targetRowIndex, targetX } = calculateTargetPlacement(
        bookCenterX,
        bookCenterY,
        currentVisualLeft
      );

      setActiveDrag((prev) =>
        prev && prev.status === "dragging"
          ? {
              ...prev,
              pointerX: e.clientX,
              pointerY: e.clientY,
              targetRowIndex,
              targetX,
            }
          : prev
      );
    };

    const handlePointerUp = () => {
      const current = activeDragRef.current;
      if (!current || current.status !== "dragging") return;

      // Find viewport coordinates of the target drop position on the shelf
      let settleX = current.pointerX - current.grabOffsetX;
      let settleY = current.pointerY - current.grabOffsetY;

      if (containerRef.current) {
        const targetRowEl = containerRef.current.querySelector<HTMLElement>(
          `[data-shelf-row-index="${current.targetRowIndex}"]`
        );
        if (targetRowEl) {
          const rowRect = targetRowEl.getBoundingClientRect();
          settleX = rowRect.left + 40 + current.targetX;
          settleY = rowRect.top + Math.max(0, rowRect.height - 33 - current.slotHeight);
        }
      }

      // 1. Enter settling state: smoothly animates floating 3D book into the target rect
      setActiveDrag((prev) =>
        prev
          ? {
              ...prev,
              status: "settling",
              settleTarget: { x: settleX, y: settleY },
            }
          : null
      );

      // 2. Commit placement to state
      const nextPlacements: Record<string, BookPlacement> = {
        ...placements,
        [current.book.id]: {
          bookId: current.book.id,
          rowIndex: current.targetRowIndex,
          x: current.targetX,
        },
      };
      setPlacements(nextPlacements);
      onPlacementsChange?.(nextPlacements);

      // 3. Complete settling animation, sort books by position, and clear overlay
      setTimeout(() => {
        const sorted = [...books].sort((a, b) => {
          const pa = nextPlacements[a.id] || { rowIndex: 0, x: 0 };
          const pb = nextPlacements[b.id] || { rowIndex: 0, x: 0 };
          if (pa.rowIndex !== pb.rowIndex) return pa.rowIndex - pb.rowIndex;
          return pa.x - pb.x;
        });

        onReorderBooks?.(sorted);
        setActiveDrag(null);
      }, BOOKSHELF_SETTLE_DURATION_MS);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [activeDrag, books, placements, onReorderBooks, calculateTargetPlacement]);

  // Press-and-Hold Start Handler (fires after 280ms threshold)
  const handleHoldStart = (
    book: IBook,
    clientX: number,
    clientY: number,
    bookRect: DOMRect
  ) => {
    if (activeShelfBookId || returningBookId) return;

    const sourceIndex = books.findIndex((b) => b.id === book.id);
    if (sourceIndex === -1) return;

    const grabOffsetX = clientX - bookRect.left;
    const grabOffsetY = clientY - bookRect.top;
    const placement = placements[book.id] || { rowIndex: 0, x: 0 };

    setActiveDrag({
      book,
      sourceIndex,
      targetRowIndex: placement.rowIndex,
      targetX: placement.x,
      pointerX: clientX,
      pointerY: clientY,
      grabOffsetX,
      grabOffsetY,
      slotWidth: bookRect.width,
      slotHeight: bookRect.height,
      status: "dragging",
    });
  };

  const handleSelectBook = (book: IBook) => {
    if (activeDragRef.current) return;
    if (activeShelfBookId === book.id) return;

    // Case 1: Another book is currently extracted -> Return it to shelf first, then extract the new book
    if (activeShelfBookId) {
      const prevId = activeShelfBookId;

      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
      if (returnTimerRef.current) {
        clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }

      // Step 1: Initial book starts returning to shelf
      setReturningBookId(prevId);
      setActiveShelfBookId(null);
      returnDeadlineRef.current = Date.now() + BOOKSHELF_RETURN_DURATION_MS;

      // Ensure returningBookId resets once the full return animation finishes
      returnTimerRef.current = window.setTimeout(() => {
        setReturningBookId((curr) => (curr === prevId ? null : curr));
        returnTimerRef.current = null;
      }, BOOKSHELF_RETURN_DURATION_MS);

      // Step 2: Next book starts extracting at BOOKSHELF_SWITCH_DELAY_MS (when first book is almost in)
      switchTimerRef.current = window.setTimeout(() => {
        setActiveShelfBookId(book.id);
        setActiveSide("front");
        switchTimerRef.current = null;
      }, BOOKSHELF_SWITCH_DELAY_MS);
      return;
    }

    // Case 2: A book is currently in the middle of returning to shelf -> Wait for switch delay threshold, then extract
    if (returningBookId) {
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
      const elapsed = BOOKSHELF_RETURN_DURATION_MS - Math.max(0, returnDeadlineRef.current - Date.now());
      const remainingDelay = Math.max(0, BOOKSHELF_SWITCH_DELAY_MS - elapsed);

      switchTimerRef.current = window.setTimeout(() => {
        setActiveShelfBookId(book.id);
        setActiveSide("front");
        switchTimerRef.current = null;
      }, remainingDelay);
      return;
    }

    // Case 3: No active/returning books -> Immediate extract
    setActiveShelfBookId(book.id);
    setActiveSide("front");
  };

  const handleReturnToShelf = () => {
    // Cancel any pending queued book switch
    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }

    if (!activeShelfBookId) return;
    const bookId = activeShelfBookId;
    setActiveShelfBookId(null);
    setReturningBookId(bookId);
    returnDeadlineRef.current = Date.now() + BOOKSHELF_RETURN_DURATION_MS;

    if (returnTimerRef.current) {
      clearTimeout(returnTimerRef.current);
    }
    returnTimerRef.current = window.setTimeout(() => {
      setReturningBookId((curr) => (curr === bookId ? null : curr));
      returnTimerRef.current = null;
    }, BOOKSHELF_RETURN_DURATION_MS);
  };

  const handleOpenBook = (book: IBook) => {
    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
    if (returnTimerRef.current) {
      clearTimeout(returnTimerRef.current);
      returnTimerRef.current = null;
    }
    setActiveShelfBookId(null);
    setReturningBookId(null);
    onBookClick(book);
  };

  // Real-time drag preview target for live shelf space opening and dashed guide box
  const dragPreview = useMemo(() => {
    if (!activeDrag || activeDrag.status !== "dragging") return null;
    return {
      bookId: activeDrag.book.id,
      targetRowIndex: activeDrag.targetRowIndex,
      targetX: activeDrag.targetX,
      width: activeDrag.slotWidth,
      height: activeDrag.slotHeight,
    };
  }, [activeDrag]);

  // Multi-row shelf generation with free placements, dynamic zone heights, and collision safety
  const shelfRows = useMemo<PackedShelfRow[]>(
    () => computeShelfRows(books, placements, containerWidth, dragPreview),
    [books, placements, containerWidth, dragPreview]
  );

  return (
    <div
      ref={containerRef}
      className={styles.bookshelfContainer}
      onClick={() => {
        if (activeShelfBookId || returningBookId) {
          handleReturnToShelf();
        }
      }}
    >
      {/* Full-screen backdrop overlay rendered to document.body outside 3D transforms */}
      {(activeShelfBookId || returningBookId) &&
        createPortal(
          <div
            className={styles.fullScreenBackdrop}
            onClick={handleReturnToShelf}
            aria-hidden="true"
          />,
          document.body
        )}

      {/* Stacked physical shelves with exclusive vertical zones */}
      <div className={styles.shelvesStack}>
        {shelfRows.map((row) => {
          const isEmptyContinuation = row.books.length === 0;
          const isDragTarget = activeDrag?.status === "dragging" && activeDrag.targetRowIndex === row.rowIndex;
          const dragGuide = isDragTarget
            ? {
                x: activeDrag!.targetX,
                width: activeDrag!.slotWidth,
                height: activeDrag!.slotHeight,
              }
            : null;

          return (
            <ShelfRow
              key={row.id}
              slots={row.slots}
              books={row.books}
              startIndex={row.startIndex}
              rowIndex={row.rowIndex}
              activeBookId={activeShelfBookId}
              activeSide={activeSide}
              returningBookId={returningBookId}
              draggingBookId={activeDrag?.book.id || null}
              isSettling={activeDrag?.status === "settling"}
              isDragTarget={isDragTarget}
              dragPlacementGuide={dragGuide}
              onSelectBook={handleSelectBook}
              onOpenBook={handleOpenBook}
              onSideChange={setActiveSide}
              onReturnToShelf={handleReturnToShelf}
              onHoldStart={handleHoldStart}
              isEmptyContinuation={isEmptyContinuation}
              maxRowHeight={row.maxRowHeight}
              containerWidth={containerWidth}
            />
          );
        })}
      </div>

      {/* Dedicated Top-Level Drag Overlay Portaled directly to document.body */}
      {activeDrag &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 999999, // ALWAYS above all shelf books and navigation headers
              overflow: "hidden",
              perspective: 1100,
              transformStyle: "preserve-3d",
            }}
            aria-hidden="true"
          >
            <div
              style={{
                position: "absolute",
                left:
                  activeDrag.status === "settling" && activeDrag.settleTarget
                    ? activeDrag.settleTarget.x
                    : activeDrag.pointerX - activeDrag.grabOffsetX,
                top:
                  activeDrag.status === "settling" && activeDrag.settleTarget
                    ? activeDrag.settleTarget.y
                    : activeDrag.pointerY - activeDrag.grabOffsetY,
                width: activeDrag.slotWidth,
                height: activeDrag.slotHeight,
                transformStyle: "preserve-3d",
                transition:
                  activeDrag.status === "settling"
                    ? `left ${BOOKSHELF_SETTLE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${BOOKSHELF_SETTLE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), filter ${BOOKSHELF_SETTLE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
                    : "none",
                filter:
                  activeDrag.status === "settling"
                    ? "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.22))"
                    : "drop-shadow(0 22px 30px rgba(0, 0, 0, 0.5)) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.26))",
              }}
            >
              <DraggedBook
                book={activeDrag.book}
                mode="shelf"
                isInteractive={false}
                isLifted={activeDrag.status === "dragging"}
                isSettling={activeDrag.status === "settling"}
              />
            </div>
          </div>,
          document.body
        )}

      {/* Subtle, quiet interaction discovery hint & Settings button */}
      {activeBook &&
        createPortal(
          <div className={styles.hintBar} aria-live="polite">
            <span>Click book to open</span>
            <span className={styles.hintDot}>•</span>
            <span>Drag horizontally to flip</span>
            <span className={styles.hintDot}>•</span>
            <span>Drag down or click outside to return</span>

            {onEditBook && (
              <button
                type="button"
                className={styles.hintSettingsBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditBook(activeBook);
                }}
                aria-label={`Customize "${activeBook.title}"`}
              >
                <Sliders size={12} />
                <span>Customize</span>
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
