import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  Sliders,
  Image as ImageIcon,
  Upload,
  Trash2,
  RefreshCw,
  Palette,
  Pipette,
  Wand2,
} from "lucide-react";
import styles from "./CreateBookModal.module.css";
import {
  Book,
  BookTypography,
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
  CoverPattern,
  resolveCoverPalette,
} from "../../../design/typography";
import { optimizeCoverImage, extractPaletteFromImage } from "../utils/imageOptimization";
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

  // Custom Cover Image States
  const [coverType, setCoverType] = useState<"preset" | "custom">("preset");
  const [customImageUrl, setCustomImageUrl] = useState<string>("");
  const [imageFit, setImageFit] = useState<"cover" | "contain">("cover");
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.25);
  const [titleVisible, setTitleVisible] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  // Active settings tab (Cover & Physical Book/Pages only)
  const [activeTab, setActiveTab] = useState<"cover" | "pages">("cover");

  // Physical Book & Page settings
  const [pageSizePreset, setPageSizePreset] = useState<PageSizePreset>("a5");
  const [thickness, setThickness] = useState<number>(44);
  const [pagesOffset, setPagesOffset] = useState<number>(5);
  const [coverThickness, setCoverThickness] = useState<number>(3);
  const [pageMargin, setPageMargin] = useState<"compact" | "normal" | "spacious">("normal");
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  // Preserved typography settings
  const typography: BookTypography = useMemo(() => {
    return (
      initialBook?.typography || {
        fontFamilyId: "serif",
        fontSize: 15.5,
        lineHeight: 1.60,
        paragraphSpacing: 12,
        textAlignment: "left",
      }
    );
  }, [initialBook]);

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

      const isCustom = initialBook.cover.coverType === "custom" || Boolean(initialBook.cover.customImageUrl);
      setCoverType(isCustom ? "custom" : "preset");
      setCustomImageUrl(initialBook.cover.customImageUrl || "");
      setImageFit(initialBook.cover.imageFit || "cover");
      setOverlayOpacity(initialBook.cover.overlayOpacity ?? 0.25);
      setTitleVisible(initialBook.cover.titleVisible ?? true);

      const dims = getBookDimensions(initialBook);
      setPageSizePreset(initialBook.pageSettings.pageSizePreset || "a5");
      setThickness(dims.thickness || 44);
      setPagesOffset(dims.pagesOffset || 5);
      setCoverThickness(dims.coverThickness || 3);
      setPageMargin(initialBook.pageSettings.pageMargin || "normal");
      setShowPageNumbers(initialBook.pageSettings.showPageNumbers ?? true);
    } else {
      setTitle("My New Book");
      setSubtitle("");
      setAuthorName("Author");
      setPaletteId("navy");
      setPattern("classic-frame");
      setBadgeText("VOL. I");
      setCoverType("preset");
      setCustomImageUrl("");
      setImageFit("cover");
      setOverlayOpacity(0.25);
      setTitleVisible(true);
      setPageSizePreset("a5");
      setThickness(44);
      setPagesOffset(5);
      setCoverThickness(3);
      setPageMargin("normal");
      setShowPageNumbers(true);
    }
    setPreviewRotY(-22);
    setPreviewRotX(4);
    setUploadError(null);
  }, [initialBook, isOpen]);

  // Extract color palette dynamically whenever customImageUrl is set or updated
  useEffect(() => {
    if (customImageUrl) {
      extractPaletteFromImage(customImageUrl, 8).then((colors) => {
        setExtractedColors(colors);
        // Automatically adopt dominant color if current palette is default
        if (colors.length > 0 && (!paletteId || paletteId === "navy")) {
          setPaletteId(colors[0]);
        }
      });
    } else {
      setExtractedColors([]);
    }
  }, [customImageUrl]);

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
        titleVisible,
        authorVisible: Boolean(authorName.trim()),
        authorName: authorName.trim() || undefined,
        badgeText: badgeText.trim() || undefined,
        coverType,
        customImageUrl: customImageUrl || undefined,
        imageFit,
        overlayOpacity,
      },
      typography,
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
      coverType,
      customImageUrl,
      imageFit,
      overlayOpacity,
      titleVisible,
      typography,
      pageMargin,
      pageSizePreset,
      pagesOffset,
      coverThickness,
      showPageNumbers,
      derivedDimensions,
    ]
  );

  // Handle Image Upload File
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (PNG, JPG, WebP, etc.).");
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      const optimized = await optimizeCoverImage(file, 1200, 0.85);
      setCustomImageUrl(optimized);
      setCoverType("custom");
    } catch {
      setUploadError("Failed to process cover image. Please try another image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

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
      // Ignore if pointer capture is not supported
    }
  };

  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPreviewRef.current) return;
    const deltaX = e.clientX - dragStartPosRef.current.x;
    const deltaY = e.clientY - dragStartPosRef.current.y;

    const newRotY = dragStartPosRef.current.startRotY + deltaX * 0.45;
    const newRotX = Math.max(
      -25,
      Math.min(25, dragStartPosRef.current.startRotX - deltaY * 0.35)
    );

    setPreviewRotY(newRotY);
    setPreviewRotX(newRotX);
  };

  const handlePreviewPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingPreviewRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCover = {
      paletteId,
      pattern,
      titleVisible,
      authorVisible: Boolean(authorName.trim()),
      authorName: authorName.trim() || undefined,
      badgeText: badgeText.trim() || undefined,
      coverType,
      customImageUrl: customImageUrl || undefined,
      imageFit,
      overlayOpacity,
    };

    if (isEditing && initialBook) {
      onSaveBook({
        ...initialBook,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        cover: finalCover,
        dimensions: derivedDimensions,
        pageSettings: {
          ...initialBook.pageSettings,
          pageMargin,
          pageSizePreset,
          pagesOffset,
          coverThickness,
          showPageNumbers,
        },
        updatedAt: new Date().toISOString(),
      });
    } else {
      const newBook: Book = {
        id: `book-${Date.now()}`,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        cover: finalCover,
        dimensions: derivedDimensions,
        typography: {
          fontFamilyId: "serif",
          fontSize: 15.5,
          lineHeight: 1.60,
          paragraphSpacing: 12,
          textAlignment: "left",
        },
        pageSettings: {
          pageMargin,
          pageSizePreset,
          pagesOffset,
          coverThickness,
          showPageNumbers,
        },
        content: createEmptyDocumentContent(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSaveBook(newBook);
    }
    onClose();
  };

  const isCustomColor = paletteId.startsWith("#");
  const currentPalette = resolveCoverPalette(paletteId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Book Settings: ${initialBook?.title}` : "Design a New Book"}
      maxWidth="840px"
    >
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <div className={styles.splitLayout}>
          {/* Left: Real-time 3D Book Preview */}
          <div className={styles.previewColumn}>
            <div
              className={styles.previewStage}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerCancel={handlePreviewPointerUp}
              title="Drag to inspect 3D cover in 360°"
            >
              <BookPreview
                book={previewBook}
                mode="preview"
                previewRotationY={previewRotY}
                previewRotationX={previewRotX}
              />
            </div>

            <div className={styles.previewControls}>
              <div className={styles.previewCaption}>
                <Sparkles size={12} className={styles.sparkleIcon} />
                <span>Drag book to inspect 3D casing & materials</span>
              </div>

              {/* Quick Angle Presets */}
              <div className={styles.anglePills}>
                <button
                  type="button"
                  className={`${styles.angleBtn} ${Math.abs(previewRotY - 0) < 5 ? styles.angleBtnActive : ""}`}
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
                <span>Cover Design</span>
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "pages" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("pages")}
              >
                <Sliders size={14} />
                <span>Book & Pages</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className={styles.tabBody}>
              {activeTab === "cover" && (
                <div className={styles.tabContent}>
                  {/* Hidden Native Color Picker Input */}
                  <input
                    ref={colorPickerRef}
                    type="color"
                    className={styles.colorInputHidden}
                    value={isCustomColor ? paletteId : currentPalette.primary}
                    onChange={(e) => setPaletteId(e.target.value)}
                  />

                  {/* Cover Type Segmented Selector */}
                  <div className={styles.coverTypeSegment}>
                    <button
                      type="button"
                      className={`${styles.segmentBtn} ${coverType === "preset" ? styles.segmentBtnActive : ""}`}
                      onClick={() => setCoverType("preset")}
                    >
                      <Palette size={14} />
                      <span>Preset Patterns</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.segmentBtn} ${coverType === "custom" ? styles.segmentBtnActive : ""}`}
                      onClick={() => setCoverType("custom")}
                    >
                      <ImageIcon size={14} />
                      <span>Upload Custom Artwork</span>
                    </button>
                  </div>

                  {/* Mode A: Preset Patterns */}
                  {coverType === "preset" && (
                    <>
                      {/* Palette Selection (Presets + Color Picker) */}
                      <div className={styles.section}>
                        <div className={styles.extractedHeader}>
                          <label className={styles.sectionLabel}>Cover Material & Color</label>
                          {isCustomColor && (
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                              {paletteId.toUpperCase()}
                            </span>
                          )}
                        </div>
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

                          {/* Custom Color Picker Swatch */}
                          <button
                            type="button"
                            title="Pick custom color from palette"
                            onClick={() => colorPickerRef.current?.click()}
                            className={`${styles.customPickerChip} ${isCustomColor ? styles.customPickerChipActive : ""}`}
                            style={isCustomColor ? { background: paletteId } : undefined}
                          >
                            {isCustomColor ? (
                              <span className={styles.checkMark}>✓</span>
                            ) : (
                              <Pipette size={14} />
                            )}
                          </button>
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
                    </>
                  )}

                  {/* Mode B: Custom Uploaded Image */}
                  {coverType === "custom" && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFileInputChange}
                      />

                      {!customImageUrl ? (
                        <div
                          className={styles.dropzone}
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleDrop}
                        >
                          <Upload size={24} className={styles.dropzoneIcon} />
                          <div className={styles.dropzoneTitle}>
                            {isUploading ? "Optimizing image..." : "Upload Cover Image"}
                          </div>
                          <div className={styles.dropzoneSub}>
                            Click or drag and drop image file here (PNG, JPG, WebP)
                          </div>
                          <Button size="sm" variant="secondary" type="button" disabled={isUploading}>
                            Browse File
                          </Button>
                        </div>
                      ) : (
                        <div className={styles.imageCard}>
                          <div
                            className={styles.imageThumbnail}
                            style={{ backgroundImage: `url("${customImageUrl}")` }}
                          />
                          <div className={styles.imageMeta}>
                            <div className={styles.imageTitle}>Custom Cover Artwork</div>
                            <div className={styles.imageActions}>
                              <Button
                                size="sm"
                                variant="secondary"
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                icon={<RefreshCw size={12} />}
                              >
                                Replace
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                type="button"
                                onClick={() => setCustomImageUrl("")}
                                icon={<Trash2 size={12} />}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {uploadError && (
                        <div style={{ color: "var(--danger-text, #e05252)", fontSize: "11.5px" }}>
                          {uploadError}
                        </div>
                      )}

                      {/* Custom Artwork Options (Fit, Overlay, Title Visibility) */}
                      {customImageUrl && (
                        <>
                          {/* 1. Extracted Colors from Image */}
                          {extractedColors.length > 0 && (
                            <div className={styles.extractedSection}>
                              <div className={styles.extractedHeader}>
                                <div className={styles.extractedTitle}>
                                  <Wand2 size={13} style={{ color: "var(--accent-primary)" }} />
                                  <span>Colors from Cover Image</span>
                                </div>
                                <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
                                  Auto-extracted from artwork
                                </span>
                              </div>
                              <div className={styles.extractedGrid}>
                                {extractedColors.map((hex) => (
                                  <button
                                    key={hex}
                                    type="button"
                                    title={`Spine color: ${hex.toUpperCase()}`}
                                    onClick={() => setPaletteId(hex)}
                                    className={`${styles.extractedChip} ${paletteId === hex ? styles.extractedChipSelected : ""}`}
                                    style={{ backgroundColor: hex }}
                                  >
                                    {paletteId === hex && <span className={styles.checkMark}>✓</span>}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className={styles.section}>
                            <label className={styles.sectionLabel}>Image Fit Mode</label>
                            <div className={styles.patternGrid}>
                              <button
                                type="button"
                                className={`${styles.patternButton} ${imageFit === "cover" ? styles.selectedPattern : ""}`}
                                onClick={() => setImageFit("cover")}
                              >
                                Fill / Crop (Cover)
                              </button>
                              <button
                                type="button"
                                className={`${styles.patternButton} ${imageFit === "contain" ? styles.selectedPattern : ""}`}
                                onClick={() => setImageFit("contain")}
                              >
                                Fit Inside (Letterbox)
                              </button>
                            </div>
                          </div>

                          <Slider
                            label="Darkness Overlay (Text Readability)"
                            valueDisplay={`${Math.round(overlayOpacity * 100)}%`}
                            min={0}
                            max={0.7}
                            step={0.05}
                            value={overlayOpacity}
                            onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                            helperText="Adds a subtle tint to ensure cover title & author stay crisp and readable."
                          />

                          <div className={styles.toggleRow}>
                            <label htmlFor="cover-title-toggle" className={styles.toggleLabel}>
                              <span>Show Book Title & Author on Cover</span>
                              <span className={styles.toggleSubtext}>
                                Disable if your artwork already includes title typography.
                              </span>
                            </label>
                            <input
                              id="cover-title-toggle"
                              type="checkbox"
                              checked={titleVisible}
                              onChange={(e) => setTitleVisible(e.target.checked)}
                              className={styles.checkbox}
                            />
                          </div>

                          {/* Base Spine Palette for Custom Image */}
                          <div className={styles.section}>
                            <div className={styles.extractedHeader}>
                              <label className={styles.sectionLabel}>Spine & Edge Trim Color</label>
                              {isCustomColor && (
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                  {paletteId.toUpperCase()}
                                </span>
                              )}
                            </div>
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

                              {/* Custom Color Picker Swatch */}
                              <button
                                type="button"
                                title="Pick custom color"
                                onClick={() => colorPickerRef.current?.click()}
                                className={`${styles.customPickerChip} ${isCustomColor ? styles.customPickerChipActive : ""}`}
                                style={isCustomColor ? { background: paletteId } : undefined}
                              >
                                {isCustomColor ? (
                                  <span className={styles.checkMark}>✓</span>
                                ) : (
                                  <Pipette size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
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
            </div>

            {/* Modal Actions */}
            <div className={styles.actions}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={!title.trim() || isUploading}>
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
