import React, { useState, useMemo } from "react";
import { Sparkles, Type, BookOpen, Sliders, Image as ImageIcon } from "lucide-react";
import styles from "./CreateBookModal.module.css";
import { Book } from "../types/book";
import { Book as BookPreview } from "./Book";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Slider } from "../../../components/ui/Slider";
import {
  COVER_PALETTES,
  COVER_PATTERNS,
  FONT_FAMILIES,
  CoverPattern,
} from "../../../design/typography";

export interface CreateBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBook: (book: Book) => void;
}

export const CreateBookModal: React.FC<CreateBookModalProps> = ({
  isOpen,
  onClose,
  onCreateBook,
}) => {
  const [title, setTitle] = useState("My New Book");
  const [subtitle, setSubtitle] = useState("");
  const [authorName, setAuthorName] = useState("Author");
  const [paletteId, setPaletteId] = useState("navy");
  const [pattern, setPattern] = useState<CoverPattern>("classic-frame");
  const [badgeText, setBadgeText] = useState("VOL. I");

  // Active settings tab
  const [activeTab, setActiveTab] = useState<"cover" | "typography" | "pages">("cover");

  // Typography settings
  const [fontFamilyId, setFontFamilyId] = useState("serif");
  const [fontSize, setFontSize] = useState(17);
  const [lineHeight, setLineHeight] = useState(1.68);
  const [paragraphSpacing, setParagraphSpacing] = useState(18);

  // Page settings
  const [pageMargin, setPageMargin] = useState<"compact" | "normal" | "spacious">("normal");
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  // Construct preview book object in real time
  const previewBook: Book = useMemo(
    () => ({
      id: "preview",
      title: title.trim() || "Untitled Book",
      subtitle: subtitle.trim() || undefined,
      cover: {
        paletteId,
        pattern,
        titleVisible: true,
        authorVisible: Boolean(authorName.trim()),
        authorName: authorName.trim() || undefined,
        badgeText: badgeText.trim() || undefined,
      },
      typography: {
        fontFamilyId,
        fontSize,
        lineHeight,
        paragraphSpacing,
        textAlignment: "left",
      },
      pageSettings: {
        pageMargin,
        pageSizePreset: "standard",
        showPageNumbers,
      },
      dimensions: {
        width: 156,
        height: 226,
        thickness: 26,
        rotationDeg: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [
      title,
      subtitle,
      authorName,
      paletteId,
      pattern,
      badgeText,
      fontFamilyId,
      fontSize,
      lineHeight,
      paragraphSpacing,
      pageMargin,
      showPageNumbers,
    ]
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newBook: Book = {
      ...previewBook,
      id: `book-${Date.now()}`,
      dimensions: {
        width: 148 + Math.floor(Math.random() * 8) - 4,
        height: 212 + Math.floor(Math.random() * 12) - 6,
        thickness: 24 + Math.floor(Math.random() * 8) - 4,
        rotationDeg: Number((Math.random() * 2.4 - 1.2).toFixed(1)),
      },
    };
    onCreateBook(newBook);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Book"
      description="Design your cover and set default reading typography."
      maxWidth="860px"
    >
      <form onSubmit={handleCreate} className={styles.formContainer}>
        <div className={styles.splitLayout}>
          {/* Left: Live Reactive Preview */}
          <div className={styles.previewColumn}>
            <div className={styles.previewStage}>
              <BookPreview book={previewBook} isInteractive={false} scale={1.15} />
            </div>
            <div className={styles.previewCaption}>
              <Sparkles size={13} className={styles.sparkleIcon} />
              <span>Real-time tactile preview</span>
            </div>
          </div>

          {/* Right: Customization Controls */}
          <div className={styles.controlsColumn}>
            {/* Primary Details */}
            <div className={styles.primaryFields}>
              <Input
                label="Book Title"
                placeholder="E.g. A Year in the Woods"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
              <div className={styles.inlineFields}>
                <Input
                  label="Author / Signature"
                  placeholder="Author Name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
                <Input
                  label="Badge / Volume (Optional)"
                  placeholder="E.g. VOL. I"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                />
              </div>
              <Input
                label="Subtitle (Optional)"
                placeholder="E.g. Notes & Field Sketches"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>

            {/* Navigation Tabs */}
            <div className={styles.tabsHeader}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "cover" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("cover")}
              >
                <BookOpen size={14} />
                <span>Cover Style</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "typography" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("typography")}
              >
                <Type size={14} />
                <span>Typography</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "pages" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("pages")}
              >
                <Sliders size={14} />
                <span>Page Layout</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className={styles.tabBody}>
              {activeTab === "cover" && (
                <div className={styles.tabContent}>
                  {/* Palette Selection */}
                  <div className={styles.section}>
                    <label className={styles.sectionLabel}>Cover Material & Color</label>
                    <div className={styles.paletteGrid}>
                      {COVER_PALETTES.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          title={p.name}
                          onClick={() => setPaletteId(p.id)}
                          className={`${styles.colorChip} ${paletteId === p.id ? styles.selectedChip : ""}`}
                          style={{ background: p.textureGradient }}
                        >
                          {paletteId === p.id && <span className={styles.checkMark}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pattern Selection */}
                  <div className={styles.section}>
                    <label className={styles.sectionLabel}>Cover Frame & Ornament</label>
                    <div className={styles.patternGrid}>
                      {COVER_PATTERNS.map((pat) => (
                        <button
                          key={pat.id}
                          type="button"
                          onClick={() => setPattern(pat.id)}
                          className={`${styles.patternButton} ${pattern === pat.id ? styles.selectedPattern : ""}`}
                        >
                          {pat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Image Cover Note */}
                  <div className={styles.disabledFeatureBox}>
                    <div className={styles.disabledHeader}>
                      <ImageIcon size={14} />
                      <span>Custom Cover Image</span>
                      <span className={styles.comingSoonTag}>Phase 4</span>
                    </div>
                    <p className={styles.disabledText}>
                      Importing custom image files to the local asset storage will be enabled in Phase 4.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "typography" && (
                <div className={styles.tabContent}>
                  <Select
                    label="Default Font Family"
                    value={fontFamilyId}
                    onChange={(e) => setFontFamilyId(e.target.value)}
                    options={FONT_FAMILIES.map((f) => ({ value: f.id, label: f.name }))}
                    helperText="Applies to continuous reading and writing views."
                  />

                  <Slider
                    label="Base Font Size"
                    valueDisplay={`${fontSize}px`}
                    min={14}
                    max={20}
                    step={0.5}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                  />

                  <Slider
                    label="Line Height"
                    valueDisplay={lineHeight.toFixed(2)}
                    min={1.4}
                    max={2.0}
                    step={0.05}
                    value={lineHeight}
                    onChange={(e) => setLineHeight(Number(e.target.value))}
                  />

                  <Slider
                    label="Paragraph Spacing"
                    valueDisplay={`${paragraphSpacing}px`}
                    min={12}
                    max={28}
                    step={2}
                    value={paragraphSpacing}
                    onChange={(e) => setParagraphSpacing(Number(e.target.value))}
                  />
                </div>
              )}

              {activeTab === "pages" && (
                <div className={styles.tabContent}>
                  <Select
                    label="Page Margin Preset"
                    value={pageMargin}
                    onChange={(e) =>
                      setPageMargin(e.target.value as "compact" | "normal" | "spacious")
                    }
                    options={[
                      { value: "compact", label: "Compact Margins" },
                      { value: "normal", label: "Standard Reading Margins" },
                      { value: "spacious", label: "Generous Literary Margins" },
                    ]}
                  />

                  <div className={styles.toggleRow}>
                    <label htmlFor="page-number-toggle" className={styles.toggleLabel}>
                      <span>Display Page Numbers in Book View</span>
                      <span className={styles.toggleSubtext}>
                        Adds subtle left/right page indicators to spreads
                      </span>
                    </label>
                    <input
                      id="page-number-toggle"
                      type="checkbox"
                      checked={showPageNumbers}
                      onChange={(e) => setShowPageNumbers(e.target.checked)}
                      className={styles.checkbox}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className={styles.actions}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={!title.trim()}>
                Create & Open Book
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
