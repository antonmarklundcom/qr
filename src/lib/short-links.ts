import { customAlphabet } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shortLinks } from "@/db/schema";

/** Lowercase base36. Short matters: a smaller payload scans better at 15 mm. */
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 7);

export function generateSlug(): string {
  return nanoid();
}

/** Server-side slug allocation with collision retry against the unique index. */
export async function allocateSlug(maxAttempts = 8): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const slug = generateSlug();
    const existing = await db
      .select({ id: shortLinks.id })
      .from(shortLinks)
      .where(eq(shortLinks.slug, slug))
      .limit(1);
    if (existing.length === 0) return slug;
  }
  throw new Error("Could not allocate a unique slug after several attempts");
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** The URL that is physically printed on the card. Must never change per card. */
export function buildShortUrl(slug: string): string {
  return `${appUrl()}/r/${slug}`;
}

/**
 * Place ID beats a pasted maps URL: it survives the business renaming itself or Google
 * reshuffling its share links. Raw URL stays as a fallback (plan §3).
 */
export function buildReviewDestination(business: {
  googlePlaceId: string | null;
  googleReviewUrl: string | null;
}): string | null {
  if (business.googlePlaceId?.trim()) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(
      business.googlePlaceId.trim(),
    )}`;
  }
  const raw = business.googleReviewUrl?.trim();
  if (raw && /^https?:\/\//i.test(raw)) return raw;
  return null;
}
