import React, { useState, useEffect, useRef, useCallback } from "react";
import { Palette, RotateCcw, ImagePlus, X, Crop, ZoomIn, ZoomOut } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import styles from "./HomeSettingsModal.module.css";

// ── Types ──

export interface HomeColors {
  bgColor: string;
  bgImage: string;
  bgCropX: number;
  bgCropY: number;
  shelfSurface: string;
  shelfFace: string;
}

export const DEFAULT_HOME_COLORS: HomeColors = {
  bgColor: "#f6f3ee",
  bgImage: "",
  bgCropX: 50,
  bgCropY: 50,
  shelfSurface: "#382c21",
  shelfFace: "#241b13",
};

const STORAGE_KEY = "booknote_home_colors";

export function loadHomeColors(): HomeColors {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_HOME_COLORS, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_HOME_COLORS;
}

function saveHomeColors(colors: HomeColors): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // ignore
  }
}

// ── Color Picker ──

interface ColorPickerProps {
  label: string;
  value: string;
  presets: string[];
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, presets, onChange }) => {
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const handleHexCommit = () => {
    const clean = hexInput.trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean)) {
      onChange(clean);
    } else {
      setHexInput(value);
    }
  };

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <label className={styles.groupLabel}>{label}</label>
        <div className={styles.hexInput}>
          <input
            type="color"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setHexInput(e.target.value);
            }}
            className={styles.colorPickerNative}
            aria-label={`Pick color for ${label}`}
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onBlur={handleHexCommit}
            onKeyDown={(e) => e.key === "Enter" && handleHexCommit()}
            className={styles.hexField}
            maxLength={7}
            spellCheck={false}
          />
        </div>
      </div>
      <div className={styles.swatchRow}>
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            className={`${styles.swatch} ${value.toLowerCase() === c.toLowerCase() ? styles.swatchActive : ""}`}
            style={{ backgroundColor: c }}
            onClick={() => {
              onChange(c);
              setHexInput(c);
            }}
            aria-label={c}
          />
        ))}
      </div>
    </div>
  );
};

// ── Crop Modal ──

interface CropModalProps {
  isOpen: boolean;
  src: string;
  initialCropX: number;
  initialCropY: number;
  onConfirm: (cropX: number, cropY: number) => void;
  onCancel: () => void;
}

const FRAME_W = 400;

const CropModal: React.FC<CropModalProps> = ({ isOpen, src, onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ sx: 0, sy: 0, ox: 0, oy: 0, dragging: false });

  const frameH = imgSize.w > 0 ? FRAME_W * (imgSize.h / imgSize.w) : FRAME_W * 0.6;

  const minZoom = Math.max(FRAME_W / imgSize.w, frameH / imgSize.h);

  useEffect(() => {
    if (!isOpen || !src) return;
    const img = new Image();
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(minZoom);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [isOpen, src]);

  useEffect(() => {
    if (!isOpen) return;
    setZoom(minZoom);
    setOffset({ x: 0, y: 0 });
  }, [isOpen, minZoom]);

  const toPercent = useCallback((px: number, py: number) => {
    const x = Math.round(50 + (px / (FRAME_W * zoom)) * 50);
    const y = Math.round(50 + (py / (frameH * zoom)) * 50);
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, [zoom, frameH]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const el = canvasRef.current;
    if (el) el.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y, dragging: true };
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleConfirm = () => {
    const p = toPercent(offset.x, offset.y);
    onConfirm(p.x, p.y);
  };

  const handleCenter = () => {
    setOffset({ x: 0, y: 0 });
  };

  const pos = toPercent(offset.x, offset.y);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Crop Background"
      description="Drag image to select which part to use as tile"
      maxWidth="520px"
    >
      <div className={styles.cropBody}>
        <div
          ref={canvasRef}
          className={styles.cropCanvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ cursor: dragRef.current?.dragging ? "grabbing" : "grab" }}
        >
          <img
            src={src}
            alt="Crop"
            className={styles.cropImage}
            draggable={false}
            style={{
              width: `${imgSize.w * zoom}px`,
              height: "auto",
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
          <div
            className={styles.cropFrame}
            style={{ width: FRAME_W, height: frameH }}
          >
            <div className={styles.cropCornerTL} />
            <div className={styles.cropCornerTR} />
            <div className={styles.cropCornerBL} />
            <div className={styles.cropCornerBR} />
          </div>
        </div>

        <div className={styles.cropControls}>
          <div className={styles.cropZoom}>
            <button
              type="button"
              className={styles.cropZoomBtn}
              onClick={() => setZoom((z) => Math.max(minZoom, z - 0.1))}
              disabled={zoom <= minZoom}
            >
              <ZoomOut size={14} />
            </button>
            <input
              type="range"
              min={minZoom * 100}
              max={minZoom * 100 * 3}
              step={1}
              value={zoom * 100}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              className={styles.cropZoomSlider}
            />
            <button
              type="button"
              className={styles.cropZoomBtn}
              onClick={() => setZoom((z) => Math.min(minZoom * 3, z + 0.1))}
              disabled={zoom >= minZoom * 3}
            >
              <ZoomIn size={14} />
            </button>
            <span className={styles.cropZoomLabel}>{Math.round(zoom * 100)}%</span>
          </div>

          <div className={styles.cropPosition}>
            <span className={styles.cropPosLabel}>X: {pos.x}%</span>
            <span className={styles.cropPosLabel}>Y: {pos.y}%</span>
            <button type="button" className={styles.cropCenterBtn} onClick={handleCenter}>
              Center
            </button>
          </div>
        </div>

        <div className={styles.cropActions}>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" icon={<Crop size={14} />} onClick={handleConfirm}>Confirm</Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Background Image Picker ──

interface BgImagePickerProps {
  value: string;
  cropX: number;
  cropY: number;
  onChange: (dataUrl: string) => void;
  onCropChange: (cropX: number, cropY: number) => void;
}

const BgImagePicker: React.FC<BgImagePickerProps> = ({ value, cropX, cropY, onChange, onCropChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingSrc, setPendingSrc] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingSrc(reader.result as string);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = (x: number, y: number) => {
    if (pendingSrc) {
      onChange(pendingSrc);
      onCropChange(x, y);
    } else if (value) {
      onCropChange(x, y);
    }
    setCropOpen(false);
    setPendingSrc("");
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    setPendingSrc("");
  };

  const openCropExisting = () => {
    if (value) {
      setPendingSrc("");
      setCropOpen(true);
    }
  };

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <label className={styles.groupLabel}>Background Image</label>
        {value && (
          <div className={styles.groupActions}>
            <button type="button" className={styles.cropEditBtn} onClick={openCropExisting}>
              <Crop size={12} /> Crop
            </button>
            <button type="button" className={styles.removeImageBtn} onClick={() => onChange("")}>
              <X size={12} /> Remove
            </button>
          </div>
        )}
      </div>

      <div className={styles.imageArea}>
        {value ? (
          <div
            className={styles.imagePreview}
            style={{
              backgroundImage: `url(${value})`,
              backgroundSize: "100% auto",
              backgroundRepeat: "repeat-y",
              backgroundPosition: `${cropX}% ${cropY}%`,
            }}
          >
            <button type="button" className={styles.changeImageBtn} onClick={() => fileRef.current?.click()}>
              Change Image
            </button>
          </div>
        ) : (
          <button type="button" className={styles.uploadBtn} onClick={() => fileRef.current?.click()}>
            <ImagePlus size={20} />
            <span>Upload Image</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className={styles.hiddenInput} />
      </div>

      <CropModal
        isOpen={cropOpen}
        src={pendingSrc || value}
        initialCropX={cropX}
        initialCropY={cropY}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </div>
  );
};

// ── Main Modal ──

export interface HomeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: HomeColors;
  onColorsChange: (colors: HomeColors) => void;
}

export const HomeSettingsModal: React.FC<HomeSettingsModalProps> = ({
  isOpen,
  onClose,
  colors,
  onColorsChange,
}) => {
  const [local, setLocal] = useState<HomeColors>(colors);

  useEffect(() => {
    setLocal(colors);
  }, [colors, isOpen]);

  const update = (patch: Partial<HomeColors>) => setLocal((p) => ({ ...p, ...patch }));

  const handleApply = () => {
    onColorsChange(local);
    saveHomeColors(local);
    onClose();
  };

  const handleReset = () => {
    onColorsChange(DEFAULT_HOME_COLORS);
    saveHomeColors(DEFAULT_HOME_COLORS);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Home Settings"
      description="Customize library background and shelf colors"
      maxWidth="460px"
    >
      <div className={styles.body}>
        <BgImagePicker
          value={local.bgImage}
          cropX={local.bgCropX}
          cropY={local.bgCropY}
          onChange={(img) => update({ bgImage: img })}
          onCropChange={(x, y) => update({ bgCropX: x, bgCropY: y })}
        />

        <ColorPicker
          label="Page Background"
          value={local.bgColor}
          presets={[
            "#f6f3ee", "#f0ebe3", "#e8e3da", "#d6cfc3", "#c7bfb0",
            "#171614", "#1e1c19", "#22201c", "#0d1117", "#1a1a2e",
          ]}
          onChange={(c) => update({ bgColor: c })}
        />

        <ColorPicker
          label="Shelf Surface"
          value={local.shelfSurface}
          presets={[
            "#382c21", "#2a2017", "#4a3828", "#5c4530", "#6b5038",
            "#221c17", "#2e2418", "#3d2f22", "#555555", "#8b7355",
          ]}
          onChange={(c) => update({ shelfSurface: c })}
        />

        <ColorPicker
          label="Shelf Front Face"
          value={local.shelfFace}
          presets={[
            "#241b13", "#1a130c", "#332618", "#41301e", "#4d3824",
            "#15110d", "#1e170e", "#2b2016", "#333333", "#6b5a42",
          ]}
          onChange={(c) => update({ shelfFace: c })}
        />

        <div className={styles.actions}>
          <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={handleReset}>
            Reset
          </Button>
          <Button variant="primary" size="sm" icon={<Palette size={14} />} onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
};
