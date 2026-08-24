import React, { useState, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  Palette,
  RemoveFormatting,
} from "lucide-react";
import styles from "./EditorBubbleMenu.module.css";

export interface EditorBubbleMenuProps {
  editor: Editor | null;
}

const TEXT_COLORS = [
  { name: "Default", color: "inherit" },
  { name: "Dark Slate", color: "#29231d" },
  { name: "Navy", color: "#1e3a5f" },
  { name: "Burgundy", color: "#7a2828" },
  { name: "Forest Green", color: "#2d5a3f" },
  { name: "Warm Ochre", color: "#a06214" },
  { name: "Muted Gray", color: "#736b63" },
];

export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      const { state, view } = editor;
      const { selection } = state;

      if (selection.empty || !editor.isFocused) {
        setPosition(null);
        setIsColorMenuOpen(false);
        return;
      }

      try {
        const { from, to } = selection;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);

        const left = Math.min(start.left, end.left);
        const right = Math.max(start.right, end.right);
        const top = Math.min(start.top, end.top);

        const centerX = (left + right) / 2;
        const bubbleY = top - 10;

        setPosition({ x: centerX, y: bubbleY });
      } catch {
        setPosition(null);
      }
    };

    editor.on("selectionUpdate", updatePosition);
    editor.on("focus", updatePosition);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("focus", updatePosition);
    };
  }, [editor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setIsColorMenuOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // If clicking outside bubble menu and editor selection is empty
        if (editor?.state.selection.empty) {
          setPosition(null);
        }
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [editor]);

  if (!editor || !position) return null;

  return (
    <div
      ref={menuRef}
      className={styles.bubbleMenu}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
      onMouseDown={(e) => e.preventDefault()}
      role="toolbar"
      aria-label="Inline text formatting"
    >
      <button
        type="button"
        className={`${styles.bubbleBtn} ${editor.isActive("bold") ? styles.active : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
        aria-label="Bold"
      >
        <Bold size={14} />
      </button>

      <button
        type="button"
        className={`${styles.bubbleBtn} ${editor.isActive("italic") ? styles.active : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
        aria-label="Italic"
      >
        <Italic size={14} />
      </button>

      <button
        type="button"
        className={`${styles.bubbleBtn} ${editor.isActive("underline") ? styles.active : ""}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline (Ctrl+U)"
        aria-label="Underline"
      >
        <UnderlineIcon size={14} />
      </button>

      <button
        type="button"
        className={`${styles.bubbleBtn} ${editor.isActive("strike") ? styles.active : ""}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
        aria-label="Strikethrough"
      >
        <Strikethrough size={14} />
      </button>

      <button
        type="button"
        className={`${styles.bubbleBtn} ${editor.isActive("code") ? styles.active : ""}`}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline Code"
        aria-label="Inline Code"
      >
        <Code size={14} />
      </button>

      <button
        type="button"
        className={`${styles.bubbleBtn} ${editor.isActive("highlight") ? styles.active : ""}`}
        onClick={() => editor.chain().focus().toggleHighlight({ color: "#ffec99" }).run()}
        title="Highlight"
        aria-label="Highlight"
      >
        <Highlighter size={14} />
      </button>

      {/* Color Palette Menu */}
      <div className={styles.relativeMenu} ref={colorMenuRef}>
        <button
          type="button"
          className={`${styles.bubbleBtn} ${isColorMenuOpen ? styles.active : ""}`}
          onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
          title="Text Color"
          aria-label="Text Color"
        >
          <Palette size={14} />
        </button>

        {isColorMenuOpen && (
          <div className={styles.colorPalettePopover}>
            {TEXT_COLORS.map((c) => (
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
                  style={{
                    backgroundColor: c.color === "inherit" ? "var(--text-primary)" : c.color,
                  }}
                />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.separator} />

      <button
        type="button"
        className={styles.bubbleBtn}
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
        title="Clear Formatting"
        aria-label="Clear Formatting"
      >
        <RemoveFormatting size={14} />
      </button>
    </div>
  );
};
