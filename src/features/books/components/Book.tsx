import React, { useState, useEffect, useRef } from "react";
import styles from "./Book.module.css";
import { Book as IBook, getBookDimensions } from "../types/book";
import { BookCover } from "./BookCover";
import { BackCover } from "./BackCover";
import { COVER_PALETTES } from "../../../design/typography";
import {
  BOOKSHELF_EXTRACT_DURATION_MS,
  BOOKSHELF_RETURN_DURATION_MS,
  BOOKSHELF_SETTLE_DURATION_MS,
} from "../../../design/motion";

export interface BookProps {
  book: IBook;
  mode?: "shelf" | "preview" | "cover-only";
  isInteractive?: boolean;
  isActive?: boolean;
  isLifted?: boolean;
  isSettling?: boolean;
  isGhost?: boolean;
  activeSide?: "front" | "back";
  isReturning?: boolean;
  leanAngle?: number;
  onSelect?: (book: IBook) => void;
  onOpenBook?: (book: IBook) => void;
  onSideChange?: (side: "front" | "back") => void;
  onReturnToShelf?: () => void;
  onHoldStart?: (book: IBook, clientX: number, clientY: number, bookRect: DOMRect) => void;
  slotLeft?: number;
  containerWidth?: number;
  previewRotationY?: number;
  previewRotationX?: number;
  scale?: number;
  className?: string;
}

export const Book: React.FC<BookProps> = ({
  book,
  mode = "shelf",
  isInteractive = true,
  isActive = false,
  isLifted = false,
  isSettling = false,
  isGhost = false,
  activeSide = "front",
  isReturning = false,
  leanAngle = 0,
  onSelect,
  onOpenBook,
  onSideChange,
  onReturnToShelf,
  onHoldStart,
  slotLeft = 0,
  containerWidth = 1000,
  previewRotationY = -16,
  previewRotationX = 4,
  scale = 1,
  className = "",
}) => {
  const {
    width = 165,
    height = 225,
    thickness = 44,
    pagesOffset = 5,
    coverThickness = 3,
  } = getBookDimensions(book);

  const palette =
    COVER_PALETTES.find((p) => p.id === book.cover.paletteId) || COVER_PALETTES[0];

  // Dynamic interactive continuous rotation (Y-axis: 0° = front, ±180° = back; X-axis: vertical pitch tilt)
  const [rotationY, setRotationY] = useState<number>(activeSide === "back" ? 180 : 0);
  const [rotationX, setRotationX] = useState<number>(0);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const pointerStartRef = useRef<{
    x: number;
    y: number;
    startRotationY: number;
    startRotationX: number;
    startTime: number;
    hasMoved: boolean;
  } | null>(null);
  const isPointerDownRef = useRef<boolean>(false);

  // Press-and-hold timer for shelf reordering
  const holdTimerRef = useRef<number | null>(null);
  const stowedPointerStartRef = useRef<{ x: number; y: number; startTime: number } | null>(null);
  const suppressNextClickRef = useRef<boolean>(false);

  // Sync angle when activeSide prop updates externally (e.g. keyboard shortcuts)
  useEffect(() => {
    if (!isDragging) {
      setRotationY(activeSide === "back" ? 180 : 0);
      setRotationX(0);
    }
  }, [activeSide, isDragging]);

  // Reset angle when newly extracted
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  useEffect(() => {
    if (isActive) {
      setRotationY(0);
      setRotationX(0);
      setDragOffsetY(0);
      setIsExtracting(true);
      const timer = window.setTimeout(() => {
        setIsExtracting(false);
      }, BOOKSHELF_EXTRACT_DURATION_MS);
      return () => clearTimeout(timer);
    } else {
      setIsExtracting(false);
    }
  }, [isActive]);

  // Calculate horizontal edge compensation to keep centered cover inside visible scene
  let edgeCompensationX = 0;
  if (isActive && mode === "shelf") {
    const slotCenter = slotLeft + (thickness * scale) / 2;
    const halfCoverWidth = (width * scale) / 2;
    const bookLeft = slotCenter - halfCoverWidth;
    const bookRight = slotCenter + halfCoverWidth;
    const minSafeLeft = 24;
    const maxSafeRight = containerWidth - 24;

    if (bookRight > maxSafeRight) {
      edgeCompensationX = maxSafeRight - bookRight;
    } else if (bookLeft < minSafeLeft) {
      edgeCompensationX = minSafeLeft - bookLeft;
    }
  }

  // Pointer gesture handlers for active extracted book (continuous centered horizontal flipping, vertical tilt & pull-down return)
  const handleActivePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractive || !isActive || mode !== "shelf") return;
    if (e.button !== 0) return;

    e.stopPropagation();
    isPointerDownRef.current = true;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startRotationY: rotationY,
      startRotationX: rotationX,
      startTime: Date.now(),
      hasMoved: false,
    };
    setIsDragging(true);
    setDragOffsetY(0);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleActivePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || !pointerStartRef.current) return;
    e.stopPropagation();

    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;

    if (Math.hypot(deltaX, deltaY) > 5) {
      pointerStartRef.current.hasMoved = true;
    }

    // Check if dragging downward to return to shelf
    if (deltaY > 60 && deltaY > Math.abs(deltaX) * 1.3) {
      const pullDown = Math.max(0, Math.min(80, deltaY - 60));
      setDragOffsetY(pullDown);
      return;
    }
    setDragOffsetY(0);

    // Centered horizontal rotation (Y-axis)
    const SENSITIVITY_Y = 0.85; // deg per px
    const nextRotationY = pointerStartRef.current.startRotationY + deltaX * SENSITIVITY_Y;
    setRotationY(nextRotationY);

    // Centered vertical rotation (X-axis): tilting up/down clamped to [-32°, +32°]
    const SENSITIVITY_X = 0.45; // deg per px
    const rawRotationX = pointerStartRef.current.startRotationX - deltaY * SENSITIVITY_X;
    const clampedRotationX = Math.max(-32, Math.min(32, rawRotationX));
    setRotationX(clampedRotationX);
  };

  const handleActivePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    e.stopPropagation();
    isPointerDownRef.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const startInfo = pointerStartRef.current;
    pointerStartRef.current = null;

    if (!startInfo) return;

    const duration = Date.now() - startInfo.startTime;
    const deltaY = e.clientY - startInfo.y;
    const totalDist = Math.hypot(e.clientX - startInfo.x, e.clientY - startInfo.y);

    // 1. If pulled downward past threshold -> return to shelf!
    if (deltaY > 50 && dragOffsetY > 18) {
      setDragOffsetY(0);
      onReturnToShelf?.();
      return;
    }
    setDragOffsetY(0);

    // 2. Only a clean quick click (< 250ms and <= 6px movement) opens the book pages!
    if (!startInfo.hasMoved && totalDist <= 6 && duration < 250 && dragOffsetY <= 5) {
      onOpenBook?.(book);
      return;
    }

    // 3. Smoothly settle vertical rotation back to 0° (upright)
    setRotationX(0);

    // 4. Settling threshold for centered horizontal rotation: snap to nearest front (0°) or back (180°)
    const normAngle = ((rotationY % 360) + 360) % 360;
    const isCloserToBack = normAngle >= 90 && normAngle <= 270;
    const turns = isCloserToBack
      ? Math.round((rotationY - 180) / 360)
      : Math.round(rotationY / 360);
    const targetRotationY = isCloserToBack ? turns * 360 + 180 : turns * 360;

    setRotationY(targetRotationY);
    onSideChange?.(isCloserToBack ? "back" : "front");
  };

  // Press-and-hold interaction handlers for stowed shelf book
  const handleStowedPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractive || isActive || isGhost || mode !== "shelf") return;
    if (e.button !== 0) return;

    stowedPointerStartRef.current = { x: e.clientX, y: e.clientY, startTime: Date.now() };
    suppressNextClickRef.current = false;
    const rect = e.currentTarget.getBoundingClientRect();

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }

    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      suppressNextClickRef.current = true;
      stowedPointerStartRef.current = null;
      onHoldStart?.(book, e.clientX, e.clientY, rect);
    }, 280);
  };

  const handleStowedPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stowedPointerStartRef.current) return;
    const dx = Math.abs(e.clientX - stowedPointerStartRef.current.x);
    const dy = Math.abs(e.clientY - stowedPointerStartRef.current.y);
    if (dx > 6 || dy > 6) {
      suppressNextClickRef.current = true;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      stowedPointerStartRef.current = null;
    }
  };

  const handleStowedPointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (stowedPointerStartRef.current) {
      const duration = Date.now() - stowedPointerStartRef.current.startTime;
      if (duration >= 250) {
        suppressNextClickRef.current = true;
      }
    }
    stowedPointerStartRef.current = null;
  };

  // Double-click front cover to open workspace
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !isActive || mode !== "shelf") return;
    e.stopPropagation();
    onOpenBook?.(book);
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    if (!isActive) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect?.(book);
      }
    } else {
      if (e.key === "Enter") {
        e.preventDefault();
        onOpenBook?.(book);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onReturnToShelf?.();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        const norm = ((rotationY % 360) + 360) % 360;
        const currentlyBack = norm >= 90 && norm <= 270;
        const nextSide = currentlyBack ? "front" : "back";
        setRotationY(nextSide === "back" ? 180 : 0);
        setRotationX(0);
        onSideChange?.(nextSide);
      }
    }
  };

  // Style calculation based on state
  let transformStyle: string | undefined;
  let stateClass = styles.stowed;

  if (mode === "preview") {
    stateClass = styles.previewMode;
    transformStyle = `rotateY(${previewRotationY}deg) rotateX(${previewRotationX}deg)`;
  } else if (isActive) {
    if (isExtracting) {
      stateClass = styles.extracting;
      transformStyle = undefined;
    } else {
      stateClass = `${styles.extracted} ${isDragging ? styles.extractedDragging : styles.extractedSettled}`;
      transformStyle = `translateX(${edgeCompensationX}px) translateY(${dragOffsetY}px) translateZ(var(--book-extract-z, 90px)) rotateY(${rotationY}deg) rotateX(${rotationX}deg)`;
    }
  } else if (isLifted) {
    stateClass = styles.lifted;
  } else if (isSettling) {
    stateClass = styles.settling;
  } else if (isGhost) {
    stateClass = styles.ghost;
  } else if (isReturning) {
    stateClass = styles.returning;
  }

  const isLeaning =
    mode === "shelf" &&
    !isActive &&
    !isLifted &&
    !isSettling &&
    !isGhost &&
    !isReturning &&
    leanAngle !== 0;

  // Collision-safe hard shelf plane constraint. The stowed mesh is centered into
  // its slot in CSS, so these left/right pivots are exact mirrors.
  // - Right lean/fall (leanAngle > 0): pivots from bottom-left corner (0% 100%) with translateY(-thickness * sin(leanAngle)).
  // - Left lean/fall (leanAngle < 0): pivots from bottom-right corner (100% 100%) with translateY(-thickness * sin(|leanAngle|)).
  // This guarantees that for BOTH directions, the lowest transformed point sits exactly on the shelf top baseline.
  const absLeanRad = (Math.abs(leanAngle || 0) * Math.PI) / 180;
  const shelfCollisionOffsetY = isLeaning
    ? -Math.round(thickness * Math.sin(absLeanRad) * scale * 100) / 100
    : 0;

  const containerTransform = isLeaning
    ? `translateY(${shelfCollisionOffsetY}px) rotateZ(${leanAngle}deg)`
    : undefined;

  const containerTransformOrigin = isLeaning
    ? leanAngle > 0
      ? "0% 100%"
      : "100% 100%"
    : undefined;

  return (
    <div
      role={mode === "shelf" && isInteractive && !isGhost ? "button" : undefined}
      tabIndex={mode === "shelf" && isInteractive && !isGhost ? 0 : undefined}
      aria-label={`Book: ${book.title}${book.cover.authorName ? ` by ${book.cover.authorName}` : ""}. ${isActive ? "Click book to open. Drag horizontally to flip. Drag down or press Escape to return." : "Click to inspect. Press and hold to reorder on shelf."}`}
      aria-expanded={isActive}
      onClick={(e) => {
        if (mode === "shelf" && isInteractive && !isGhost) {
          e.stopPropagation();
          if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
          }
          if (!isActive) {
            onSelect?.(book);
          }
        }
      }}
      onDoubleClick={handleDoubleClick}
      onPointerDown={isActive ? handleActivePointerDown : handleStowedPointerDown}
      onPointerMove={isActive ? handleActivePointerMove : handleStowedPointerMove}
      onPointerUp={isActive ? handleActivePointerUp : handleStowedPointerUp}
      onPointerCancel={isActive ? handleActivePointerUp : handleStowedPointerUp}
      onKeyDown={handleKeyDown}
      className={`${styles.bookContainer} ${mode === "shelf" ? styles.shelfDepthParticipant : styles.localPerspective} ${isInteractive && !isGhost ? styles.interactive : ""} ${className}`}
      style={
        {
          width: mode === "shelf" ? thickness * scale : width * scale,
          height: height * scale,
          transform: containerTransform,
          transformOrigin: containerTransformOrigin,
          "--cover-width": `${width * scale}px`,
          "--cover-height": `${height * scale}px`,
          "--book-thickness": `${thickness * scale}px`,
          "--pages-offset": `${pagesOffset * scale}px`,
          "--cover-thickness": `${coverThickness * scale}px`,
          "--book-spine-color": palette.spineColor,
          "--book-spine-grad": palette.textureGradient,
          "--book-spine-text": palette.textColor,
          "--book-primary": palette.primary,
          "--book-accent": palette.accent,
          "--edge-compensation-x": `${edgeCompensationX}px`,
          "--extract-duration": `${BOOKSHELF_EXTRACT_DURATION_MS}ms`,
          "--return-duration": `${BOOKSHELF_RETURN_DURATION_MS}ms`,
          "--settle-duration": `${BOOKSHELF_SETTLE_DURATION_MS}ms`,
        } as React.CSSProperties
      }
    >
      {/* Contact shadow cast beneath book */}
      {mode === "shelf" && !isLifted && !isGhost && <div className={styles.shelfShadow} />}

      {/* 3D Physical Book Body */}
      <div
        className={`${styles.bookBody} ${stateClass}`}
        style={{
          width: width * scale,
          height: height * scale,
          transform: transformStyle,
        }}
      >
        {/* 1. Spine Surface (Left plane at X = 0, facing -X) */}
        <div className={styles.spineFacet}>
          <div className={styles.spineLighting} />
          <div className={styles.spineHeadbandTop} />
          <div className={styles.spineHeadbandBottom} />

          {/* Embossed ribs along spine */}
          <div className={`${styles.spineRib} ${styles.spineRibTop}`} />
          <div className={`${styles.spineRib} ${styles.spineRibMid}`} />
          <div className={`${styles.spineRib} ${styles.spineRibBottom}`} />

          {/* Spine Content */}
          <div className={styles.spineContent}>
            {book.cover.badgeText ? (
              <span className={styles.spineBadge}>{book.cover.badgeText}</span>
            ) : (
              <div />
            )}

            <div className={styles.spineTitleSection}>
              <span className={styles.spineTitle}>{book.title}</span>
            </div>

            {book.cover.authorName ? (
              <span className={styles.spineAuthor}>{book.cover.authorName}</span>
            ) : (
              <div />
            )}
          </div>
        </div>

        {/* 2. Front Cover Board (3D Hardcover Slab Volume) */}
        <div className={styles.frontCoverFace}>
          <BookCover
            cover={book.cover}
            title={book.title}
            subtitle={book.subtitle}
          />
        </div>
        <div className={styles.frontInsideFace} />
        <div className={styles.frontRightEdge} />
        <div className={styles.frontTopEdge} />
        <div className={styles.frontBottomEdge} />

        {/* 3. Back Cover Board (3D Hardcover Slab Volume) */}
        <div className={styles.backCoverFace}>
          <BackCover book={book} />
        </div>
        <div className={styles.backInsideFace} />
        <div className={styles.backRightEdge} />
        <div className={styles.backTopEdge} />
        <div className={styles.backBottomEdge} />

        {/* 4. Fore-Edge (Right page block at X = coverWidth - pagesOffset, facing +X) */}
        <div className={styles.foreEdgeFacet} />

        {/* 5. Top Page Edge (Top page block at Y = pagesOffset, facing -Y) */}
        <div className={styles.topEdgeFacet} />

        {/* 6. Bottom Page Edge (Bottom page block at Y = height - pagesOffset, facing +Y) */}
        <div className={styles.bottomEdgeFacet} />

        {/* 7. Page Block Endpapers (Solid Paper Core preventing hollow views during rotation) */}
        <div className={styles.frontEndpaper} />
        <div className={styles.backEndpaper} />
      </div>
    </div>
  );
};
