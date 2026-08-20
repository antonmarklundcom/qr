import { createHash } from "node:crypto";
import type { Scan } from "@/db/schema";

export type DeviceType = Scan["deviceType"];

/**
 * Deliberately coarse. We store no IP and no precise geo (plan §8), so this is a
 * three-bucket guess from the UA string and nothing more.
 */
export function deviceTypeFromUserAgent(ua: string | null): DeviceType {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|windows phone|opera mini/.test(s)) {
    return "mobile";
  }
  if (/mozilla|chrome|safari|firefox|edge|opera/.test(s)) return "desktop";
  return "unknown";
}

/**
 * Salted SHA-256 of the UA. Gives rough uniqueness bucketing without storing anything
 * that identifies a person; v1 does not surface a uniques metric (plan §9.5).
 */
export function hashUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const salt = process.env.SCAN_HASH_SALT ?? "qr-review-cards";
  return createHash("sha256").update(`${salt}:${ua}`).digest("hex").slice(0, 64);
}

/** Origin only — never the full referring URL. */
export function safeReferrer(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).origin.slice(0, 255);
  } catch {
    return null;
  }
}
