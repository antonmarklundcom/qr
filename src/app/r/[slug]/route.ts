import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, qrCodes, scans, shortLinks } from "@/db/schema";
import { getDictionary, DEFAULT_LOCALE } from "@/lib/locale";
import {
  deviceTypeFromUserAgent,
  hashUserAgent,
  safeReferrer,
} from "@/lib/scan-tracking";
import { renderInactiveHtml } from "./inactive-page";

export const dynamic = "force-dynamic";

/** The only latency-critical route in the app. Keep the happy path to one query. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [link] = await db
    .select({
      id: shortLinks.id,
      tenantId: shortLinks.tenantId,
      destinationUrl: shortLinks.destinationUrl,
      active: shortLinks.active,
      mode: shortLinks.mode,
    })
    .from(shortLinks)
    .where(eq(shortLinks.slug, slug))
    .limit(1);

  if (!link) return brandedNotFound("unknown");
  if (!link.active) return brandedNotFound("inactive", link.tenantId, slug);

  // v1.1 will render an interstitial for mode === 'rating_gate' (plan §5). Until then
  // every link — including one flipped to rating_gate by hand — redirects.
  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");

  // Never awaited in the response path: the 302 is already on the wire when this runs.
  after(async () => {
    try {
      await db.insert(scans).values({
        shortLinkId: link.id,
        tenantId: link.tenantId,
        deviceType: deviceTypeFromUserAgent(userAgent),
        uaHash: hashUserAgent(userAgent),
        referrer: safeReferrer(referrer),
      });
    } catch (error) {
      // A dropped analytics row must never surface to the person scanning the card.
      console.error("scan insert failed", error);
    }
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: link.destinationUrl,
      // Scans must always hit the server; a cached redirect would silently stop
      // counting and would pin an old destination into the visitor's browser.
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}

async function brandedNotFound(
  variant: "inactive" | "unknown",
  tenantId?: number,
  slug?: string,
) {
  let businessName: string | null = null;
  const locale = DEFAULT_LOCALE;

  if (variant === "inactive" && tenantId && slug) {
    const [row] = await db
      .select({ name: businesses.name })
      .from(shortLinks)
      .innerJoin(
        qrCodes,
        and(
          eq(qrCodes.shortLinkId, shortLinks.id),
          eq(qrCodes.tenantId, shortLinks.tenantId),
        ),
      )
      .innerJoin(businesses, eq(qrCodes.businessId, businesses.id))
      .where(eq(shortLinks.slug, slug))
      .limit(1);
    businessName = row?.name ?? null;
  }

  const html = renderInactiveHtml({
    t: getDictionary(locale),
    variant,
    businessName,
  });

  return new Response(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
