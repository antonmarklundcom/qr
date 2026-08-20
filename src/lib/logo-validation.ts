import "server-only";
import { LOGO_ALLOWED_TYPES } from "@/lib/plan";

/**
 * The multipart Content-Type is client-supplied, so it says nothing about what the
 * bytes actually are. Sniff the real type and make the two agree before anything is
 * stored as a data: URI.
 */
export function sniffImageType(bytes: Buffer): string | null {
  if (bytes.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  // SVG is text: allow leading whitespace, a BOM, an XML declaration or comments.
  const head = bytes.toString("utf8", 0, Math.min(bytes.length, 1024)).trimStart();
  if (/^(﻿)?(<\?xml[\s\S]*?\?>\s*|<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>]/i.test(head)) {
    return "image/svg+xml";
  }
  return null;
}

const SVG_SCRIPTING = [
  /<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi,
  /<\s*script[^>]*\/?>/gi,
  /<\s*foreignObject[\s\S]*?<\s*\/\s*foreignObject\s*>/gi,
  /<\s*(handler|set|animate)[^>]*>/gi,
  /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
  /(href|xlink:href)\s*=\s*("|')?\s*javascript:[^"'>]*("|')?/gi,
];

/**
 * An uploaded SVG is only ever rendered through <img src> and SVG <image href>, which
 * browsers load with scripting disabled — but the file is stored, and a future change
 * that inlines it or serves it as a document would turn that into stored XSS. Strip the
 * active constructs now rather than rely on the sink staying safe.
 */
export function sanitizeSvg(source: string): string {
  return SVG_SCRIPTING.reduce((out, pattern) => out.replace(pattern, ""), source);
}

export interface LogoValidationResult {
  ok: boolean;
  /** Set when ok — the data: URI to store, built from the sniffed type. */
  dataUrl?: string;
  /** Set when not ok — a dictionary key for the message to show. */
  reason?: "logoBadType";
}

export function buildLogoDataUrl(bytes: Buffer): LogoValidationResult {
  const sniffed = sniffImageType(bytes);
  if (!sniffed || !LOGO_ALLOWED_TYPES.includes(sniffed)) {
    return { ok: false, reason: "logoBadType" };
  }

  const payload =
    sniffed === "image/svg+xml"
      ? Buffer.from(sanitizeSvg(bytes.toString("utf8")), "utf8")
      : bytes;

  return {
    ok: true,
    dataUrl: `data:${sniffed};base64,${payload.toString("base64")}`,
  };
}
