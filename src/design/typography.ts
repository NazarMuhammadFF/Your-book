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
    id: "crimson",
    name: "Deep Crimson",
    primary: "#7a2a35",
    secondary: "#5f1e27",
    accent: "#f4ccd1",
    textColor: "#fff2f4",
    spineColor: "#4f161e",
    textureGradient: "linear-gradient(135deg, #8c323f 0%, #561921 100%)",
  },
  {
    id: "plum",
    name: "Royal Plum",
    primary: "#5a3d5c",
    secondary: "#442c46",
    accent: "#e9d5eb",
    textColor: "#fcf8fd",
    spineColor: "#331e35",
    textureGradient: "linear-gradient(135deg, #69486c 0%, #3e2640 100%)",
  },
  {
    id: "espresso",
    name: "Espresso Leather",
    primary: "#4a3728",
    secondary: "#37271b",
    accent: "#e3d2c1",
    textColor: "#fcf9f5",
    spineColor: "#291b12",
    textureGradient: "linear-gradient(135deg, #594332 0%, #332216 100%)",
  },
  {
    id: "olive",
    name: "Olive Grove",
    primary: "#59633e",
    secondary: "#444c2d",
    accent: "#dfe7cb",
    textColor: "#f8faf4",
    spineColor: "#32391f",
    textureGradient: "linear-gradient(135deg, #677349 0%, #3f4728 100%)",
  },
  {
    id: "teal",
    name: "Nordic Teal",
    primary: "#2b535d",
    secondary: "#1d3d45",
    accent: "#cce8ee",
    textColor: "#f3fafb",
    spineColor: "#142d33",
    textureGradient: "linear-gradient(135deg, #35626e 0%, #1c3941 100%)",
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
    id: "amber",
    name: "Amber Honey",
    primary: "#c6882d",
    secondary: "#a66f20",
    accent: "#fae7c6",
    textColor: "#fefdfa",
    spineColor: "#8f5b12",
    textureGradient: "linear-gradient(135deg, #d49537 0%, #9e6718 100%)",
  },
  {
    id: "rose",
    name: "Dusty Rose",
    primary: "#9c5b6b",
    secondary: "#7f4453",
    accent: "#f7dce2",
    textColor: "#fdf8f9",
    spineColor: "#693341",
    textureGradient: "linear-gradient(135deg, #ab6778 0%, #763b4a 100%)",
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
];

function adjustHex(hex: string, percent: number): string {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * (percent / 100))));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100))));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + Math.round(255 * (percent / 100))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getHexLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return 0.5;
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 0x00ff) / 255;
  const b = (num & 0x0000ff) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Resolves a palette by ID or generates a complete harmonious palette from any custom hex color.
 */
export function resolveCoverPalette(paletteIdOrHex?: string): CoverColorPalette {
  if (!paletteIdOrHex) return COVER_PALETTES[0];

  // Match existing preset ID
  const existing = COVER_PALETTES.find((p) => p.id === paletteIdOrHex);
  if (existing) return existing;

  // Custom hex color support (e.g. #3b82f6 or 3b82f6)
  if (paletteIdOrHex.startsWith("#") || /^[0-9a-fA-F]{6}$/.test(paletteIdOrHex)) {
    const hex = paletteIdOrHex.startsWith("#") ? paletteIdOrHex : `#${paletteIdOrHex}`;
    const isLight = getHexLuminance(hex) > 0.6;
    const primary = hex;
    const secondary = adjustHex(hex, -15);
    const spineColor = adjustHex(hex, -28);
    const accent = isLight ? adjustHex(hex, -45) : adjustHex(hex, 55);
    const textColor = isLight ? "#22201d" : "#fbf9f4";
    const lighter = adjustHex(hex, 10);
    const darker = adjustHex(hex, -15);
    const textureGradient = `linear-gradient(135deg, ${lighter} 0%, ${darker} 100%)`;

    return {
      id: hex,
      name: `Custom (${hex.toUpperCase()})`,
      primary,
      secondary,
      accent,
      textColor,
      spineColor,
      textureGradient,
    };
  }

  return COVER_PALETTES[0];
}

export type CoverPattern = "minimal" | "classic-frame" | "modern-geo" | "vintage-border" | "center-badge";

export const COVER_PATTERNS: { id: CoverPattern; name: string }[] = [
  { id: "minimal", name: "Clean Minimal" },
  { id: "classic-frame", name: "Classic Double Frame" },
  { id: "modern-geo", name: "Modern Geometric" },
  { id: "vintage-border", name: "Vintage Border" },
  { id: "center-badge", name: "Center Emblem" },
];
