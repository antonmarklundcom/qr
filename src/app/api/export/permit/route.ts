import { jsonError, parseId, withRole } from "@/lib/api";
import { limitsFor, WATERMARK_TEXT } from "@/lib/plan";
import { getCardDetail } from "@/lib/queries";

/**
 * Export runs in the browser (plan §6), so the watermark decision is taken here, from
 * the tenant's plan flag in the DB, and the editor asks for it immediately before every
 * export. A client-side export can never be cryptographically sealed; if clean exports
 * ever need to be truly gated, the server-render fallback in plan §6 is the answer.
 */
export async function GET(request: Request) {
  const auth = await withRole("member");
  if ("response" in auth) return auth.response;
  const { ctx } = auth;

  const cardId = parseId(
    new URL(request.url).searchParams.get("cardId") ?? undefined,
  );
  if (!cardId) return jsonError(400, ctx.t.common.error);

  const detail = await getCardDetail(ctx.tenant.id, cardId);
  if (!detail) return jsonError(404, ctx.t.common.error);

  const { watermarkExports } = limitsFor(ctx.tenant.plan);
  return Response.json(
    {
      plan: ctx.tenant.plan,
      watermarkText: watermarkExports ? WATERMARK_TEXT : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
