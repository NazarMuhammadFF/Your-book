import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  onPageIndexChange: (pageIndex: number) => void;
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
  onPageIndexChange,
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
      if (availableWidth > 0 && targetSpreadWidth > 0) {
        const nextScale = Math.min(1, Math.max(0.35, availableWidth / targetSpreadWidth));
        setScale(nextScale);
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [targetSpreadWidth]);

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
            transform: scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: "top left",
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
            isMouseMoveEvent={true}
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
        Hover or drag page corners, click Next/Previous, or use Arrow keys to flip
      </p>
    </section>
  );
};
