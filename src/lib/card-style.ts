import type { AppLocale } from "@/db/schema";
import { getDictionary } from "@/lib/locale";

export const DOT_TYPES = [
  "square",
  "dots",
  "rounded",
  "extra-rounded",
  "classy",
  "classy-rounded",
] as const;
export type DotType = (typeof DOT_TYPES)[number];

export const CORNER_SQUARE_TYPES = ["square", "dot", "extra-rounded"] as const;
export type CornerSquareType = (typeof CORNER_SQUARE_TYPES)[number];

export const CORNER_DOT_TYPES = ["square", "dot"] as const;
export type CornerDotType = (typeof CORNER_DOT_TYPES)[number];

export const FRAME_STYLES = ["none", "solid", "outline", "ribbon"] as const;
export type FrameStyle = (typeof FRAME_STYLES)[number];

/**
 * Everything needed to redraw a card, stored as JSON on `qr_codes.style`.
 * `qr-code-styling` options are re-derived from this (see lib/qr-options.ts) rather
 * than stored raw, so a library upgrade never breaks saved cards.
 */
export interface CardStyle {
  version: 1;
  qr: {
    dotsType: DotType;
    dotsColor: string;
    cornerSquareType: CornerSquareType;
    cornerSquareColor: string;
    cornerDotType: CornerDotType;
    cornerDotColor: string;
    backgroundColor: string;
  };
  frame: {
    style: FrameStyle;
    background: string;
    ink: string;
    accent: string;
    showLogo: boolean;
    showBusinessName: boolean;
  };
  text: {
    cta: string;
    footer: string;
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function hex(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value) ? value : fallback;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function text(value: unknown, fallback: string, max = 80): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, max);
  return trimmed;
}

export function defaultCardStyle(locale: AppLocale = "es-PY"): CardStyle {
  const t = getDictionary(locale).editor;
  return {
    version: 1,
    qr: {
      dotsType: "rounded",
      dotsColor: "#171628",
      cornerSquareType: "extra-rounded",
      cornerSquareColor: "#4B3FD1",
      cornerDotType: "dot",
      cornerDotColor: "#171628",
      backgroundColor: "#FFFFFF",
    },
    frame: {
      style: "solid",
      background: "#FFFFFF",
      ink: "#171628",
      accent: "#4B3FD1",
      showLogo: true,
      showBusinessName: true,
    },
    text: {
      cta: t.ctaDefault,
      footer: t.footerDefault,
    },
  };
}

/**
 * Never trust a stored or posted style blob — every field is re-validated against the
 * allowed set and falls back to the locale default.
 */
export function parseCardStyle(
  input: unknown,
  locale: AppLocale = "es-PY",
): CardStyle {
  const base = defaultCardStyle(locale);
  if (typeof input !== "object" || input === null) return base;
  const raw = input as Record<string, unknown>;
  const qr = (raw.qr ?? {}) as Record<string, unknown>;
  const frame = (raw.frame ?? {}) as Record<string, unknown>;
  const txt = (raw.text ?? {}) as Record<string, unknown>;

  return {
    version: 1,
    qr: {
      dotsType: oneOf(qr.dotsType, DOT_TYPES, base.qr.dotsType),
      dotsColor: hex(qr.dotsColor, base.qr.dotsColor),
      cornerSquareType: oneOf(
        qr.cornerSquareType,
        CORNER_SQUARE_TYPES,
        base.qr.cornerSquareType,
      ),
      cornerSquareColor: hex(qr.cornerSquareColor, base.qr.cornerSquareColor),
      cornerDotType: oneOf(
        qr.cornerDotType,
        CORNER_DOT_TYPES,
        base.qr.cornerDotType,
      ),
      cornerDotColor: hex(qr.cornerDotColor, base.qr.cornerDotColor),
      backgroundColor: hex(qr.backgroundColor, base.qr.backgroundColor),
    },
    frame: {
      style: oneOf(frame.style, FRAME_STYLES, base.frame.style),
      background: hex(frame.background, base.frame.background),
      ink: hex(frame.ink, base.frame.ink),
      accent: hex(frame.accent, base.frame.accent),
      showLogo: frame.showLogo !== false,
      showBusinessName: frame.showBusinessName !== false,
    },
    text: {
      cta: text(txt.cta, base.text.cta, 60),
      footer: text(txt.footer, base.text.footer, 60),
    },
  };
}
