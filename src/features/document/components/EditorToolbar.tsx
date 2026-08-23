import React, { useState } from "react";
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
} from "lucide-react";
import styles from "./EditorToolbar.module.css";

export interface EditorToolbarProps {
  editor: Editor | null;
  onOpenImageDialog: () => void;
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
  onOpenImageDialog,
  className = "",
}) => {
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);

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

  return (
    <div className={`${styles.toolbar} ${className}`} role="toolbar" aria-label="Editor formatting toolbar">
      {/* Block Type Select */}
      <div className={styles.group}>
        <select
          className={styles.blockSelect}
          value={currentBlockType}
          onChange={handleBlockChange}
          aria-label="Text block structure"
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
        <div className={styles.relativeMenu}>
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
          className={`${styles.toolBtn} ${editor.isActive({ textAlign: "left" }) ? styles.active : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Align Left"
          aria-label="Align Left"
        >
          <AlignLeft size={15} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive({ textAlign: "center" }) ? styles.active : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Align Center"
          aria-label="Align Center"
        >
          <AlignCenter size={15} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive({ textAlign: "right" }) ? styles.active : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Align Right"
          aria-label="Align Right"
        >
          <AlignRight size={15} />
        </button>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive({ textAlign: "justify" }) ? styles.active : ""}`}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          title="Justify"
          aria-label="Justify"
        >
          <AlignJustify size={15} />
        </button>
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
        <button
          type="button"
          className={styles.toolBtn}
          onClick={onOpenImageDialog}
          title="Insert Image"
          aria-label="Insert Image"
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
