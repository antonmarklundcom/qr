import type { CardStyle } from "@/lib/card-style";
import { BLEED_MM, SAFE_MARGIN_MM, type PrintPreset } from "@/lib/print-presets";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextBlock {
  x: number;
  y: number;
  w: number;
  /** Font size in mm. */
  size: number;
  lineHeight: number;
  align: "left" | "center";
  weight: "regular" | "bold";
  color: string;
  lines: string[];
}

export interface CardLayout {
  /** Full artboard: trim size plus bleed on every edge. Origin is its top-left. */
  canvas: { w: number; h: number };
  bleedMm: number;
  safeMm: number;
  trim: Rect;
  safe: Rect;
  background: string;
  accent: string;
  qr: Rect;
  businessName: TextBlock | null;
  cta: TextBlock;
  footer: TextBlock | null;
  /** Accent band behind the footer, for the solid/ribbon frame styles. */
  band: (Rect & { r: number }) | null;
  /** Accent stroke for the outline frame style. */
  outline: (Rect & { r: number; stroke: number }) | null;
}

/**
 * Helvetica's average advance width is close enough to 0.52em for line breaking, and
 * using the same estimate for the SVG and the PDF keeps the two renderers in sync.
 */
const AVG_CHAR_WIDTH = 0.52;

export function measureText(text: string, size: number): number {
  return text.length * size * AVG_CHAR_WIDTH;
}

export function wrapText(
  text: string,
  size: number,
  maxWidth: number,
  maxLines = 3,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (measureText(candidate, size) <= maxWidth || lines.length + 1 >= maxLines) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
}

export interface CardLayoutInput {
  preset: PrintPreset;
  style: CardStyle;
  businessName: string;
  cta: string;
  footer: string;
}

/**
 * Pure geometry in millimetres, shared by the SVG renderer (preview + PNG) and the
 * pdf-lib renderer, so what the editor shows is what gets printed.
 */
export function computeCardLayout({
  preset,
  style,
  businessName,
  cta,
  footer,
}: CardLayoutInput): CardLayout {
  const bleed = BLEED_MM;
  const safe = SAFE_MARGIN_MM;
  const canvas = {
    w: preset.widthMm + bleed * 2,
    h: preset.heightMm + bleed * 2,
  };
  const trim: Rect = {
    x: bleed,
    y: bleed,
    w: preset.widthMm,
    h: preset.heightMm,
  };
  const content: Rect = {
    x: bleed + safe,
    y: bleed + safe,
    w: preset.widthMm - safe * 2,
    h: preset.heightMm - safe * 2,
  };

  const base = Math.min(preset.widthMm, preset.heightMm);
  const ctaSize = base * 0.085;
  const nameSize = base * 0.055;
  const footerSize = base * 0.042;
  const gap = base * 0.06;

  const showName = style.frame.showBusinessName && businessName.trim().length > 0;
  const showFooter = footer.trim().length > 0;
  const bandStyle = style.frame.style === "solid" || style.frame.style === "ribbon";
  const bandHeight = bandStyle && showFooter ? footerSize * 2.4 : 0;

  const ink = style.frame.ink;
  const accent = style.frame.accent;
  const footerColor = bandStyle ? "#FFFFFF" : ink;

  const horizontal = preset.widthMm / preset.heightMm >= 1.2;
  const usableH = content.h - (bandStyle ? bandHeight - safe / 2 : 0);

  let qr: Rect;
  let textX: number;
  let textW: number;
  let align: "left" | "center";

  if (horizontal) {
    const qrSize = Math.min(usableH, content.w * 0.42);
    qr = {
      x: content.x,
      y: content.y + (usableH - qrSize) / 2,
      w: qrSize,
      h: qrSize,
    };
    textX = content.x + qrSize + gap;
    textW = content.x + content.w - textX;
    align = "left";
  } else {
    const qrSize = Math.min(content.w * 0.74, usableH * 0.56);
    qr = {
      x: content.x + (content.w - qrSize) / 2,
      y: content.y + (showName ? nameSize * 2.2 : 0),
      w: qrSize,
      h: qrSize,
    };
    textX = content.x;
    textW = content.w;
    align = "center";
  }

  const nameLines = showName ? wrapText(businessName, nameSize, textW, 2) : [];
  const ctaLines = wrapText(cta, ctaSize, textW, 3);

  let cursorY: number;
  if (horizontal) {
    const nameHeight = nameLines.length * nameSize * 1.2;
    const ctaHeight = ctaLines.length * ctaSize * 1.15;
    const blockHeight = nameHeight + (nameLines.length ? gap * 0.6 : 0) + ctaHeight;
    cursorY = qr.y + (qr.h - blockHeight) / 2;
  } else {
    cursorY = content.y;
  }

  let nameBlock: TextBlock | null = null;
  if (nameLines.length) {
    nameBlock = {
      x: textX,
      y: horizontal ? cursorY : content.y,
      w: textW,
      size: nameSize,
      lineHeight: 1.2,
      align,
      weight: "bold",
      color: accent,
      lines: nameLines,
    };
    if (horizontal) cursorY += nameLines.length * nameSize * 1.2 + gap * 0.6;
  }

  const ctaBlock: TextBlock = {
    x: textX,
    y: horizontal ? cursorY : qr.y + qr.h + gap,
    w: textW,
    size: ctaSize,
    lineHeight: 1.15,
    align,
    weight: "bold",
    color: ink,
    lines: ctaLines,
  };

  let footerBlock: TextBlock | null = null;
  let band: (Rect & { r: number }) | null = null;

  if (showFooter) {
    const footerLines = wrapText(footer, footerSize, textW, 2);
    if (bandStyle) {
      const ribbon = style.frame.style === "ribbon";
      band = {
        x: ribbon ? trim.x + safe : 0,
        y: canvas.h - bleed - bandHeight,
        w: ribbon ? trim.w - safe * 2 : canvas.w,
        h: ribbon ? bandHeight : bandHeight + bleed,
        r: ribbon ? bandHeight * 0.25 : 0,
      };
      footerBlock = {
        x: band.x,
        y: band.y + (bandHeight - footerLines.length * footerSize * 1.2) / 2,
        w: band.w,
        size: footerSize,
        lineHeight: 1.2,
        align: "center",
        weight: "regular",
        color: footerColor,
        lines: footerLines,
      };
    } else {
      footerBlock = {
        x: textX,
        y: content.y + content.h - footerLines.length * footerSize * 1.2,
        w: textW,
        size: footerSize,
        lineHeight: 1.2,
        align,
        weight: "regular",
        color: footerColor,
        lines: footerLines,
      };
    }
  }

  const outline =
    style.frame.style === "outline"
      ? {
          x: trim.x + safe / 2,
          y: trim.y + safe / 2,
          w: trim.w - safe,
          h: trim.h - safe,
          r: base * 0.05,
          stroke: Math.max(0.4, base * 0.012),
        }
      : null;

  return {
    canvas,
    bleedMm: bleed,
    safeMm: safe,
    trim,
    safe: content,
    background: style.frame.background,
    accent,
    qr,
    businessName: nameBlock,
    cta: ctaBlock,
    footer: footerBlock,
    band,
    outline,
  };
}
