import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  Palette,
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
  RemoveFormatting,
  SlidersHorizontal,
  LayoutTemplate,
} from "lucide-react";
import {
  Book,
  BookTypography,
  PageMargins,
  FONT_SIZE_OPTIONS,
  DEFAULT_PAGE_MARGINS,
  getBookPageMargins,
} from "../../books/types/book";
import { FONT_FAMILIES } from "../../../design/typography";
import styles from "./EditorToolbar.module.css";

export interface EditorToolbarProps {
  editor: Editor | null;
  book: Book;
  onUpdateTypography: (newTypography: BookTypography) => void;
  onOpenImageDialog?: () => void;
  className?: string;
}

const COLOR_PALETTE = [
  { name: "Default", color: "inherit" },
  { name: "Dark Slate", color: "#29231d" },
  { name: "Navy", color: "#1e3a5f" },
  { name: "Burgundy", color: "#7a2828" },
  { name: "Forest Green", color: "#2d5a3f" },
  { name: "Warm Ochre", color: "#a06214" },
  { name: "Muted Gray", color: "#736b63" },
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  book,
  onUpdateTypography,
  onOpenImageDialog,
  className = "",
}) => {
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isSpacingMenuOpen, setIsSpacingMenuOpen] = useState(false);
  const [isMarginsMenuOpen, setIsMarginsMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const spacingMenuRef = useRef<HTMLDivElement>(null);
  const marginsMenuRef = useRef<HTMLDivElement>(null);

  const typography = book.typography;
  const margins = getBookPageMargins(book);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setIsColorMenuOpen(false);
      }
      if (spacingMenuRef.current && !spacingMenuRef.current.contains(e.target as Node)) {
        setIsSpacingMenuOpen(false);
      }
      if (marginsMenuRef.current && !marginsMenuRef.current.contains(e.target as Node)) {
        setIsMarginsMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  const displayedFontSize = activeInlineFontSize || String(typography.fontSize || 17);

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

  const handleLineHeightChange = (lineHeight: number) => {
    onUpdateTypography({
      ...typography,
      lineHeight,
    });
  };

  const handleParagraphSpacingChange = (paragraphSpacing: number) => {
    onUpdateTypography({
      ...typography,
      paragraphSpacing,
    });
  };

  const handleMarginChange = (side: keyof PageMargins, value: number) => {
    const nextMargins: PageMargins = {
      ...margins,
      [side]: value,
    };
    onUpdateTypography({
      ...typography,
      margins: nextMargins,
    });
  };

  const handleMarginPreset = (preset: "compact" | "normal" | "spacious") => {
    const nextMargins = DEFAULT_PAGE_MARGINS[preset];
    onUpdateTypography({
      ...typography,
      margins: nextMargins,
    });
  };

  const currentMarginPreset =
    margins.top === DEFAULT_PAGE_MARGINS.compact.top &&
    margins.bottom === DEFAULT_PAGE_MARGINS.compact.bottom &&
    margins.left === DEFAULT_PAGE_MARGINS.compact.left &&
    margins.right === DEFAULT_PAGE_MARGINS.compact.right
      ? "compact"
      : margins.top === DEFAULT_PAGE_MARGINS.normal.top &&
        margins.bottom === DEFAULT_PAGE_MARGINS.normal.bottom &&
        margins.left === DEFAULT_PAGE_MARGINS.normal.left &&
        margins.right === DEFAULT_PAGE_MARGINS.normal.right
      ? "normal"
      : margins.top === DEFAULT_PAGE_MARGINS.spacious.top &&
        margins.bottom === DEFAULT_PAGE_MARGINS.spacious.bottom &&
        margins.left === DEFAULT_PAGE_MARGINS.spacious.left &&
        margins.right === DEFAULT_PAGE_MARGINS.spacious.right
      ? "spacious"
      : "custom";

  return (
    <div className={`${styles.toolbar} ${className}`} role="toolbar" aria-label="Editor formatting toolbar">
      {/* Block Structure & Typography */}
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

      {/* Inline Formatting */}
      <div className={styles.group}>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("bold") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold size={15} />
        </button>

        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("italic") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic size={15} />
        </button>

        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("underline") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <UnderlineIcon size={15} />
        </button>

        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("strike") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough size={15} />
        </button>

        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("code") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline Code"
          aria-label="Inline Code"
        >
          <Code size={15} />
        </button>

        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("highlight") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleHighlight({ color: "#ffec99" }).run()}
          title="Highlight"
          aria-label="Highlight"
        >
          <Highlighter size={15} />
        </button>

        {/* Text Color Dropdown */}
        <div className={styles.relativeMenu} ref={colorMenuRef}>
          <button
            type="button"
            className={`${styles.toolBtn} ${isColorMenuOpen ? styles.active : ""}`}
            onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
            title="Text Color"
            aria-label="Text Color"
          >
            <Palette size={15} />
          </button>

          {isColorMenuOpen && (
            <div className={styles.colorPalettePopover}>
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  className={styles.colorOption}
                  onClick={() => {
                    if (c.color === "inherit") editor.chain().focus().unsetColor().run();
                    else editor.chain().focus().setColor(c.color).run();
                    setIsColorMenuOpen(false);
                  }}
                  title={c.name}
                >
                  <span
                    className={styles.colorDot}
                    style={{ backgroundColor: c.color === "inherit" ? "var(--text-primary)" : c.color }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear Formatting"
          aria-label="Clear Formatting"
        >
          <RemoveFormatting size={15} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* Alignment */}
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
          <AlignLeft size={15} />
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
          <AlignCenter size={15} />
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
          <AlignRight size={15} />
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
          <AlignJustify size={15} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* Line & Paragraph Spacing Menu */}
      <div className={styles.relativeMenu} ref={spacingMenuRef}>
        <button
          type="button"
          className={`${styles.toolBtn} ${isSpacingMenuOpen ? styles.active : ""}`}
          onClick={() => setIsSpacingMenuOpen(!isSpacingMenuOpen)}
          title="Line & Paragraph Spacing"
          aria-label="Line & Paragraph Spacing"
        >
          <SlidersHorizontal size={15} />
        </button>

        {isSpacingMenuOpen && (
          <div className={`${styles.popover} ${styles.spacingPopover}`}>
            <div className={styles.popoverHeader}>
              <span className={styles.popoverTitle}>Spacing Settings</span>
            </div>

            <div className={styles.sliderRow}>
              <div className={styles.sliderLabelGroup}>
                <span>Line Height</span>
                <span className={styles.sliderValBadge}>
                  {(typography.lineHeight || 1.68).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="1.2"
                max="2.4"
                step="0.05"
                value={typography.lineHeight || 1.68}
                onChange={(e) => handleLineHeightChange(Number(e.target.value))}
                className={styles.rangeInput}
              />
            </div>

            <div className={styles.sliderRow}>
              <div className={styles.sliderLabelGroup}>
                <span>Paragraph Spacing</span>
                <span className={styles.sliderValBadge}>
                  {typography.paragraphSpacing || 18}px
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="36"
                step="2"
                value={typography.paragraphSpacing || 18}
                onChange={(e) => handleParagraphSpacingChange(Number(e.target.value))}
                className={styles.rangeInput}
              />
            </div>
          </div>
        )}
      </div>

      {/* Page Margins Menu */}
      <div className={styles.relativeMenu} ref={marginsMenuRef}>
        <button
          type="button"
          className={`${styles.toolBtn} ${isMarginsMenuOpen ? styles.active : ""}`}
          onClick={() => setIsMarginsMenuOpen(!isMarginsMenuOpen)}
          title="Page Margins"
          aria-label="Page Margins"
        >
          <LayoutTemplate size={15} />
        </button>

        {isMarginsMenuOpen && (
          <div className={`${styles.popover} ${styles.marginsPopover}`}>
            <div className={styles.popoverHeader}>
              <span className={styles.popoverTitle}>Page Margins</span>
              <div className={styles.presetGroup}>
                <button
                  type="button"
                  className={`${styles.presetMiniBtn} ${
                    currentMarginPreset === "compact" ? styles.presetMiniBtnActive : ""
                  }`}
                  onClick={() => handleMarginPreset("compact")}
                  title="Compact margins"
                >
                  Compact
                </button>
                <button
                  type="button"
                  className={`${styles.presetMiniBtn} ${
                    currentMarginPreset === "normal" ? styles.presetMiniBtnActive : ""
                  }`}
                  onClick={() => handleMarginPreset("normal")}
                  title="Normal margins"
                >
                  Normal
                </button>
                <button
                  type="button"
                  className={`${styles.presetMiniBtn} ${
                    currentMarginPreset === "spacious" ? styles.presetMiniBtnActive : ""
                  }`}
                  onClick={() => handleMarginPreset("spacious")}
                  title="Spacious margins"
                >
                  Spacious
                </button>
              </div>
            </div>

            <div className={styles.marginsGrid}>
              <div className={styles.sliderRow}>
                <div className={styles.sliderLabelGroup}>
                  <span>Top</span>
                  <span className={styles.sliderValBadge}>{margins.top}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="2"
                  value={margins.top}
                  onChange={(e) => handleMarginChange("top", Number(e.target.value))}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.sliderRow}>
                <div className={styles.sliderLabelGroup}>
                  <span>Bottom</span>
                  <span className={styles.sliderValBadge}>{margins.bottom}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="2"
                  value={margins.bottom}
                  onChange={(e) => handleMarginChange("bottom", Number(e.target.value))}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.sliderRow}>
                <div className={styles.sliderLabelGroup}>
                  <span>Left</span>
                  <span className={styles.sliderValBadge}>{margins.left}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="2"
                  value={margins.left}
                  onChange={(e) => handleMarginChange("left", Number(e.target.value))}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.sliderRow}>
                <div className={styles.sliderLabelGroup}>
                  <span>Right</span>
                  <span className={styles.sliderValBadge}>{margins.right}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="2"
                  value={margins.right}
                  onChange={(e) => handleMarginChange("right", Number(e.target.value))}
                  className={styles.rangeInput}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.separator} />

      {/* Lists & Quotes */}
      <div className={styles.group}>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("bulletList") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("orderedList") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("taskList") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Checklist"
          aria-label="Checklist"
        >
          <CheckSquare size={15} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive("blockquote") ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
          aria-label="Blockquote"
        >
          <Quote size={15} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* Media & Elements */}
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
          title="Upload & Insert Image"
          aria-label="Upload & Insert Image"
        >
          <ImageIcon size={15} />
        </button>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
          aria-label="Horizontal Rule"
        >
          <Minus size={15} />
        </button>
      </div>

      <div className={styles.separator} />

      {/* History */}
      <div className={styles.group}>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 size={15} />
        </button>
      </div>
    </div>
  );
};

