import React, { useRef } from "react";
import { Editor } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Image as ImageIcon,
  Minus,
  Undo2,
  Redo2,
  Columns2,
  Rows3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Book, BookTypography, FONT_SIZE_OPTIONS } from "../../books/types/book";
import { FONT_FAMILIES } from "../../../design/typography";
import styles from "./EditorToolbar.module.css";

export interface EditorToolbarProps {
  editor: Editor | null;
  book: Book;
  layoutMode?: "vertical" | "spread";
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onToggleLayoutMode?: () => void;
  onUpdateTypography: (newTypography: BookTypography) => void;
  onOpenImageDialog?: () => void;
  className?: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  book,
  layoutMode = "vertical",
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleLayoutMode,
  onUpdateTypography,
  onOpenImageDialog,
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typography = book.typography;

  const handleImageUploadClick = (e: React.MouseEvent) => {
    if (e.shiftKey && onOpenImageDialog) {
      onOpenImageDialog();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      if (dataUrl) {
        editor
          .chain()
          .focus()
          .setCustomImage({
            src: dataUrl,
            alt: file.name.replace(/\.[^/.]+$/, ""),
            width: "50%",
            align: "left",
            wrapMode: "wrap-left",
          })
          .run();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (!editor) return null;

  const currentBlockType = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
    ? "h3"
    : editor.isActive("blockquote")
    ? "quote"
    : editor.isActive("bulletList")
    ? "bulletList"
    : editor.isActive("orderedList")
    ? "orderedList"
    : editor.isActive("taskList")
    ? "taskList"
    : "paragraph";

  const activeInlineFontSize = editor.getAttributes("textStyle").fontSize?.replace("px", "");
  const displayedFontSize = activeInlineFontSize || String(typography.fontSize || 15.5);

  const handleBlockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "p") editor.chain().focus().setParagraph().run();
    else if (val === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
    else if (val === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (val === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
    else if (val === "quote") editor.chain().focus().toggleBlockquote().run();
    else if (val === "bulletList") editor.chain().focus().toggleBulletList().run();
    else if (val === "orderedList") editor.chain().focus().toggleOrderedList().run();
    else if (val === "taskList") editor.chain().focus().toggleTaskList().run();
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fontFamilyId = e.target.value;
    onUpdateTypography({
      ...typography,
      fontFamilyId,
    });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    if (!val) return;

    // Update canonical typography
    onUpdateTypography({
      ...typography,
      fontSize: val,
    });

    // Also update selection if text is selected
    if (!editor.state.selection.empty) {
      editor.chain().focus().setFontSize(`${val}px`).run();
    }
  };

  const handleAlignmentChange = (align: "left" | "center" | "right" | "justify") => {
    editor.chain().focus().setTextAlign(align).run();
    onUpdateTypography({
      ...typography,
      textAlignment: align,
    });
  };

  return (
    <div className={`${styles.toolbar} ${className}`} role="toolbar" aria-label="Editor formatting toolbar">
      {/* 1. Block Structure & Typography */}
      <div className={styles.group}>
        <select
          className={styles.blockSelect}
          value={currentBlockType}
          onChange={handleBlockChange}
          aria-label="Text block structure"
          title="Paragraph / Headings"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="quote">Quote</option>
          <option value="bulletList">Bullet List</option>
          <option value="orderedList">Numbered List</option>
          <option value="taskList">Checklist</option>
        </select>

        {/* Font Family Selector */}
        <select
          className={styles.fontFamilySelect}
          value={typography.fontFamilyId || "serif"}
          onChange={handleFontFamilyChange}
          aria-label="Font Family"
          title="Document Font Family"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        {/* Base Font Size Selector */}
        <select
          className={styles.fontSizeSelect}
          value={displayedFontSize}
          onChange={handleFontSizeChange}
          aria-label="Font Size"
          title="Base Font Size"
        >
          {FONT_SIZE_OPTIONS.map((sz) => (
            <option key={sz} value={String(sz)}>
              {sz}px
            </option>
          ))}
        </select>
      </div>

      <div className={styles.separator} />

      {/* 2. Text Alignment */}
      <div className={styles.group}>
        <button
          type="button"
          className={`${styles.toolBtn} ${
            editor.isActive({ textAlign: "left" }) || typography.textAlignment === "left"
              ? styles.active
              : ""
          }`}
          onClick={() => handleAlignmentChange("left")}
          title="Align Left"
          aria-label="Align Left"
        >
          <AlignLeft size={14} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${
            editor.isActive({ textAlign: "center" }) || typography.textAlignment === "center"
              ? styles.active
              : ""
          }`}
          onClick={() => handleAlignmentChange("center")}
          title="Align Center"
          aria-label="Align Center"
        >
          <AlignCenter size={14} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${
            editor.isActive({ textAlign: "right" }) || typography.textAlignment === "right"
              ? styles.active
              : ""
          }`}
          onClick={() => handleAlignmentChange("right")}
          title="Align Right"
          aria-label="Align Right"
        >
          <AlignRight size={14} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${
            editor.isActive({ textAlign: "justify" }) || typography.textAlignment === "justify"
              ? styles.active
              : ""
          }`}
          onClick={() => handleAlignmentChange("justify")}
          title="Justify"
          aria-label="Justify"
        >
          <AlignJustify size={14} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* 3. Lists & Blocks Shortcut */}
      <div className={styles.group}>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("bulletList") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("orderedList") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered size={14} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("taskList") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Checklist"
          aria-label="Checklist"
        >
          <CheckSquare size={14} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("blockquote") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
          aria-label="Quote"
        >
          <Quote size={14} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* 4. Media & Break */}
      <div className={styles.group}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageFileChange}
        />
        <button
          type="button"
          className={styles.toolBtn}
          onClick={handleImageUploadClick}
          title="Insert Image"
          aria-label="Insert Image"
        >
          <ImageIcon size={14} />
        </button>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider Line"
          aria-label="Divider Line"
        >
          <Minus size={14} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* 5. History */}
      <div className={styles.group}>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 size={14} />
        </button>
      </div>

      {onToggleLayoutMode && (
        <>
          <div className={styles.separator} />
          {/* 6. Layout View Switcher */}
          <div className={styles.group}>
            <button
              type="button"
              className={`${styles.toolBtn} ${layoutMode === "spread" ? styles.active : ""}`}
              onClick={onToggleLayoutMode}
              title={
                layoutMode === "spread"
                  ? "Switch to Single-Page Vertical Flow"
                  : "Switch to Two-Page Book Spread"
              }
              aria-label="Toggle Page Layout"
            >
              {layoutMode === "spread" ? <Rows3 size={14} /> : <Columns2 size={14} />}
            </button>
          </div>
        </>
      )}

      {/* 7. Zoom Controls */}
      {zoom !== undefined && onZoomIn && onZoomOut && onZoomReset && (
        <>
          <div className={styles.separator} />
          <div className={styles.group}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={onZoomOut}
              disabled={zoom <= 0.6}
              title="Zoom Out (Ctrl + -)"
              aria-label="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            
            <span className={styles.zoomDisplay}>
              {Math.round(zoom * 100)}%
            </span>
            
            <button
              type="button"
              className={styles.toolBtn}
              onClick={onZoomIn}
              disabled={zoom >= 2.5}
              title="Zoom In (Ctrl + +)"
              aria-label="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            
            <button
              type="button"
              className={styles.toolBtn}
              onClick={onZoomReset}
              disabled={zoom === 1.0}
              title="Reset Zoom (Ctrl + 0)"
              aria-label="Reset Zoom"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
