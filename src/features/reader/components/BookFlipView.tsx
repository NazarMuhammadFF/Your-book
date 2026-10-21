import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import HTMLFlipBook, { FlipBookRef } from "react-pageflip";
import { Button } from "../../../components/ui/Button";
import { Book, getBookPageMetrics, getBookDimensions } from "../../books/types/book";
import { BookCover } from "../../books/components/BookCover";
import { BackCover } from "../../books/components/BackCover";
import { resolveCoverPalette } from "../../../design/typography";
import { JSONContent } from "@tiptap/react";
import { paginateDocument } from "../../document/utils/pagination";
import { ReaderPage } from "./ReaderPage";
import styles from "./BookFlipView.module.css";
import "../../document/styles/editor.css";

export interface BookFlipViewProps {
  book: Book;
  content: JSONContent;
  pageIndex: number;
  zoom: number;
  onPageIndexChange: (pageIndex: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

interface PageSlotProps {
  children: React.ReactNode;
  density?: "hard" | "soft";
  className?: string;
  /** Hard board that overhangs the pages; the value is the outer edge side of this face. */
  board?: "left" | "right";
}

const PageSlot = React.forwardRef<HTMLDivElement, PageSlotProps>(
  ({ children, density = "soft", className = "", board }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.flipPage} ${board ? styles.boardPage : ""} ${className}`}
        data-density={density}
      >
        {board && <span className={styles.board} data-outer={board} aria-hidden="true" />}
        {children}
      </div>
    );
  }
);
PageSlot.displayName = "PageSlot";

const BOARD_OUT = 14; // how far the cover boards overhang the pages on the outer side

type FlipState = "user_fold" | "fold_corner" | "flipping" | "read";

interface PageFlipUiLike {
  getDistElement?: () => HTMLElement;
  getMousePos?: (x: number, y: number) => { x: number; y: number };
  __scaleAware?: boolean;
}

/**
 * page-flip converts pointer positions with `clientX - getBoundingClientRect().left`, which
 * is in on-screen pixels. The book is shown with a CSS `transform: scale()` (auto-fit and
 * zoom), while the engine's geometry is in unscaled layout pixels. At any scale other than
 * 1 the pointer therefore maps to the wrong place: the hot corner shows up away from the
 * cursor and the fold drifts while dragging. Divide the offset by the actual on-screen
 * scale so pointer positions are in the engine's own coordinate space.
 */
const makePointerScaleAware = (pageFlip: unknown): boolean => {
  const ui = (pageFlip as { getUI?: () => PageFlipUiLike } | null)?.getUI?.();
  const el = ui?.getDistElement?.();
  if (!ui || !el) return false;
  if (ui.__scaleAware) return true;
  ui.getMousePos = (x: number, y: number) => {
    const rect = el.getBoundingClientRect();
    const sx = el.offsetWidth > 0 && rect.width > 0 ? rect.width / el.offsetWidth : 1;
    const sy = el.offsetHeight > 0 && rect.height > 0 ? rect.height / el.offsetHeight : 1;
    return { x: (x - rect.left) / sx, y: (y - rect.top) / sy };
  };
  ui.__scaleAware = true;
  return true;
};

export const BookFlipView: React.FC<BookFlipViewProps> = ({
  book,
  content,
  pageIndex,
  zoom,
  onPageIndexChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}) => {
  const flipBookRef = useRef<FlipBookRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [pendingPage, setPendingPage] = useState<number | null>(null);

  const pageMetrics = useMemo(() => getBookPageMetrics(book), [book]);
  const paginatedPages = useMemo(
    () => paginateDocument(content, book),
    [content, book]
  );

  const targetSpreadWidth = pageMetrics.spreadWidth + 32;
  const targetSpreadHeight = pageMetrics.pageHeight + 28;

  // Ensure an even number of pages so Book View is always an open 2-page spread
  const displayPages = useMemo(() => {
    const pages = [...paginatedPages];
    if (pages.length % 2 !== 0) {
      pages.push({
        pageNumber: pages.length + 1,
        nodes: [],
        wordCount: 0,
        charCount: 0,
        hasContent: false,
      });
    }
    return pages;
  }, [paginatedPages]);

  // Leaf layout: 0 front cover, 1 inside front cover (endpaper), 2..N+1 interior pages,
  // N+2 inside back cover (endpaper), N+3 back cover. Total is always even, so with
  // showCover the front cover and back cover each sit alone and the book can be closed.
  const interiorCount = displayPages.length;
  const totalLeaves = interiorCount + 4;
  const lastLeaf = totalLeaves - 1;

  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (pageIndex <= 0) return 0;
    const odd = pageIndex % 2 === 1 ? pageIndex : pageIndex + 1;
    return Math.min(odd, totalLeaves - 1);
  });
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  const coverDims = useMemo(() => getBookDimensions(book), [book]);
  const coverScale = pageMetrics.pageWidth / coverDims.width;
  const palette = useMemo(() => resolveCoverPalette(book.cover.paletteId), [book.cover.paletteId]);

  // Responsive scale measurement from outer container
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (!containerRef.current) return;
      const availableWidth = containerRef.current.clientWidth - 32;
      const availableHeight = containerRef.current.clientHeight - 80;
      if (availableWidth > 0 && targetSpreadWidth > 0) {
        const scaleX = availableWidth / targetSpreadWidth;
        const scaleY =
          availableHeight > 0 && targetSpreadHeight > 0
            ? availableHeight / targetSpreadHeight
            : 1;
        const autoScale = Math.min(1, Math.max(0.35, Math.min(scaleX, scaleY)));
        const finalScale = autoScale * zoom; // Multiply with manual zoom
        setScale(finalScale);
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [targetSpreadWidth, targetSpreadHeight, zoom]);

  // Cursor follows the page interaction: open hand on pages / hot corner, closed hand while
  // dragging a fold. System cursors stay visible on any background, unlike the thin pencil.
  const [flipState, setFlipState] = useState<FlipState>("read");

  useEffect(() => {
    if (flipState !== "user_fold") return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "grabbing"; // keeps the closed hand even if the pointer leaves the book
    return () => {
      document.body.style.cursor = previous;
    };
  }, [flipState]);

  // The PageFlip instance is created asynchronously by react-pageflip, and again if it is
  // rebuilt after a page change. Patch on init, and retry for a few frames as a fallback.
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const tryPatch = () => {
      const pf = flipBookRef.current?.pageFlip();
      if (makePointerScaleAware(pf) || frames++ > 120) return;
      raf = requestAnimationFrame(tryPatch);
    };
    tryPatch();
    return () => cancelAnimationFrame(raf);
  }, [displayPages.length]);

  // One fixed spine shadow. It used to be baked into each page, so it popped in and out as
  // page-flip swapped which pages sit at the centre during a flip. It has to live INSIDE
  // page-flip's `.stf__block` (a stacking context) with z-index 4: above the resting pages
  // (1) and the revealed page (3), but below the page being turned (5) and its fold
  // shadows (10), so a lifted page covers the shadow instead of showing it through.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const shadow = document.createElement("div");
    shadow.className = styles.spineShadow;
    shadow.setAttribute("aria-hidden", "true");

    // page-flip creates the block asynchronously and empties it when its page list updates,
    // so (re)attach whenever it is missing. appendChild on an attached node is skipped.
    const attach = () => {
      const block = frame.querySelector(".stf__block");
      if (block && shadow.parentElement !== block) block.appendChild(shadow);
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(frame, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      shadow.remove();
    };
  }, []);

  // Where the book is heading. Used so the closed book re-centres / un-centres together with
  // the flip animation instead of jumping once it has finished.
  const predictDestination = (forward: boolean): number | null => {
    const p = currentPageRef.current;
    if (forward) {
      if (p === 0) return 1;
      if (p === lastLeaf - 2) return lastLeaf;
    } else {
      if (p === lastLeaf) return lastLeaf - 2;
      if (p === 1) return 0;
    }
    return null;
  };

  const handleFlip = (e: { data: number }) => {
    setCurrentPage(e.data);
    setPendingPage(null);
    onPageIndexChange(e.data);
  };

  const clearPendingTimer = useRef<number | undefined>(undefined);

  const handleChangeState = (e: { data: unknown }) => {
    const state = e.data as FlipState;
    setFlipState(state);
    window.clearTimeout(clearPendingTimer.current);
    if (state === "flipping") {
      try {
        const pf = flipBookRef.current?.pageFlip() as unknown as {
          getFlipController?: () => {
            getCalculation?: () => { getDirection?: () => number } | null;
          };
        };
        const dir = pf?.getFlipController?.()?.getCalculation?.()?.getDirection?.();
        if (dir === 0 || dir === 1) setPendingPage(predictDestination(dir === 0));
      } catch {
        /* direction unknown: the book re-centres when the flip ends */
      }
    } else if (state === "read") {
      // onFlip fires right at the end of the animation; clear any leftover prediction
      // (e.g. a drag that was released back to the same page) shortly after.
      clearPendingTimer.current = window.setTimeout(() => setPendingPage(null), 120);
    }
  };

  const goNext = () => {
    if (flipBookRef.current) {
      setPendingPage(predictDestination(true));
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const goPrevious = () => {
    if (flipBookRef.current) {
      setPendingPage(predictDestination(false));
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  const isAtStart = currentPage <= 0;
  const isAtEnd = currentPage >= lastLeaf;

  const effectivePage = pendingPage ?? currentPage;
  const closedState: "front" | "back" | "open" =
    effectivePage === 0 ? "front" : effectivePage === lastLeaf ? "back" : "open";
  // The cover boards overhang the pages by BOARD_OUT px on the outer side, so a closed book is
  // centred on page + overhang.
  const shiftX =
    closedState === "front"
      ? -(pageMetrics.pageWidth / 2 + BOARD_OUT / 2)
      : closedState === "back"
      ? pageMetrics.pageWidth / 2 + BOARD_OUT / 2
      : 0;

  // The binding behind the pages. The half that a cover board carries (front cover while the
  // left side shows its inside, back cover for the right side) is NOT drawn here, so the board
  // lifts together with its cover. Shown as soon as it is needed, hidden only when the board
  // has landed in exactly the same place.
  const leftNeeded = (x: number) => x > 1 && x < lastLeaf;
  const rightNeeded = (x: number) => x > 0 && x < lastLeaf - 2;
  const showTrimLeft = leftNeeded(effectivePage) || leftNeeded(currentPage);
  const showTrimRight = rightNeeded(effectivePage) || rightNeeded(currentPage);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft" && !isAtStart) {
      event.preventDefault();
      goPrevious();
    }
    if (event.key === "ArrowRight" && !isAtEnd) {
      event.preventDefault();
      goNext();
    }
  };

  const getStatusText = () => {
    if (currentPage === 0) return "Front cover";
    if (currentPage >= lastLeaf) return "Back cover";
    // leaf i shows interior page i-1; the two endpaper leaves hold no numbered page
    const lo = Math.max(1, currentPage - 1);
    const hi = Math.min(interiorCount, currentPage);
    return lo >= hi
      ? `Page ${lo} of ${interiorCount}`
      : `Pages ${lo}–${hi} of ${interiorCount}`;
  };

  const endpaperStyle = {
    "--endpaper-bg": palette.secondary,
  } as React.CSSProperties;

  const renderScaledCover = (node: React.ReactNode) => (
    <div
      className={styles.coverScaler}
      style={{
        width: `${coverDims.width}px`,
        height: `${pageMetrics.pageHeight / coverScale}px`,
        transform: `scale(${coverScale})`,
      }}
    >
      {node}
    </div>
  );

  return (
    <section
      ref={containerRef}
      className={styles.reader}
      aria-label={`Interactive Book View for ${book.title}`}
    >
      {/* 3D Hardcover Container with Scaled Box */}
      <div
        className={styles.stageWrapper}
        style={{
          width: `${Math.round(targetSpreadWidth * scale)}px`,
          height: `${Math.round(targetSpreadHeight * scale)}px`,
        }}
      >
        <div
          ref={frameRef}
          className={styles.hardcoverWrapper}
          data-flip-state={flipState}
          data-closed={closedState === "open" ? undefined : closedState}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Book pages. Use Left and Right Arrow keys to navigate."
          style={{
            width: `${targetSpreadWidth}px`,
            height: `${targetSpreadHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <div
            className={styles.bookShift}
            style={{ transform: `translateX(${shiftX}px)` }}
          >
            <div className={styles.trimLeft} data-visible={showTrimLeft ? "" : undefined} />
            <div className={styles.trimRight} data-visible={showTrimRight ? "" : undefined} />
          <HTMLFlipBook
            ref={flipBookRef}
            width={pageMetrics.pageWidth}
            height={pageMetrics.pageHeight}
            size="fixed"
            minWidth={280}
            maxWidth={pageMetrics.pageWidth}
            minHeight={380}
            maxHeight={pageMetrics.pageHeight}
            drawShadow={true}
            flippingTime={520}
            usePortrait={false}
            startPage={currentPage}
            clickEventForward={false}
            useMouseEvents={true}
            swipeDistance={30}
            showCover={true}
            mobileScrollSupport={true}
            onFlip={handleFlip}
            onInit={(e) => {
              makePointerScaleAware(e.object);
            }}
            onChangeState={handleChangeState}
          >
            <PageSlot key="front-cover" density="hard" className={styles.coverPage} board="right">
              {renderScaledCover(
                <BookCover cover={book.cover} title={book.title} subtitle={book.subtitle} />
              )}
            </PageSlot>
            <PageSlot key="endpaper-front" density="hard" board="left">
              <div className={styles.endpaper} style={endpaperStyle} />
            </PageSlot>
            {displayPages.map((page) => (
              <PageSlot key={`interior-${page.pageNumber}`} density="soft">
                <ReaderPage
                  book={book}
                  pageNumber={page.pageNumber}
                  side={page.pageNumber % 2 === 1 ? "right" : "left"}
                  totalPages={displayPages.length}
                  nodes={page.nodes}
                  runningTitle={book.title}
                  isEndCover={!page.hasContent && page.pageNumber > paginatedPages.length}
                />
              </PageSlot>
            ))}
            <PageSlot key="endpaper-back" density="hard" board="right">
              <div className={styles.endpaper} style={endpaperStyle} />
            </PageSlot>
            <PageSlot key="back-cover" density="hard" className={styles.coverPage} board="left">
              {renderScaledCover(<BackCover book={book} />)}
            </PageSlot>
          </HTMLFlipBook>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className={styles.controls}>
        <Button
          size="sm"
          variant="ghost"
          icon={<ChevronLeft size={16} />}
          disabled={isAtStart}
          onClick={goPrevious}
        >
          Previous
        </Button>

        {/* Zoom Controls */}
        <div className={styles.zoomGroup}>
          <Button
            size="sm"
            variant="ghost"
            icon={<ZoomOut size={14} />}
            onClick={onZoomOut}
            disabled={zoom <= 0.6}
            title="Zoom Out (Ctrl + -)"
            aria-label="Zoom Out"
          />
          <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
          <Button
            size="sm"
            variant="ghost"
            icon={<ZoomIn size={14} />}
            onClick={onZoomIn}
            disabled={zoom >= 2.5}
            title="Zoom In (Ctrl + +)"
            aria-label="Zoom In"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<RotateCcw size={14} />}
            onClick={onZoomReset}
            disabled={zoom === 1.0}
            title="Reset Zoom (Ctrl + 0)"
            aria-label="Reset Zoom"
          />
        </div>

        <span className={styles.status} aria-live="polite">
          {getStatusText()}
        </span>
        <Button
          size="sm"
          variant="ghost"
          icon={<ChevronRight size={16} />}
          disabled={isAtEnd}
          onClick={goNext}
        >
          Next
        </Button>
      </div>

      <p className={styles.hint}>
        Click or drag anywhere on pages to flip, use Next/Previous buttons, or Arrow keys
      </p>
    </section>
  );
};
