import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import HTMLFlipBook, { FlipBookRef } from "react-pageflip";
import { Button } from "../../../components/ui/Button";
import { Book, getBookPageMetrics } from "../../books/types/book";
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
}

const PageSlot = React.forwardRef<HTMLDivElement, PageSlotProps>(
  ({ children, density = "soft", className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.flipPage} ${className}`}
        data-density={density}
      >
        {children}
      </div>
    );
  }
);
PageSlot.displayName = "PageSlot";

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
  const [currentPage, setCurrentPage] = useState<number>(pageIndex);

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

  const handleFlip = (e: { data: number }) => {
    setCurrentPage(e.data);
    onPageIndexChange(e.data);
  };

  const goNext = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const goPrevious = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  const isAtStart = currentPage <= 0;
  const isAtEnd = currentPage >= displayPages.length - 2;

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
    const startNum = currentPage + 1;
    const endNum = Math.min(currentPage + 2, displayPages.length);
    return `Pages ${startNum}–${endNum} of ${displayPages.length}`;
  };

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
            flippingTime={600}
            usePortrait={false}
            startPage={currentPage}
            clickEventForward={false}
            useMouseEvents={true}
            swipeDistance={30}
            showCover={false}
            mobileScrollSupport={true}
            onFlip={handleFlip}
          >
            {displayPages.map((page) => (
              <PageSlot key={`interior-${page.pageNumber}`} density="soft">
                <ReaderPage
                  book={book}
                  pageNumber={page.pageNumber}
                  totalPages={displayPages.length}
                  nodes={page.nodes}
                  runningTitle={book.title}
                  isEndCover={!page.hasContent && page.pageNumber > paginatedPages.length}
                />
              </PageSlot>
            ))}
          </HTMLFlipBook>
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
