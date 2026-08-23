import React, { useState, useMemo, useEffect, useRef } from "react";
import { Sparkles, Type, BookOpen, Sliders, Image as ImageIcon } from "lucide-react";
import styles from "./CreateBookModal.module.css";
import {
  Book,
  PageSizePreset,
  PAGE_SIZE_PRESETS,
  getDimensionsFromPreset,
  getBookDimensions,
} from "../types/book";
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
import { createEmptyDocumentContent } from "../../document/utils/initialContent";

export interface BookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBook: (book: Book) => void;
  initialBook?: Book | null; // If provided, edits existing book; otherwise creates new book
}

export const BookSettingsModal: React.FC<BookSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaveBook,
  initialBook = null,
}) => {
  const isEditing = Boolean(initialBook);

  // Book Details
  const [title, setTitle] = useState("My New Book");
  const [subtitle, setSubtitle] = useState("");
  const [authorName, setAuthorName] = useState("Author");
  const [paletteId, setPaletteId] = useState("navy");
  const [pattern, setPattern] = useState<CoverPattern>("classic-frame");
  const [badgeText, setBadgeText] = useState("VOL. I");

  // Active settings tab
  const [activeTab, setActiveTab] = useState<"cover" | "pages" | "typography">("cover");

  // Physical Book & Page settings
  const [pageSizePreset, setPageSizePreset] = useState<PageSizePreset>("a5");
  const [thickness, setThickness] = useState<number>(44);
  const [pagesOffset, setPagesOffset] = useState<number>(5);
  const [coverThickness, setCoverThickness] = useState<number>(3);
  const [pageMargin, setPageMargin] = useState<"compact" | "normal" | "spacious">("normal");
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  // Typography settings
  const [fontFamilyId, setFontFamilyId] = useState("serif");
  const [fontSize, setFontSize] = useState(17);
  const [lineHeight, setLineHeight] = useState(1.68);
  const [paragraphSpacing, setParagraphSpacing] = useState(18);

  // 3D Preview Interactive Rotation
  const [previewRotY, setPreviewRotY] = useState<number>(-22);
  const [previewRotX, setPreviewRotX] = useState<number>(4);
  const isDraggingPreviewRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number; startRotY: number; startRotX: number }>({
    x: 0,
    y: 0,
    startRotY: -22,
    startRotX: 4,
  });

  // Populate state when initialBook changes or modal opens
  useEffect(() => {
    if (initialBook) {
      setTitle(initialBook.title || "");
      setSubtitle(initialBook.subtitle || "");
      setAuthorName(initialBook.cover.authorName || "");
      setPaletteId(initialBook.cover.paletteId || "navy");
      setPattern(initialBook.cover.pattern || "classic-frame");
      setBadgeText(initialBook.cover.badgeText || "");

      const dims = getBookDimensions(initialBook);
      setPageSizePreset(initialBook.pageSettings.pageSizePreset || "a5");
      setThickness(dims.thickness || 44);
      setPagesOffset(dims.pagesOffset || 5);
      setCoverThickness(dims.coverThickness || 3);
      setPageMargin(initialBook.pageSettings.pageMargin || "normal");
      setShowPageNumbers(initialBook.pageSettings.showPageNumbers ?? true);

      setFontFamilyId(initialBook.typography.fontFamilyId || "serif");
      setFontSize(initialBook.typography.fontSize || 17);
      setLineHeight(initialBook.typography.lineHeight || 1.68);
      setParagraphSpacing(initialBook.typography.paragraphSpacing || 18);
    } else {
      setTitle("My New Book");
      setSubtitle("");
      setAuthorName("Author");
      setPaletteId("navy");
      setPattern("classic-frame");
      setBadgeText("VOL. I");
      setPageSizePreset("a5");
      setThickness(44);
      setPagesOffset(5);
      setCoverThickness(3);
      setPageMargin("normal");
      setShowPageNumbers(true);
      setFontFamilyId("serif");
      setFontSize(17);
      setLineHeight(1.68);
      setParagraphSpacing(18);
    }
    setPreviewRotY(-22);
    setPreviewRotX(4);
  }, [initialBook, isOpen]);

  // Derive dimensions from selected preset, thickness, pages offset, and cover thickness
  const derivedDimensions = useMemo(
    () => getDimensionsFromPreset(pageSizePreset, thickness, pagesOffset, coverThickness),
    [pageSizePreset, thickness, pagesOffset, coverThickness]
  );

  // Construct preview book object in real time
  const previewBook: Book = useMemo(
    () => ({
      id: initialBook?.id || "preview",
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
        pageSizePreset,
        pagesOffset,
        coverThickness,
        showPageNumbers,
      },
      dimensions: derivedDimensions,
      createdAt: initialBook?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [
      initialBook,
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
      pageSizePreset,
      pagesOffset,
      coverThickness,
      showPageNumbers,
      derivedDimensions,
    ]
  );

  // Interactive 3D Preview Drag Rotation
  const handlePreviewPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingPreviewRef.current = true;
    dragStartPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      startRotY: previewRotY,
      startRotX: previewRotX,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPreviewRef.current) return;
    const deltaX = e.clientX - dragStartPosRef.current.x;
    const deltaY = e.clientY - dragStartPosRef.current.y;

    const nextRotY = dragStartPosRef.current.startRotY + deltaX * 0.8;
    const nextRotX = Math.max(-25, Math.min(25, dragStartPosRef.current.startRotX - deltaY * 0.4));

    setPreviewRotY(nextRotY);
    setPreviewRotX(nextRotX);
  };

  const handlePreviewPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingPreviewRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const savedBook: Book = {
      ...previewBook,
      id: initialBook?.id || `book-${Date.now()}`,
      content: initialBook?.content || createEmptyDocumentContent(),
      dimensions: {
        ...derivedDimensions,
        rotationDeg: 0,
      },
    };
    onSaveBook(savedBook);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Book Settings — ${initialBook?.title}` : "Create New Book"}
      description={
        isEditing
          ? "Modify cover materials, physical proportions, and reading typography."
          : "Design your cover and customize physical book dimensions."
      }
      maxWidth="880px"
    >
      <form onSubmit={handleSave} className={styles.formContainer}>
        <div className={styles.splitLayout}>
          {/* Left: Live Interactive 3D Preview */}
          <div className={styles.previewColumn}>
            <div
              className={styles.previewStage}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerCancel={handlePreviewPointerUp}
              title="Drag to rotate 3D preview"
            >
              <BookPreview
                book={previewBook}
                mode="preview"
                isInteractive={false}
                previewRotationY={previewRotY}
                previewRotationX={previewRotX}
                scale={0.92}
              />
            </div>

            {/* Quick Angle Presets & Drag Hint */}
            <div className={styles.previewControls}>
              <div className={styles.previewCaption}>
                <Sparkles size={12} className={styles.sparkleIcon} />
                <span>Drag preview to rotate in 3D</span>
              </div>
              <div className={styles.anglePills}>
                <button
                  type="button"
                  className={`${styles.angleBtn} ${Math.abs(previewRotY) < 10 ? styles.angleBtnActive : ""}`}
                  onClick={() => {
                    setPreviewRotY(0);
                    setPreviewRotX(0);
                  }}
                >
                  Front
                </button>
                <button
                  type="button"
                  className={`${styles.angleBtn} ${Math.abs(previewRotY - -22) < 5 ? styles.angleBtnActive : ""}`}
                  onClick={() => {
                    setPreviewRotY(-22);
                    setPreviewRotX(4);
                  }}
                >
                  3D View
                </button>
                <button
                  type="button"
                  className={`${styles.angleBtn} ${Math.abs(previewRotY - -90) < 5 ? styles.angleBtnActive : ""}`}
                  onClick={() => {
                    setPreviewRotY(-90);
                    setPreviewRotX(0);
                  }}
                >
                  Spine
                </button>
                <button
                  type="button"
                  className={`${styles.angleBtn} ${Math.abs(previewRotY - 90) < 5 ? styles.angleBtnActive : ""}`}
                  onClick={() => {
                    setPreviewRotY(90);
                    setPreviewRotX(0);
                  }}
                >
                  Pages
                </button>
                <button
                  type="button"
                  className={`${styles.angleBtn} ${Math.abs(previewRotY - 180) < 5 || Math.abs(previewRotY - -180) < 5 ? styles.angleBtnActive : ""}`}
                  onClick={() => {
                    setPreviewRotY(180);
                    setPreviewRotX(0);
                  }}
                >
                  Back
                </button>
              </div>
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
                autoFocus={!isEditing}
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
                className={`${styles.tabBtn} ${activeTab === "pages" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("pages")}
              >
                <Sliders size={14} />
                <span>Book & Pages</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "typography" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("typography")}
              >
                <Type size={14} />
                <span>Typography</span>
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
                      <span className={styles.comingSoonTag}>Coming soon</span>
                    </div>
                    <p className={styles.disabledText}>
                      Importing custom cover artwork will be available in an upcoming update.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "pages" && (
                <div className={styles.tabContent}>
                  {/* 1. Page Size Preset */}
                  <Select
                    label="Book & Page Size Preset"
                    value={pageSizePreset}
                    onChange={(e) => setPageSizePreset(e.target.value as PageSizePreset)}
                    options={PAGE_SIZE_PRESETS.map((preset) => ({
                      value: preset.id,
                      label: `${preset.label} — ${preset.description}`,
                    }))}
                    helperText="Proportional width and height automatically adapt to standard paper formats."
                  />

                  {/* 2. Book Thickness */}
                  <Slider
                    label="Book Thickness"
                    valueDisplay={`${thickness}px`}
                    min={20}
                    max={64}
                    step={2}
                    value={thickness}
                    onChange={(e) => setThickness(Number(e.target.value))}
                    helperText="Spine depth and page volume on the shelf."
                  />

                  {/* 3. Pages Offset (Cover Overhang) */}
                  <Slider
                    label="Pages Offset (Cover Overhang)"
                    valueDisplay={`${pagesOffset}px`}
                    min={2}
                    max={10}
                    step={1}
                    value={pagesOffset}
                    onChange={(e) => setPagesOffset(Number(e.target.value))}
                    helperText="Depth of protective hardcover squares beyond the page block."
                  />

                  {/* 4. Front/Back Cover Thickness */}
                  <Slider
                    label="Front/Back Cover Thickness"
                    valueDisplay={`${coverThickness}px`}
                    min={1.5}
                    max={8}
                    step={0.5}
                    value={coverThickness}
                    onChange={(e) => setCoverThickness(Number(e.target.value))}
                    helperText="Controls the visible hardcover board thickness for both covers."
                  />

                  {/* Page Margin Preset */}
                  <Select
                    label="Reading Margin Preset"
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

                  {/* Page Number Toggle */}
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
            </div>

            {/* Modal Actions */}
            <div className={styles.actions}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={!title.trim()}>
                {isEditing ? "Save Book Settings" : "Create & Open Book"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// Backwards compatibility alias
export const CreateBookModal = BookSettingsModal;
