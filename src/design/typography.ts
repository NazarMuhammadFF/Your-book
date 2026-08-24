/**
 * Typography presets and cover styling options for BookNote.
 */

export interface FontFamilyOption {
  id: string;
  name: string;
  category: "serif" | "sans" | "mono";
  fontFamily: string;
}

export const FONT_FAMILIES: FontFamilyOption[] = [
  {
    id: "serif",
    name: "Classic Serif",
    category: "serif",
    fontFamily: 'var(--font-serif, "Newsreader", "Lora", "Merriweather", "Georgia", "Charter", serif)',
  },
  {
    id: "sans",
    name: "Modern Sans",
    category: "sans",
    fontFamily: 'var(--font-sans, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
  },
  {
    id: "mono",
    name: "Focus Mono",
    category: "mono",
    fontFamily: 'var(--font-mono, "JetBrains Mono", "Cascadia Code", "Fira Code", monospace)',
  },
];

export interface CoverColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  textColor: string;
  spineColor: string;
  textureGradient: string;
}

export const COVER_PALETTES: CoverColorPalette[] = [
  {
    id: "ochre",
    name: "Warm Ochre",
    primary: "#b87d3b",
    secondary: "#9e672c",
    accent: "#f4ddb8",
    textColor: "#fef8ee",
    spineColor: "#8f5b24",
    textureGradient: "linear-gradient(135deg, #c78b46 0%, #99642c 100%)",
  },
  {
    id: "terracotta",
    name: "Terracotta Clay",
    primary: "#a8543f",
    secondary: "#8a3e2b",
    accent: "#f2c6bc",
    textColor: "#fff4f0",
    spineColor: "#753221",
    textureGradient: "linear-gradient(135deg, #b55e48 0%, #823827 100%)",
  },
  {
    id: "pine",
    name: "Forest Pine",
    primary: "#335445",
    secondary: "#253f34",
    accent: "#c4ddce",
    textColor: "#f0f7f3",
    spineColor: "#1d3229",
    textureGradient: "linear-gradient(135deg, #3d6352 0%, #223c31 100%)",
  },
  {
    id: "navy",
    name: "Midnight Navy",
    primary: "#283b54",
    secondary: "#1d2b3e",
    accent: "#d4e2f5",
    textColor: "#f2f7fc",
    spineColor: "#162130",
    textureGradient: "linear-gradient(135deg, #314766 0%, #1c2a3d 100%)",
  },
  {
    id: "linen",
    name: "Vintage Linen",
    primary: "#dcd2c0",
    secondary: "#c6bbab",
    accent: "#82725e",
    textColor: "#3d3429",
    spineColor: "#b5a896",
    textureGradient: "linear-gradient(135deg, #e8dfcf 0%, #c8bcab 100%)",
  },
  {
    id: "charcoal",
    name: "Slate Charcoal",
    primary: "#393836",
    secondary: "#2a2928",
    accent: "#e0ded9",
    textColor: "#f6f4f0",
    spineColor: "#1f1f1e",
    textureGradient: "linear-gradient(135deg, #444340 0%, #262524 100%)",
  },
  {
    id: "sage",
    name: "Muted Sage",
    primary: "#5b6d5b",
    secondary: "#485748",
    accent: "#d7e3d7",
    textColor: "#f4f8f4",
    spineColor: "#3a473a",
    textureGradient: "linear-gradient(135deg, #677b67 0%, #445244 100%)",
  },
  {
    id: "crimson",
    name: "Deep Crimson",
    primary: "#7a2a35",
    secondary: "#5f1e27",
    accent: "#f4ccd1",
    textColor: "#fff2f4",
    spineColor: "#4f161e",
    textureGradient: "linear-gradient(135deg, #8c323f 0%, #561921 100%)",
  },
];

export type CoverPattern = "minimal" | "classic-frame" | "modern-geo" | "vintage-border" | "center-badge";

export const COVER_PATTERNS: { id: CoverPattern; name: string }[] = [
  { id: "minimal", name: "Clean Minimal" },
  { id: "classic-frame", name: "Classic Double Frame" },
  { id: "modern-geo", name: "Modern Geometric" },
  { id: "vintage-border", name: "Vintage Border" },
  { id: "center-badge", name: "Center Emblem" },
];
