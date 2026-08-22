import React, { useState, useEffect, useRef } from "react";
import styles from "./Book.module.css";
import { Book as IBook, getBookDimensions } from "../types/book";
import { BookCover } from "./BookCover";
import { BackCover } from "./BackCover";
import { COVER_PALETTES } from "../../../design/typography";

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

  // Dynamic interactive continuous rotation (0° = front, ±180° = back)
  const [currentAngle, setCurrentAngle] = useState<number>(activeSide === "back" ? 180 : 0);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const pointerStartRef = useRef<{ x: number; y: number; startAngle: number } | null>(null);
  const isPointerDownRef = useRef<boolean>(false);

  // Press-and-hold timer for shelf reordering
  const holdTimerRef = useRef<number | null>(null);
  const stowedPointerStartRef = useRef<{ x: number; y: number } | null>(null);

  // Sync angle when activeSide prop updates externally (e.g. keyboard shortcuts)
  useEffect(() => {
    if (!isDragging) {
      setCurrentAngle(activeSide === "back" ? 180 : 0);
    }
  }, [activeSide, isDragging]);

  // Reset angle when newly extracted
  useEffect(() => {
    if (isActive) {
      setCurrentAngle(0);
      setDragOffsetY(0);
    }
  }, [isActive]);

  // Calculate horizontal edge compensation to keep cover inside visible scene
  let edgeCompensationX = 0;
  if (isActive && mode === "shelf") {
    const bookRightEdge = slotLeft + width * scale;
    const maxSafeRight = containerWidth - 40;
    if (bookRightEdge > maxSafeRight) {
      edgeCompensationX = -(bookRightEdge - maxSafeRight);
    } else if (slotLeft < 40) {
      edgeCompensationX = 40 - slotLeft;
    }
  }

  // Pointer gesture handlers for active extracted book (continuous bidirectional flipping & pull-down return)
  const handleActivePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractive || !isActive || mode !== "shelf") return;
    if (e.button !== 0) return;

    e.stopPropagation();
    isPointerDownRef.current = true;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startAngle: currentAngle,
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

    // Check if dragging downward to return to shelf
    if (deltaY > 12 && deltaY > Math.abs(deltaX) * 1.05) {
      const pullDown = Math.max(0, Math.min(80, deltaY - 12));
      setDragOffsetY(pullDown);

      // Slightly tilt angle toward 90deg (spine) as downward drag increases
      const returnRatio = Math.min(1, pullDown / 50);
      const baseAngle = pointerStartRef.current.startAngle;
      const interpolatedAngle = baseAngle + (90 - baseAngle) * (returnRatio * 0.35);
      setCurrentAngle(interpolatedAngle);
      return;
    }

    // Horizontal continuous bidirectional drag
    setDragOffsetY(0);
    const startAngle = pointerStartRef.current.startAngle;
    const SENSITIVITY = 0.95; // deg per px

    if (Math.abs(startAngle) < 10) {
      // Starting from Front (0°):
      const nextAngle = Math.max(-180, Math.min(180, deltaX * SENSITIVITY));
      setCurrentAngle(nextAngle);
    } else {
      // Starting from Back (±180°):
      if (startAngle >= 0) {
        if (deltaX <= 0) {
          const nextAngle = Math.max(0, Math.min(180, 180 + deltaX * SENSITIVITY));
          setCurrentAngle(nextAngle);
        } else {
          const nextAngle = Math.max(0, Math.min(180, 180 - deltaX * SENSITIVITY));
          setCurrentAngle(nextAngle);
        }
      } else {
        if (deltaX >= 0) {
          const nextAngle = Math.min(0, Math.max(-180, -180 + deltaX * SENSITIVITY));
          setCurrentAngle(nextAngle);
        } else {
          const nextAngle = Math.min(0, Math.max(-180, -180 - deltaX * SENSITIVITY));
          setCurrentAngle(nextAngle);
        }
      }
    }
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

    const deltaY = e.clientY - startInfo.y;

    // 1. If pulled downward past threshold -> return to shelf!
    if (deltaY > 35 && dragOffsetY > 18) {
      setDragOffsetY(0);
      onReturnToShelf?.();
      return;
    }
    setDragOffsetY(0);

    // 2. Settling threshold for bidirectional horizontal rotation
    const startAngle = startInfo.startAngle;
    let targetAngle = startAngle;

    if (Math.abs(startAngle) < 10) {
      if (Math.abs(currentAngle) > 45) {
        targetAngle = currentAngle < 0 ? -180 : 180;
      } else {
        targetAngle = 0;
      }
    } else {
      if (Math.abs(currentAngle) < 135) {
        targetAngle = 0;
      } else {
        targetAngle = startAngle < 0 ? -180 : 180;
      }
    }

    setCurrentAngle(targetAngle);
    onSideChange?.(Math.abs(targetAngle) >= 90 ? "back" : "front");
  };

  // Press-and-hold interaction handlers for stowed shelf book
  const handleStowedPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractive || isActive || isGhost || mode !== "shelf") return;
    if (e.button !== 0) return;

    stowedPointerStartRef.current = { x: e.clientX, y: e.clientY };
    const rect = e.currentTarget.getBoundingClientRect();

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }

    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      stowedPointerStartRef.current = null;
      onHoldStart?.(book, e.clientX, e.clientY, rect);
    }, 280);
  };

  const handleStowedPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stowedPointerStartRef.current) return;
    const dx = Math.abs(e.clientX - stowedPointerStartRef.current.x);
    const dy = Math.abs(e.clientY - stowedPointerStartRef.current.y);
    if (dx > 6 || dy > 6) {
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
    stowedPointerStartRef.current = null;
  };

  // Double-click front cover to open workspace
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !isActive || mode !== "shelf") return;
    e.stopPropagation();

    if (Math.abs(currentAngle) <= 60) {
      onOpenBook?.(book);
    }
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
        const nextSide = Math.abs(currentAngle) >= 90 ? "front" : "back";
        setCurrentAngle(nextSide === "back" ? 180 : 0);
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
    stateClass = `${styles.extracted} ${isDragging ? styles.extractedDragging : styles.extractedSettled}`;
    transformStyle = `translateX(${edgeCompensationX}px) translateY(${dragOffsetY}px) translateZ(var(--book-extract-z, 90px)) rotateY(${currentAngle}deg)`;
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
      aria-label={`Book: ${book.title}${book.cover.authorName ? ` by ${book.cover.authorName}` : ""}. ${isActive ? "Double-click front cover to open. Drag horizontally to flip. Drag down or press Escape to return." : "Click to inspect. Press and hold to reorder on shelf."}`}
      aria-expanded={isActive}
      onClick={(e) => {
        if (mode === "shelf" && isInteractive && !isActive && !isGhost) {
          e.stopPropagation();
          onSelect?.(book);
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
