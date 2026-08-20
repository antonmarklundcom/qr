import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { qrCodes, scans, shortLinks } from "@/db/schema";
import { jsonError, parseId, withRole } from "@/lib/api";
import { parseCardStyle } from "@/lib/card-style";
import { getCardDetail } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

interface PatchBody {
  name?: string;
  style?: unknown;
  status?: "draft" | "active" | "archived";
  destinationUrl?: string;
  active?: boolean;
  mode?: "direct" | "rating_gate";
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await withRole("member");
  if ("response" in auth) return auth.response;
  const { ctx } = auth;

  const id = parseId((await params).id);
  if (!id) return jsonError(400, ctx.t.common.error);

  // Ownership check by id AND tenantId — a foreign id is a 404, never a 403 leak.
  const detail = await getCardDetail(ctx.tenant.id, id);
  if (!detail) return jsonError(404, ctx.t.common.error);

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body) return jsonError(400, ctx.t.common.error);

  const cardUpdate: Partial<typeof qrCodes.$inferInsert> = {};
  if (typeof body.name === "string") {
    cardUpdate.name = body.name.trim().slice(0, 160) || detail.card.name;
  }
  if (body.style !== undefined) {
    cardUpdate.style = parseCardStyle(body.style, ctx.tenant.locale);
  }
  if (body.status && ["draft", "active", "archived"].includes(body.status)) {
    cardUpdate.status = body.status;
  }
  if (Object.keys(cardUpdate).length > 0) {
    await db
      .update(qrCodes)
      .set(cardUpdate)
      .where(and(eq(qrCodes.id, id), eq(qrCodes.tenantId, ctx.tenant.id)));
  }

  const linkUpdate: Partial<typeof shortLinks.$inferInsert> = {};
  if (typeof body.destinationUrl === "string") {
    const url = body.destinationUrl.trim();
    if (!/^https?:\/\//i.test(url) || url.length > 700) {
      return jsonError(400, ctx.t.common.error);
    }
    linkUpdate.destinationUrl = url;
  }
  if (typeof body.active === "boolean") linkUpdate.active = body.active;
  if (body.mode && ["direct", "rating_gate"].includes(body.mode)) {
    linkUpdate.mode = body.mode;
  }
  if (Object.keys(linkUpdate).length > 0) {
    await db
      .update(shortLinks)
      .set(linkUpdate)
      .where(
        and(
          eq(shortLinks.id, detail.shortLink.id),
          eq(shortLinks.tenantId, ctx.tenant.id),
        ),
      );
  }

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await withRole("admin");
  if ("response" in auth) return auth.response;
  const { ctx } = auth;

  const id = parseId((await params).id);
  if (!id) return jsonError(400, ctx.t.common.error);

  const detail = await getCardDetail(ctx.tenant.id, id);
  if (!detail) return jsonError(404, ctx.t.common.error);

  await db
    .delete(qrCodes)
    .where(and(eq(qrCodes.id, id), eq(qrCodes.tenantId, ctx.tenant.id)));
  await db
    .delete(scans)
    .where(
      and(
        eq(scans.shortLinkId, detail.shortLink.id),
        eq(scans.tenantId, ctx.tenant.id),
      ),
    );
  await db
    .delete(shortLinks)
    .where(
      and(
        eq(shortLinks.id, detail.shortLink.id),
        eq(shortLinks.tenantId, ctx.tenant.id),
      ),
    );

  return Response.json({ ok: true });
}
