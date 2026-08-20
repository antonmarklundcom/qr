import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  businesses,
  feedback,
  qrCodes,
  scans,
  shortLinks,
  type AppLocale,
  type FeedbackStatus,
} from "@/db/schema";
import { getDictionary } from "@/lib/locale";
import { timezoneOffsetMinutes } from "@/lib/timezone";

/** Every read is scoped by tenantId here, never by a client-supplied value. */

export async function listBusinesses(tenantId: number) {
  return db
    .select()
    .from(businesses)
    .where(eq(businesses.tenantId, tenantId))
    .orderBy(businesses.name);
}

export async function getBusiness(tenantId: number, id: number) {
  const [row] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, id), eq(businesses.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}

export async function countBusinesses(tenantId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(businesses)
    .where(eq(businesses.tenantId, tenantId));
  return Number(row?.count ?? 0);
}

export async function countCards(tenantId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(qrCodes)
    .where(eq(qrCodes.tenantId, tenantId));
  return Number(row?.count ?? 0);
}

export async function listCards(tenantId: number) {
  return db
    .select({
      id: qrCodes.id,
      name: qrCodes.name,
      status: qrCodes.status,
      updatedAt: qrCodes.updatedAt,
      businessId: businesses.id,
      businessName: businesses.name,
      slug: shortLinks.slug,
      active: shortLinks.active,
      scanCount: sql<number>`(
        select count(*) from ${scans} where ${scans.shortLinkId} = ${shortLinks.id}
      )`,
    })
    .from(qrCodes)
    .innerJoin(businesses, eq(qrCodes.businessId, businesses.id))
    .innerJoin(shortLinks, eq(qrCodes.shortLinkId, shortLinks.id))
    .where(eq(qrCodes.tenantId, tenantId))
    .orderBy(desc(qrCodes.updatedAt));
}

/** Fetch by id AND tenantId — a wrong id is a 404, never someone else's card. */
export async function getCardDetail(tenantId: number, id: number) {
  const [row] = await db
    .select({
      card: qrCodes,
      business: businesses,
      shortLink: shortLinks,
    })
    .from(qrCodes)
    .innerJoin(businesses, eq(qrCodes.businessId, businesses.id))
    .innerJoin(shortLinks, eq(qrCodes.shortLinkId, shortLinks.id))
    .where(and(eq(qrCodes.id, id), eq(qrCodes.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}

export async function countCardsForBusiness(tenantId: number, businessId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(qrCodes)
    .where(and(eq(qrCodes.tenantId, tenantId), eq(qrCodes.businessId, businessId)));
  return Number(row?.count ?? 0);
}

export interface DayBucket {
  day: string;
  count: number;
}

export interface ScanStats {
  total: number;
  last30: number;
  last7: number;
  today: number;
  perDay: DayBucket[];
  devices: { deviceType: string; count: number }[];
}

function dayKeys(days: number, timeZone: string): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    out.push(
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d),
    );
  }
  return out;
}

/**
 * Two indexed GROUP BY queries, no aggregation tables (plan §7). `scope` is either one
 * short link or the whole tenant.
 */
export async function getScanStats(
  tenantId: number,
  locale: AppLocale,
  shortLinkId?: number,
  days = 30,
): Promise<ScanStats> {
  const timeZone = getDictionary(locale).meta.timeZone;
  const offset = timezoneOffsetMinutes(timeZone);
  const since = new Date(Date.now() - (days - 1) * 86400000);
  const localDay = sql<string>`date(date_add(${scans.scannedAt}, interval ${offset} minute))`;

  const scope = shortLinkId
    ? and(eq(scans.tenantId, tenantId), eq(scans.shortLinkId, shortLinkId))
    : eq(scans.tenantId, tenantId);

  const [totals, perDayRows, deviceRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(scans).where(scope),
    db
      .select({ day: localDay, count: sql<number>`count(*)` })
      .from(scans)
      .where(and(scope, gte(scans.scannedAt, since)))
      .groupBy(localDay)
      .orderBy(localDay),
    db
      .select({ deviceType: scans.deviceType, count: sql<number>`count(*)` })
      .from(scans)
      .where(and(scope, gte(scans.scannedAt, since)))
      .groupBy(scans.deviceType),
  ]);

  const counts = new Map<string, number>();
  for (const row of perDayRows) {
    counts.set(String(row.day).slice(0, 10), Number(row.count));
  }

  const keys = dayKeys(days, timeZone);
  const perDay = keys.map((day) => ({ day, count: counts.get(day) ?? 0 }));
  const last30 = perDay.reduce((sum, d) => sum + d.count, 0);
  const last7 = perDay.slice(-7).reduce((sum, d) => sum + d.count, 0);

  return {
    total: Number(totals[0]?.count ?? 0),
    last30,
    last7,
    today: perDay[perDay.length - 1]?.count ?? 0,
    perDay,
    devices: deviceRows.map((d) => ({
      deviceType: d.deviceType,
      count: Number(d.count),
    })),
  };
}

/**
 * The private-feedback inbox (plan §5). Left joined onto the card so a message survives
 * its card being deleted — the row still carries tenantId and businessId.
 */
export async function listFeedback(
  tenantId: number,
  filter: FeedbackStatus | "all" = "all",
  limit = 100,
) {
  const scope =
    filter === "all"
      ? eq(feedback.tenantId, tenantId)
      : and(eq(feedback.tenantId, tenantId), eq(feedback.status, filter));

  return db
    .select({
      id: feedback.id,
      rating: feedback.rating,
      message: feedback.message,
      contact: feedback.contact,
      status: feedback.status,
      createdAt: feedback.createdAt,
      cardId: qrCodes.id,
      cardName: qrCodes.name,
      businessName: businesses.name,
    })
    .from(feedback)
    .leftJoin(
      qrCodes,
      and(
        eq(qrCodes.shortLinkId, feedback.shortLinkId),
        eq(qrCodes.tenantId, feedback.tenantId),
      ),
    )
    .leftJoin(businesses, eq(businesses.id, feedback.businessId))
    .where(scope)
    .orderBy(desc(feedback.createdAt))
    .limit(limit);
}

export async function countNewFeedback(tenantId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(feedback)
    .where(and(eq(feedback.tenantId, tenantId), eq(feedback.status, "new")));
  return Number(row?.count ?? 0);
}

export interface FeedbackStats {
  total: number;
  /** Messages that actually carried a star; the rating is optional on the form. */
  rated: number;
  average: number | null;
  distribution: { rating: number; count: number }[];
}

/**
 * Only meaningful for a card whose link is in 'rating_gate' mode — a 'direct' card has
 * no form to leave a message on, so the page hides this block rather than showing zeros.
 */
export async function getFeedbackStats(
  tenantId: number,
  shortLinkId: number,
): Promise<FeedbackStats> {
  const rows = await db
    .select({ rating: feedback.rating, count: sql<number>`count(*)` })
    .from(feedback)
    .where(
      and(eq(feedback.tenantId, tenantId), eq(feedback.shortLinkId, shortLinkId)),
    )
    .groupBy(feedback.rating);

  let total = 0;
  let rated = 0;
  let sum = 0;
  const counts = new Map<number, number>();
  for (const row of rows) {
    const count = Number(row.count);
    total += count;
    if (row.rating != null) {
      rated += count;
      sum += row.rating * count;
      counts.set(row.rating, count);
    }
  }

  return {
    total,
    rated,
    average: rated > 0 ? sum / rated : null,
    distribution: [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: counts.get(rating) ?? 0,
    })),
  };
}
