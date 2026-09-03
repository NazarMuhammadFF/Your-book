import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Sliders } from "lucide-react";
import styles from "./Bookshelf.module.css";
import { Book as IBook, getBookVisualThickness, getBookDimensions } from "../../books/types/book";
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
  resolveRowPlacements,
  resolveDropPlacementX,
  BookPlacement,
  PackedShelfRow,
  clearBookSupport,
  cleanupPhysicsMemory,
} from "../utils/shelfLayout";

export interface BookshelfProps {
  books: IBook[];
  highlightedBookIds?: Set<string>;
  placements?: Record<string, BookPlacement>;
  onPlacementsChange?: (placements: Record<string, BookPlacement>) => void;
  onBookClick: (book: IBook) => void;
  onAddNewClick: () => void;
  onEditBook?: (book: IBook) => void;
  onReorderBooks?: (newBooks: IBook[]) => void;
  onMoveToTrash?: (bookId: string) => void;
  isDragOverTrash?: boolean;
  onDragOverTrashChange?: (isOver: boolean) => void;
}

interface ActiveDrag {
  book: IBook;
  sourceIndex: number;
  targetRowIndex: number;
  targetX: number;
  grabOffsetX: number; // Offset from left edge of book slot to clientX
  grabOffsetY: number; // Offset from top edge of book slot to clientY
  slotWidth: number; // Exact thickness of book
  slotHeight: number; // Exact height of row/book
  status: "dragging" | "settling" | "dropping_to_trash";
}

export const Bookshelf: React.FC<BookshelfProps> = ({
  books,
  highlightedBookIds,
  placements: externalPlacements,
  onPlacementsChange,
  onBookClick,
  onAddNewClick: _onAddNewClick,
  onEditBook,
  onReorderBooks,
  onMoveToTrash,
  onDragOverTrashChange,
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
  const [isOverTrashState, setIsOverTrashState] = useState<boolean>(false);
  // ponytail: ceiling = if user drags again before settle clears, last drop anim skipped.
  // upgrade path: swap for ref + cancel-token pattern.
  const [justDroppedBookId, setJustDroppedBookId] = useState<string | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  activeDragRef.current = activeDrag;

  // Live drag position tracked outside React state: the overlay follows the pointer
  // via direct DOM transform writes so ordinary pointermove frames never re-render the shelf.
  const dragOverlayRef = useRef<HTMLDivElement | null>(null);
  const livePointerRef = useRef({ x: 0, y: 0 });
  const isOverTrashRef = useRef(false);
  const lastDragTargetRef = useRef<{ rowIndex: number; x: number } | null>(null);

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
    
    // Cleanup orphaned physics memory entries when books change
    const currentBookIds = new Set(books.map(b => b.id));
    cleanupPhysicsMemory(currentBookIds);
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

  // Auto-scroll during drag when pointer near viewport edges

  // Global Pointer Event Listeners for smooth drag tracking and drop
  useEffect(() => {
    if (!activeDrag || activeDrag.status !== "dragging") return;

    const handlePointerMove = (e: PointerEvent) => {
      livePointerRef.current = { x: e.clientX, y: e.clientY };
      const current = activeDragRef.current;
      if (!current || current.status !== "dragging") return;

      // Check collision with Trash Bin Widget at bottom-right
      const trashEl = document.querySelector<HTMLElement>('[data-trash-bin="true"]');
      let isOverTrash = false;
      if (trashEl) {
        const rect = trashEl.getBoundingClientRect();
        isOverTrash =
          e.clientX >= rect.left - 24 &&
          e.clientX <= rect.right + 24 &&
          e.clientY >= rect.top - 24 &&
          e.clientY <= rect.bottom + 24;
      }
      isOverTrashRef.current = isOverTrash;
      setIsOverTrashState(isOverTrash);
      onDragOverTrashChange?.(isOverTrash);

      // Direct DOM transform: buttery pointer follow without per-frame React renders
      const el = dragOverlayRef.current;
      if (el) {
        el.style.transform = `translate3d(${e.clientX - current.grabOffsetX}px, ${
          e.clientY - current.grabOffsetY
        }px, 0)`;
      }

      // Auto-scroll when pointer near viewport top/bottom during drag
      const SCROLL_MARGIN = 80;
      const SCROLL_SPEED = 14;
      if (e.clientY < SCROLL_MARGIN) {
        window.scrollBy({ top: -SCROLL_SPEED, behavior: "auto" });
      } else if (e.clientY > window.innerHeight - SCROLL_MARGIN) {
        window.scrollBy({ top: SCROLL_SPEED, behavior: "auto" });
      }

      // Target placement, snapped & deduped so the shelf only re-renders when the
      // drop target actually changes instead of on every pointer frame.
      const { targetRowIndex, targetX } = calculateTargetPlacement(
        0,
        e.clientY - current.grabOffsetY + current.slotHeight / 2,
        e.clientX - current.grabOffsetX
      );
      const snappedX = Math.round(targetX / 4) * 4;
      const last = lastDragTargetRef.current;
      if (
        !last ||
        last.rowIndex !== targetRowIndex ||
        Math.abs(last.x - snappedX) >= 4
      ) {
        lastDragTargetRef.current = { rowIndex: targetRowIndex, x: snappedX };
        setActiveDrag((prev) =>
          prev && prev.status === "dragging"
            ? { ...prev, targetRowIndex, targetX: snappedX }
            : prev
        );
      }
    };

    const handlePointerUp = () => {
      const current = activeDragRef.current;
      if (!current || current.status !== "dragging") return;
      const { x: clientX, y: clientY } = livePointerRef.current;

      setIsOverTrashState(false);
      isOverTrashRef.current = false;
      onDragOverTrashChange?.(false);

      // Check if dropped inside Trash Bin Widget
      const trashEl = document.querySelector<HTMLElement>('[data-trash-bin="true"]');
      let droppedInTrash = false;
      if (trashEl) {
        const rect = trashEl.getBoundingClientRect();
        droppedInTrash =
          clientX >= rect.left - 24 &&
          clientX <= rect.right + 24 &&
          clientY >= rect.top - 24 &&
          clientY <= rect.bottom + 24;
      }

      if (droppedInTrash) {
        let trashX = clientX - current.grabOffsetX;
        let trashY = clientY - current.grabOffsetY;
        if (trashEl) {
          const rect = trashEl.getBoundingClientRect();
          trashX = rect.left + rect.width / 2 - current.slotWidth / 2;
          trashY = rect.top + 36;
        }

        // Animate book scaling down and dropping into the trash cavity:
        // outer layer glides to the bin, inner layer shrinks & fades via CSS class
        setActiveDrag({ ...current, status: "dropping_to_trash" });
        const el = dragOverlayRef.current;
        if (el) {
          el.style.transition = `transform 380ms cubic-bezier(0.4, 0, 0.2, 1)`;
          requestAnimationFrame(() => {
            el.style.transform = `translate3d(${trashX}px, ${trashY}px, 0)`;
          });
        }

        setTimeout(() => {
          onMoveToTrash?.(current.book.id);
          setActiveDrag(null);
        }, 380);
        return;
      }

      // Resolve final row layout first: neighbors shift only as far as physically
      // required, loose spacing elsewhere is untouched, and the dropped book gets
      // its exact committed x from the same compaction.
      const availableWidth = Math.max(320, containerWidth - 80);
      const targetRowBooks = books.filter((b) => {
        if (b.id === current.book.id) return false;
        const p = placements[b.id];
        return (p ? p.rowIndex : 0) === current.targetRowIndex;
      });
      const resolvedRow = resolveRowPlacements(
        targetRowBooks,
        placements,
        availableWidth,
        { x: current.targetX, width: current.slotWidth }
      );
      const dropX = resolveDropPlacementX(
        resolvedRow,
        current.targetX,
        current.slotWidth,
        availableWidth
      );

      // Find viewport coordinates of the target drop position on the shelf
      let settleX = clientX - current.grabOffsetX;
      let settleY = clientY - current.grabOffsetY;

      if (containerRef.current) {
        const targetRowEl = containerRef.current.querySelector<HTMLElement>(
          `[data-shelf-row-index="${current.targetRowIndex}"]`
        );
        if (targetRowEl) {
          const rowRect = targetRowEl.getBoundingClientRect();
          settleX = rowRect.left + 40 + dropX;
          settleY = rowRect.top + Math.max(0, rowRect.height - 33 - current.slotHeight);
        }
      }

      // Settle: glide to the slot via compositor-friendly transform transition
      setJustDroppedBookId(current.book.id);
      setTimeout(() => setJustDroppedBookId(null), BOOKSHELF_SETTLE_DURATION_MS + 750);
      setActiveDrag({ ...current, status: "settling" });
      const el = dragOverlayRef.current;
      if (el) {
        el.style.transition = `transform ${BOOKSHELF_SETTLE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        requestAnimationFrame(() => {
          el.style.transform = `translate3d(${settleX}px, ${settleY}px, 0)`;
        });
      }

      // Commit placement: persist the resolved x of EVERY book in the target row,
      // so the post-drop layout matches the preview exactly instead of re-deriving
      // overlaps from stale stored positions.
      const nextPlacements: Record<string, BookPlacement> = { ...placements };
      for (const item of resolvedRow) {
        nextPlacements[item.book.id] = {
          bookId: item.book.id,
          rowIndex: current.targetRowIndex,
          x: Math.round(item.x),
        };
      }
      nextPlacements[current.book.id] = {
        bookId: current.book.id,
        rowIndex: current.targetRowIndex,
        x: Math.round(dropX),
      };
      setPlacements(nextPlacements);
      onPlacementsChange?.(nextPlacements);

      // Complete settling animation, sort books by position, and clear overlay
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

  // Paint the overlay at the live pointer position immediately on mount/status change
  useLayoutEffect(() => {
    const el = dragOverlayRef.current;
    const current = activeDrag;
    if (!el || !current) return;

    if (current.status === "dragging") {
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = `translate3d(${livePointerRef.current.x - current.grabOffsetX}px, ${
        livePointerRef.current.y - current.grabOffsetY
      }px, 0)`;
    }
  }, [activeDrag]);

  // Press-and-Hold Start Handler (fires after 280ms threshold)
  const handleHoldStart = (
    book: IBook,
    clientX: number,
    clientY: number,
    _bookRect: DOMRect
  ) => {
    if (activeShelfBookId || returningBookId) return;

    // Only clear dragged book's support — neighbors keep their lean state
    clearBookSupport(book.id);

    const sourceIndex = books.findIndex((b) => b.id === book.id);
    if (sourceIndex === -1) return;

    const visualThickness = getBookVisualThickness(book);
    const visualHeight = getBookDimensions(book).height;
    const grabOffsetX = visualThickness / 2;
    const grabOffsetY = visualHeight / 2;
    const placement = placements[book.id] || { rowIndex: 0, x: 0 };

    livePointerRef.current = { x: clientX, y: clientY };
    lastDragTargetRef.current = { rowIndex: placement.rowIndex, x: placement.x };

    setActiveDrag({
      book,
      sourceIndex,
      targetRowIndex: placement.rowIndex,
      targetX: placement.x,
      grabOffsetX,
      grabOffsetY,
      slotWidth: visualThickness,
      slotHeight: visualHeight,
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

  // Real-time drag preview target for live shelf space opening and dashed guide box.
  // Includes resolvedX so the guide box matches the exact landing spot (Guide-landing sync).
  const resolvedDropX = useMemo(() => {
    if (!activeDrag || activeDrag.status !== "dragging") return null;
    const availableWidth = Math.max(320, containerWidth - 80);
    const targetRowBooks = books.filter((b) => {
      if (b.id === activeDrag.book.id) return false;
      const p = placements[b.id];
      return (p ? p.rowIndex : 0) === activeDrag.targetRowIndex;
    });
    // Mirror resolveDropPlacementX logic for real-time preview
    const items = targetRowBooks
      .map((b) => ({
        x: Math.max(0, Math.min(availableWidth - getBookVisualThickness(b), placements[b.id]?.x ?? 0)),
        thickness: getBookVisualThickness(b),
      }))
      .sort((a, b) => a.x - b.x);
    const dropX = Math.max(0, Math.min(availableWidth - activeDrag.slotWidth, activeDrag.targetX));
    let idx = items.findIndex((it) => it.x + it.thickness > dropX);
    if (idx === -1) idx = items.length;
    items.splice(idx, 0, { x: dropX, thickness: activeDrag.slotWidth });
    // Forward pass
    for (let i = 0; i < items.length - 1; i++) {
      const minNextX = items[i].x + items[i].thickness + 2;
      if (items[i + 1].x < minNextX) items[i + 1].x = minNextX;
    }
    // Backward cascade
    for (let i = items.length - 1; i >= 0; i--) {
      const limit = i < items.length - 1 ? items[i + 1].x - items[i].thickness - 2 : availableWidth - items[i].thickness;
      if (items[i].x > limit) items[i].x = Math.max(0, limit);
    }
    const found = items.find((it) => it.x === dropX || (it.x > dropX && it.thickness === activeDrag.slotWidth));
    return found?.x ?? dropX;
  }, [activeDrag, books, placements, containerWidth]);

  const dragPreview = useMemo(() => {
    if (!activeDrag) return null;
    return {
      bookId: activeDrag.book.id,
      targetRowIndex: activeDrag.targetRowIndex,
      targetX: resolvedDropX ?? activeDrag.targetX,
      width: activeDrag.slotWidth,
      height: activeDrag.slotHeight,
    };
  }, [activeDrag, resolvedDropX]);

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
              highlightedBookIds={highlightedBookIds}
              activeBookId={activeShelfBookId}
              activeSide={activeSide}
              returningBookId={returningBookId}
              draggingBookId={activeDrag?.book.id || null}
              justDroppedBookId={justDroppedBookId}
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

      {/* Dedicated Top-Level Drag Overlay Portaled directly to document.body.
          Position is written imperatively via dragOverlayRef for smoothness. */}
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
              ref={dragOverlayRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: activeDrag.slotWidth,
                height: activeDrag.slotHeight,
                transformStyle: "preserve-3d",
                willChange: "transform",
              }}
            >
              {/* Inner presentation layer: lift-in, trash hover shrink and landing
                  squash live here so the outer layer stays a pure pointer follower.
                  DraggedBook is rendered without lifted/settling flags on purpose:
                  no spine-to-cover flipping during reorder. */}
              <div
                className={[
                  styles.dragInner,
                  activeDrag.status === "dragging"
                    ? `${styles.dragInnerActive} ${isOverTrashState ? styles.dragInnerShrunk : ""}`
                    : activeDrag.status === "settling"
                    ? styles.dragInnerLand
                    : styles.dragInnerTrashDrop,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <DraggedBook
                  book={activeDrag.book}
                  mode="shelf"
                  isInteractive={false}
                />
              </div>
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
