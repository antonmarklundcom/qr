import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Anti-spam for the one public form in the app (plan §5). Three cheap layers, no
 * captcha and no third-party script on a page a paying customer's customer sees:
 *
 *  1. a signed timestamp, so a bot cannot post without first fetching the page;
 *  2. a minimum dwell time, because a human cannot read and type in under two seconds;
 *  3. a honeypot field that only an autofilling bot will complete.
 *
 * The token is scoped to the slug, so one harvested token cannot be replayed across
 * every card in the database.
 *
 * No `server-only` marker here, unlike the DB modules: `npm run check:gate` imports
 * this file directly under tsx. It reaches no database and its `node:crypto` import
 * already keeps it out of any client bundle.
 */

export { HONEYPOT_FIELD } from "./form-fields";

const MIN_AGE_MS = 2_000;
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

function key(): string {
  // Reuses the session secret rather than adding a fourth env var to every deploy.
  // session.ts already refuses to boot on a missing or placeholder value.
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is missing — see .env.example");
  return secret;
}

function sign(slug: string, issuedAt: number): string {
  return createHmac("sha256", key())
    .update(`${slug}:${issuedAt}`)
    .digest("base64url")
    .slice(0, 32);
}

export function issueFormToken(slug: string, now = Date.now()): string {
  return `${now}.${sign(slug, now)}`;
}

export type FormTokenResult = "ok" | "too_fast" | "expired" | "invalid";

export function verifyFormToken(
  slug: string,
  token: string | null,
  now = Date.now(),
): FormTokenResult {
  if (!token) return "invalid";
  const [issuedRaw, signature] = token.split(".");
  const issuedAt = Number(issuedRaw);
  if (!Number.isFinite(issuedAt) || !signature) return "invalid";

  const expected = sign(slug, issuedAt);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "invalid";

  const age = now - issuedAt;
  if (age < MIN_AGE_MS) return "too_fast";
  if (age > MAX_AGE_MS) return "expired";
  return "ok";
}

/**
 * Per-short-link submission ceiling, held in process memory. This app runs as a single
 * Hostinger Node process, so a Map is the honest fit; if it is ever scaled to more than
 * one instance this becomes per-instance and wants a shared store.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const buckets = new Map<string, number[]>();

export function rateLimitOk(bucketKey: string, now = Date.now()): boolean {
  const hits = (buckets.get(bucketKey) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    buckets.set(bucketKey, hits);
    return false;
  }
  hits.push(now);
  buckets.set(bucketKey, hits);

  // Bounded cleanup so a long-running process cannot grow the Map without limit.
  if (buckets.size > 5_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= WINDOW_MS)) buckets.delete(k);
    }
  }
  return true;
}
