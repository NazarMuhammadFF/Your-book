import React from "react";
import { Editor } from "@tiptap/react";
import { AlignLeft, AlignCenter, AlignRight, Trash2, Edit3 } from "lucide-react";
import styles from "./ImageContextMenu.module.css";

export interface ImageContextMenuProps {
  editor: Editor;
}

export const ImageContextMenu: React.FC<ImageContextMenuProps> = ({
  editor,
}) => {
  const isImageActive = editor.isActive("image");
  if (!isImageActive) return null;

  const currentAlign = editor.getAttributes("image").align || "center";
  const currentWidth = editor.getAttributes("image").width || "100%";

  const setAlign = (align: "left" | "center" | "right" | "full") => {
    editor.chain().focus().updateCustomImage({ align }).run();
  };

  const setWidth = (width: string) => {
    editor.chain().focus().updateCustomImage({ width }).run();
  };

  const handleDelete = () => {
    editor.chain().focus().deleteSelection().run();
  };

  return (
    <div className={styles.container}>
      <div className={styles.group}>
        <button
          type="button"
          className={`${styles.btn} ${currentAlign === "left" ? styles.active : ""}`}
          onClick={() => setAlign("left")}
          title="Align Left"
        >
          <AlignLeft size={14} />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${currentAlign === "center" ? styles.active : ""}`}
          onClick={() => setAlign("center")}
          title="Align Center"
        >
          <AlignCenter size={14} />
        </button>
        <button
          type="button"
          className={`${styles.btn} ${currentAlign === "right" ? styles.active : ""}`}
          onClick={() => setAlign("right")}
          title="Align Right"
        >
          <AlignRight size={14} />
        </button>
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        {["50%", "75%", "100%"].map((w) => (
          <button
            key={w}
            type="button"
            className={`${styles.btn} ${currentWidth === w ? styles.active : ""}`}
            onClick={() => setWidth(w)}
            title={`Width ${w}`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className={styles.separator} />

      <div className={styles.group}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => {
            const currentCaption = editor.getAttributes("image").caption || "";
            const newCaption = prompt("Enter image caption:", currentCaption);
            if (newCaption !== null) {
              editor.chain().focus().updateCustomImage({ caption: newCaption }).run();
            }
          }}
          title="Edit Caption"
        >
          <Edit3 size={14} />
        </button>

        <button
          type="button"
          className={`${styles.btn} ${styles.danger}`}
          onClick={handleDelete}
          title="Delete Image"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
