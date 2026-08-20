/**
 * Print sizes are config data, not code (plan §6) — adding A5 or a new sticker size is
 * one entry here and nothing else changes.
 */
export interface PrintPreset {
  id: string;
  /** Dictionary key under `export.presets`. */
  labelKey: "card" | "a6" | "sticker";
  /** Trim size in millimetres. */
  widthMm: number;
  heightMm: number;
}

export const BLEED_MM = 3;
export const SAFE_MARGIN_MM = 4;
export const EXPORT_DPI = 300;
export const MM_PER_INCH = 25.4;
/** pdf-lib works in PostScript points: 1 pt = 1/72 in. */
export const PT_PER_MM = 72 / MM_PER_INCH;

export const PRINT_PRESETS: PrintPreset[] = [
  { id: "card", labelKey: "card", widthMm: 85.6, heightMm: 54 },
  { id: "a6", labelKey: "a6", widthMm: 105, heightMm: 148 },
  { id: "sticker", labelKey: "sticker", widthMm: 70, heightMm: 70 },
];

export const DEFAULT_PRESET_ID = "card";

export function getPreset(id: string): PrintPreset {
  return (
    PRINT_PRESETS.find((p) => p.id === id) ??
    PRINT_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!
  );
}

export function mmToPx(mm: number, dpi = EXPORT_DPI) {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

export function mmToPt(mm: number) {
  return mm * PT_PER_MM;
}
