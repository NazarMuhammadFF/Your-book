import React, { useState, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Image as ImageIcon,
} from "lucide-react";
import styles from "./SlashCommandMenu.module.css";

export interface SlashCommandMenuProps {
  editor: Editor | null;
  onOpenImageDialog?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  action: (editor: Editor) => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  editor,
  onOpenImageDialog,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    {
      id: "h1",
      title: "Heading 1",
      description: "Large chapter heading",
      icon: Heading1,
      action: (ed) => ed.chain().focus().deleteRange({ from: ed.state.selection.from - query.length - 1, to: ed.state.selection.from }).toggleHeading({ level: 1 }).run(),
    },
    {
      id: "h2",
      title: "Heading 2",
      description: "Medium section heading",
      icon: Heading2,
      action: (ed) => ed.chain().focus().deleteRange({ from: ed.state.selection.from - query.length - 1, to: ed.state.selection.from }).toggleHeading({ level: 2 }).run(),
    },
    {
      id: "h3",
      title: "Heading 3",
      description: "Small subsection heading",
      icon: Heading3,
      action: (ed) => ed.chain().focus().deleteRange({ from: ed.state.selection.from - query.length - 1, to: ed.state.selection.from }).toggleHeading({ level: 3 }).run(),
    },
    {
      id: "bulletList",
      title: "Bullet List",
      description: "Unordered bullet point list",
      icon: List,
      action: (ed) => ed.chain().focus().deleteRange({ from: ed.state.selection.from - query.length - 1, to: ed.state.selection.from }).toggleBulletList().run(),
    },
    {
      id: "orderedList",
      title: "Numbered List",
      description: "Ordered sequence list",
      icon: ListOrdered,
      action: (ed) => ed.chain().focus().deleteRange({ from: ed.state.selection.from - query.length - 1, to: ed.state.selection.from }).toggleOrderedList().run(),
    },
    {
      id: "taskList",
      title: "Checklist",
      description: "Todo list with checkboxes",
      icon: CheckSquare,
      action: (ed) => ed.chain().focus().deleteRange({ from: ed.state.selection.from - query.length - 1, to: ed.state.selection.from }).toggleTaskList().run(),
    },
    {
      id: "quote",
      title: "Blockquote",
      description: "Callout quote block",
      icon: Quote,
      action: (ed) => ed.chain().focus().deleteRange({ from: ed.state.selection.from - query.length - 1, to: ed.state.selection.from }).toggleBlockquote().run(),
    },
    {
      id: "divider",
      title: "Divider Line",
      description: "Horizontal visual dividing rule",
      icon: Minus,
      action: (ed) => ed.chain().focus().deleteRange({ from: ed.state.selection.from - query.length - 1, to: ed.state.selection.from }).setHorizontalRule().run(),
    },
    {
      id: "image",
      title: "Insert Image",
      description: "Embed an image with custom layout",
      icon: ImageIcon,
      action: (ed) => {
        ed.chain().focus().deleteRange({ from: ed.state.selection.from - query.length - 1, to: ed.state.selection.from }).run();
        onOpenImageDialog?.();
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!editor) return;

    const checkSlashCommand = () => {
      const { state, view } = editor;
      const { selection } = state;
      const { $from } = selection;

      if (!selection.empty || !editor.isFocused) {
        setIsOpen(false);
        return;
      }

      // Check current text before cursor in parent node
      const currentBlockText = $from.parent.textContent || "";
      const posInBlock = $from.parentOffset;
      const textBefore = currentBlockText.substring(0, posInBlock);

      const slashIndex = textBefore.lastIndexOf("/");
      if (slashIndex === -1) {
        setIsOpen(false);
        return;
      }

      // Ensure / is at start of line or preceded by whitespace
      if (slashIndex > 0 && textBefore[slashIndex - 1] !== " " && textBefore[slashIndex - 1] !== "\n") {
        setIsOpen(false);
        return;
      }

      const rawQuery = textBefore.substring(slashIndex + 1);
      if (rawQuery.includes(" ")) {
        setIsOpen(false);
        return;
      }

      setQuery(rawQuery);
      setSelectedIndex(0);

      try {
        const coords = view.coordsAtPos($from.pos);
        setPosition({
          x: coords.left,
          y: coords.bottom + 6,
        });
        setIsOpen(true);
      } catch {
        setIsOpen(false);
      }
    };

    editor.on("selectionUpdate", checkSlashCommand);
    editor.on("update", checkSlashCommand);

    return () => {
      editor.off("selectionUpdate", checkSlashCommand);
      editor.off("update", checkSlashCommand);
    };
  }, [editor]);

  // Keyboard navigation for slash menu
  useEffect(() => {
    if (!isOpen || !editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === "Enter") {
        if (filteredCommands.length > 0) {
          e.preventDefault();
          const selected = filteredCommands[selectedIndex];
          if (selected) {
            selected.action(editor);
            setIsOpen(false);
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, editor, filteredCommands, selectedIndex]);

  if (!isOpen || !position || filteredCommands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className={styles.menuContainer}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={(e) => e.preventDefault()}
      role="listbox"
      aria-label="Insert blocks"
    >
      <div className={styles.menuHeader}>
        <span>Insert block</span>
      </div>
      <div className={styles.commandList}>
        {filteredCommands.map((cmd, idx) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.id}
              type="button"
              className={`${styles.commandItem} ${idx === selectedIndex ? styles.commandItemActive : ""}`}
              onClick={() => {
                if (editor) {
                  cmd.action(editor);
                  setIsOpen(false);
                }
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div className={styles.commandIcon}>
                <Icon size={16} />
              </div>
              <div className={styles.commandContent}>
                <div className={styles.commandTitle}>{cmd.title}</div>
                <div className={styles.commandDesc}>{cmd.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
