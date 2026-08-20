import "server-only";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, qrCodes, scans, shortLinks, tenants } from "@/db/schema";
import { getDictionary, DEFAULT_LOCALE } from "@/lib/locale";
import {
  deviceTypeFromUserAgent,
  hashUserAgent,
  safeReferrer,
} from "@/lib/scan-tracking";
import { issueFormToken } from "@/lib/form-token";
import { renderGateHtml, type GateError } from "./gate-page";

/**
 * Shared by the GET redirect and the feedback POST. Kept out of route.ts because a
 * Next.js route file may only export HTTP methods and route config.
 */

/** Never awaited in the response path: the response is already on the wire. */
export function logScan(
  shortLinkId: number,
  tenantId: number,
  userAgent: string | null,
  referrer: string | null,
) {
  after(async () => {
    try {
      await db.insert(scans).values({
        shortLinkId,
        tenantId,
        deviceType: deviceTypeFromUserAgent(userAgent),
        uaHash: hashUserAgent(userAgent),
        referrer: safeReferrer(referrer),
      });
    } catch (error) {
      // A dropped analytics row must never surface to the person scanning the card.
      console.error("scan insert failed", error);
    }
  });
}

export function gateErrorFrom(value: string | null): GateError | null {
  const allowed: GateError[] = ["empty", "too_fast", "expired", "rate_limited"];
  return allowed.find((e) => e === value) ?? null;
}

/**
 * The rating-gate interstitial (plan §5). Needs the business name and the tenant's
 * locale, so it costs one extra query — acceptable because this branch is opt-in per
 * card and is not the plain-redirect fast path.
 */
export async function gatePage({
  slug,
  tenantId,
  destinationUrl,
  sent,
  error,
}: {
  slug: string;
  tenantId: number;
  destinationUrl: string;
  sent: boolean;
  error: GateError | null;
}) {
  const [row] = await db
    .select({ businessName: businesses.name, locale: tenants.locale })
    .from(shortLinks)
    .innerJoin(
      qrCodes,
      and(
        eq(qrCodes.shortLinkId, shortLinks.id),
        eq(qrCodes.tenantId, shortLinks.tenantId),
      ),
    )
    .innerJoin(businesses, eq(qrCodes.businessId, businesses.id))
    .innerJoin(tenants, eq(tenants.id, shortLinks.tenantId))
    .where(and(eq(shortLinks.slug, slug), eq(shortLinks.tenantId, tenantId)))
    .limit(1);

  const html = renderGateHtml({
    t: getDictionary(row?.locale ?? DEFAULT_LOCALE),
    slug,
    businessName: row?.businessName ?? null,
    destinationUrl,
    formToken: issueFormToken(slug),
    sent,
    error,
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}

