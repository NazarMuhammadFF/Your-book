import React, { useState, useRef } from "react";
import { Upload, Link as LinkIcon, Image as ImageIcon, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import styles from "./ImageInsertDialog.module.css";

export interface ImageInsertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (options: {
    src: string;
    alt?: string;
    caption?: string;
    align: "left" | "center" | "right" | "full";
    wrapMode?: "inline" | "wrap-left" | "wrap-right" | "break-text";
    width: string;
  }) => void;
}

export const ImageInsertDialog: React.FC<ImageInsertDialogProps> = ({
  isOpen,
  onClose,
  onInsertImage,
}) => {
  const [activeTab, setActiveTab] = useState<"file" | "url">("file");
  const [imageSrc, setImageSrc] = useState<string>("");
  const [altText, setAltText] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [align, setAlign] = useState<"left" | "center" | "right" | "full">("left");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result === "string") {
        setImageSrc(result);
        if (!altText) setAltText(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageSrc) return;

    const wrapMode =
      align === "left"
        ? "wrap-left"
        : align === "right"
        ? "wrap-right"
        : align === "full"
        ? "break-text"
        : "inline";

    onInsertImage({
      src: imageSrc,
      alt: altText.trim() || undefined,
      caption: caption.trim() || undefined,
      align,
      wrapMode,
      width: "50%",
    });
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <ImageIcon size={18} className={styles.headerIcon} />
            <h3>Insert Image</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.tabBar}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "file" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("file")}
            >
              <Upload size={14} />
              Upload File
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "url" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("url")}
            >
              <LinkIcon size={14} />
              Image URL
            </button>
          </div>

          {activeTab === "file" ? (
            <div
              className={styles.dropZone}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenFileInput}
                onChange={handleFileChange}
              />
              {imageSrc ? (
                <div className={styles.previewContainer}>
                  <img src={imageSrc} alt="Preview" className={styles.previewImg} />
                  <span className={styles.changePrompt}>Click to choose a different image</span>
                </div>
              ) : (
                <div className={styles.dropPrompt}>
                  <Upload size={28} className={styles.uploadIcon} />
                  <p className={styles.primaryPrompt}>Choose an image from your computer</p>
                  <span className={styles.subPrompt}>Supports PNG, JPG, WebP, SVG, GIF</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.fieldGroup}>
              <label htmlFor="img-url-input">Image Web URL</label>
              <input
                id="img-url-input"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageSrc}
                onChange={(e) => setImageSrc(e.target.value)}
                className={styles.textInput}
                autoFocus
              />
            </div>
          )}

          <div className={styles.gridFields}>
            <div className={styles.fieldGroup}>
              <label htmlFor="img-caption">Caption (optional)</label>
              <input
                id="img-caption"
                type="text"
                placeholder="Figure 1. Architectural blueprint..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className={styles.textInput}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="img-alt">Alt Text</label>
              <input
                id="img-alt"
                type="text"
                placeholder="Description for accessibility"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className={styles.textInput}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label>Text Wrapping & Placement</label>
            <div className={styles.segmented}>
              {(["left", "center", "right"] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`${styles.segmentBtn} ${align === pos ? styles.activeSegment : ""}`}
                  onClick={() => setAlign(pos)}
                >
                  {pos === "left"
                    ? "Wrap Left"
                    : pos === "center"
                    ? "Inline"
                    : "Wrap Right"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.footer}>
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!imageSrc}
            >
              Insert Image
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
