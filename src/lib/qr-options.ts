import type { CardStyle } from "@/lib/card-style";

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

/**
 * H (30%) whenever a logo covers part of the code, Q (25%) otherwise (plan §2).
 * The payload is a 7-char short URL, so capacity is never the constraint.
 */
export function errorCorrectionFor(hasLogo: boolean): ErrorCorrectionLevel {
  return hasLogo ? "H" : "Q";
}

export interface QrRenderInput {
  data: string;
  style: CardStyle;
  logoDataUrl?: string | null;
  /** Rendered size in px. The SVG is scaled to physical size at export time. */
  size?: number;
}

/**
 * Options are rebuilt from our own CardStyle on every render rather than stored raw,
 * so a qr-code-styling upgrade can never break a saved card.
 */
export function buildQrOptions({
  data,
  style,
  logoDataUrl,
  size = 512,
}: QrRenderInput) {
  const hasLogo = Boolean(style.frame.showLogo && logoDataUrl);
  return {
    width: size,
    height: size,
    type: "svg" as const,
    data,
    image: hasLogo ? (logoDataUrl as string) : undefined,
    margin: 0,
    qrOptions: {
      errorCorrectionLevel: errorCorrectionFor(hasLogo),
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.28,
      margin: 2,
      crossOrigin: "anonymous" as const,
    },
    dotsOptions: {
      type: style.qr.dotsType,
      color: style.qr.dotsColor,
    },
    cornersSquareOptions: {
      type: style.qr.cornerSquareType,
      color: style.qr.cornerSquareColor,
    },
    cornersDotOptions: {
      type: style.qr.cornerDotType,
      color: style.qr.cornerDotColor,
    },
    backgroundOptions: {
      color: style.qr.backgroundColor,
    },
  };
}
