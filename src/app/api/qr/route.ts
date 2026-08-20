import { db } from "@/db";
import { qrCodes, shortLinks } from "@/db/schema";
import { jsonError, withRole } from "@/lib/api";
import { defaultCardStyle } from "@/lib/card-style";
import { limitsFor } from "@/lib/plan";
import { countCards, getBusiness } from "@/lib/queries";
import { allocateSlug, buildReviewDestination } from "@/lib/short-links";

/** Create a card: allocates its short link and seeds the locale's default style. */
export async function POST(request: Request) {
  const auth = await withRole("member");
  if ("response" in auth) return auth.response;
  const { ctx } = auth;

  const body = (await request.json().catch(() => null)) as {
    businessId?: number;
    name?: string;
  } | null;
  if (!body?.businessId) return jsonError(400, ctx.t.common.error);

  const business = await getBusiness(ctx.tenant.id, Number(body.businessId));
  if (!business) return jsonError(404, ctx.t.common.error);

  const destination = buildReviewDestination(business);
  if (!destination) return jsonError(400, ctx.t.businesses.needsDestination);

  const limits = limitsFor(ctx.tenant.plan);
  if ((await countCards(ctx.tenant.id)) >= limits.maxCards) {
    return jsonError(403, ctx.t.plan.freeLimitCards);
  }

  const slug = await allocateSlug();
  const [linkInsert] = await db.insert(shortLinks).values({
    tenantId: ctx.tenant.id,
    slug,
    destinationUrl: destination,
    mode: "direct",
    active: true,
  });

  const [cardInsert] = await db.insert(qrCodes).values({
    tenantId: ctx.tenant.id,
    businessId: business.id,
    name: (body.name ?? "").trim().slice(0, 160) || business.name,
    style: defaultCardStyle(ctx.tenant.locale),
    shortLinkId: linkInsert.insertId,
    status: "active",
  });

  return Response.json({ id: cardInsert.insertId, slug }, { status: 201 });
}
