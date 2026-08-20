import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, qrCodes, shortLinks } from "@/db/schema";
import { getDictionary, DEFAULT_LOCALE } from "@/lib/locale";
import { renderInactiveHtml } from "./inactive-page";
import { gateErrorFrom, gatePage, logScan } from "./gate";

export const dynamic = "force-dynamic";

/** The only latency-critical route in the app. Keep the happy path to one query. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);

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

  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");

  // A post-submit reload lands back here with ?sent=1. That is the same person on the
  // same visit, so it must not count as a second scan.
  const sent = url.searchParams.get("sent") === "1";
  if (!sent) logScan(link.id, link.tenantId, userAgent, referrer);

  if (link.mode === "rating_gate") {
    return gatePage({
      slug,
      tenantId: link.tenantId,
      destinationUrl: link.destinationUrl,
      sent,
      error: gateErrorFrom(url.searchParams.get("err")),
    });
  }

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
