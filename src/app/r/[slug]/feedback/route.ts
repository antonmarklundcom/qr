import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedback, qrCodes, shortLinks } from "@/db/schema";
import {
  HONEYPOT_FIELD,
  rateLimitOk,
  verifyFormToken,
} from "@/lib/form-token";
import type { GateError } from "../gate-page";

export const dynamic = "force-dynamic";

/**
 * The only public write in the app (plan §5). Everything it accepts is untrusted: it is
 * capped in length, never rendered back into the page, and reachable only on a link
 * whose mode is 'rating_gate'.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [link] = await db
    .select({
      id: shortLinks.id,
      tenantId: shortLinks.tenantId,
      mode: shortLinks.mode,
      active: shortLinks.active,
    })
    .from(shortLinks)
    .where(eq(shortLinks.slug, slug))
    .limit(1);

  // A link that is off, unknown, or not in gate mode has no form — so it has no post.
  if (!link || !link.active || link.mode !== "rating_gate") {
    return backTo(slug, null);
  }

  const form = await request.formData().catch(() => null);
  if (!form) return backTo(slug, "empty");

  // Silently accepted and dropped: telling a bot which check caught it just helps it.
  const honeypot = String(form.get(HONEYPOT_FIELD) ?? "").trim();
  if (honeypot) return backTo(slug, null, true);

  const tokenResult = verifyFormToken(slug, asString(form.get("token")));
  if (tokenResult === "too_fast") return backTo(slug, "too_fast");
  if (tokenResult === "expired") return backTo(slug, "expired");
  if (tokenResult === "invalid") return backTo(slug, "expired");

  const message = String(form.get("message") ?? "")
    .trim()
    .slice(0, 2000);
  if (!message) return backTo(slug, "empty");

  const contact =
    String(form.get("contact") ?? "")
      .trim()
      .slice(0, 190) || null;

  const ratingRaw = Number(form.get("rating"));
  const rating =
    Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5
      ? ratingRaw
      : null;

  if (!rateLimitOk(`feedback:${link.id}`)) return backTo(slug, "rate_limited");

  // businessId is denormalized onto the row so the inbox can label a message even
  // after its card is deleted.
  const [card] = await db
    .select({ businessId: qrCodes.businessId })
    .from(qrCodes)
    .where(
      and(
        eq(qrCodes.shortLinkId, link.id),
        eq(qrCodes.tenantId, link.tenantId),
      ),
    )
    .limit(1);

  await db.insert(feedback).values({
    tenantId: link.tenantId,
    shortLinkId: link.id,
    businessId: card?.businessId ?? null,
    rating,
    message,
    contact,
  });

  return backTo(slug, null, true);
}

function asString(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * POST/redirect/GET: the visitor lands back on the interstitial, so a refresh cannot
 * post the same message twice.
 */
function backTo(slug: string, error: GateError | null, sent = false) {
  const query = sent ? "?sent=1" : error ? `?err=${error}` : "";
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/r/${encodeURIComponent(slug)}${query}`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
