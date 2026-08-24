import React, { useState, useRef, useEffect } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Edit3,
} from "lucide-react";
import styles from "./ResizableImageNodeView.module.css";

export const ResizableImageNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  deleteNode,
}) => {
  const { src, alt, caption, width, align, wrapMode = "wrap-left" } = node.attrs;

  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState<string>(width || "50%");
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(caption || "");

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragInfoRef = useRef<{
    startX: number;
    startWidth: number;
    handle: string;
    parentWidth: number;
  }>({
    startX: 0,
    startWidth: 0,
    handle: "",
    parentWidth: 600,
  });

  useEffect(() => {
    setCurrentWidth(width || "50%");
  }, [width]);

  useEffect(() => {
    setCaptionText(caption || "");
  }, [caption]);

  // Resolve wrap class
  let wrapClass = styles.wrapLeft;
  if (wrapMode === "wrap-right" || align === "right") {
    wrapClass = styles.wrapRight;
  } else if (wrapMode === "inline" || align === "center") {
    wrapClass = styles.wrapInline;
  } else if (wrapMode === "break-text" || align === "full") {
    wrapClass = styles.wrapBreak;
  }

  // Pointer down on resize handle
  const handleResizeStart = (handle: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const containerEl = containerRef.current;
    if (!containerEl) return;

    const parentPageEl = containerEl.closest(".booknote-page-node") as HTMLElement | null;
    const parentWidth = parentPageEl ? parentPageEl.clientWidth - 80 : 650;

    dragInfoRef.current = {
      startX: e.clientX,
      startWidth: containerEl.offsetWidth,
      handle,
      parentWidth,
    };

    setIsResizing(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const { startX, startWidth, handle, parentWidth } = dragInfoRef.current;

    let deltaX = e.clientX - startX;
    if (handle.includes("w") && !handle.includes("e")) {
      // Dragging left handle: moving left expands, moving right shrinks
      deltaX = -deltaX;
    }

    const nextWidthPx = Math.max(80, Math.min(parentWidth, startWidth + deltaX));
    setCurrentWidth(`${Math.round(nextWidthPx)}px`);
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (!isResizing) return;
    setIsResizing(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    updateAttributes({
      width: currentWidth,
    });
  };

  const setWrap = (mode: "wrap-left" | "wrap-right" | "inline") => {
    updateAttributes({
      wrapMode: mode,
      align: mode === "wrap-left" ? "left" : mode === "wrap-right" ? "right" : "center",
    });
  };

  const handleCaptionBlur = () => {
    setIsEditingCaption(false);
    updateAttributes({ caption: captionText.trim() });
  };

  const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCaptionBlur();
    }
  };

  return (
    <NodeViewWrapper
      as="figure"
      ref={containerRef}
      className={`${styles.wrapper} ${wrapClass} ${selected ? styles.selected : ""} ${
        isResizing ? styles.resizing : ""
      }`}
      style={{
        width: currentWidth,
        maxWidth: "100%",
      }}
      data-type="book-image"
      data-wrap={wrapMode}
    >
      {/* Floating Action Toolbar on Selected Image */}
      {selected && (
        <div className={styles.floatingToolbar} contentEditable={false}>
          {/* Wrap Mode Controls */}
          <div className={styles.toolbarGroup}>
            <button
              type="button"
              className={`${styles.toolbarBtn} ${
                wrapMode === "wrap-left" ? styles.toolbarBtnActive : ""
              }`}
              onClick={() => setWrap("wrap-left")}
              title="Wrap Text Left (Float Left)"
            >
              <AlignLeft size={13} />
              <span>Wrap Left</span>
            </button>
            <button
              type="button"
              className={`${styles.toolbarBtn} ${
                wrapMode === "inline" ? styles.toolbarBtnActive : ""
              }`}
              onClick={() => setWrap("inline")}
              title="In Line with Text (Centered)"
            >
              <AlignCenter size={13} />
              <span>Inline</span>
            </button>
            <button
              type="button"
              className={`${styles.toolbarBtn} ${
                wrapMode === "wrap-right" ? styles.toolbarBtnActive : ""
              }`}
              onClick={() => setWrap("wrap-right")}
              title="Wrap Text Right (Float Right)"
            >
              <AlignRight size={13} />
              <span>Wrap Right</span>
            </button>
          </div>

          <div className={styles.toolbarSeparator} />

          {/* Caption & Delete */}
          <div className={styles.toolbarGroup}>
            <button
              type="button"
              className={styles.toolbarBtn}
              onClick={() => setIsEditingCaption(true)}
              title="Edit Caption"
            >
              <Edit3 size={13} />
              <span>Caption</span>
            </button>
            <button
              type="button"
              className={`${styles.toolbarBtn} ${styles.toolbarBtnDanger}`}
              onClick={deleteNode}
              title="Delete Image"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Image Container with Resize Handles */}
      <div className={styles.imageContainer}>
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          className={styles.imageElement}
          draggable={false}
        />

        {/* Resize Handles (rendered when selected) */}
        {selected && (
          <>
            <div
              className={`${styles.handle} ${styles.handleNW}`}
              onPointerDown={(e) => handleResizeStart("nw", e)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            />
            <div
              className={`${styles.handle} ${styles.handleNE}`}
              onPointerDown={(e) => handleResizeStart("ne", e)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            />
            <div
              className={`${styles.handle} ${styles.handleSW}`}
              onPointerDown={(e) => handleResizeStart("sw", e)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            />
            <div
              className={`${styles.handle} ${styles.handleSE}`}
              onPointerDown={(e) => handleResizeStart("se", e)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            />
            <div
              className={`${styles.handle} ${styles.handleW}`}
              onPointerDown={(e) => handleResizeStart("w", e)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            />
            <div
              className={`${styles.handle} ${styles.handleE}`}
              onPointerDown={(e) => handleResizeStart("e", e)}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            />
          </>
        )}

        {/* Live Size Badge during resize */}
        {isResizing && <div className={styles.sizeBadge}>{currentWidth}</div>}
      </div>

      {/* Caption Field */}
      {(captionText || isEditingCaption || selected) && (
        <figcaption className={styles.captionWrapper} contentEditable={false}>
          {isEditingCaption ? (
            <input
              type="text"
              className={styles.captionInput}
              value={captionText}
              placeholder="Add an image caption..."
              onChange={(e) => setCaptionText(e.target.value)}
              onBlur={handleCaptionBlur}
              onKeyDown={handleCaptionKeyDown}
              autoFocus
            />
          ) : (
            <span
              className={styles.captionInput}
              onClick={() => setIsEditingCaption(true)}
              title="Click to edit caption"
            >
              {captionText || "Click to add caption..."}
            </span>
          )}
        </figcaption>
      )}
    </NodeViewWrapper>
  );
};
