import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { jsonError, withRole } from "@/lib/api";
import { LOGO_ALLOWED_TYPES, LOGO_MAX_BYTES } from "@/lib/plan";
import { buildLogoDataUrl } from "@/lib/logo-validation";
import { getBusiness } from "@/lib/queries";

/**
 * Logos live in the DB as a base64 data URI (plan §9.3) — no filesystem to lose on a
 * redeploy. The 300 KB cap is enforced here, on the server, not by the file input.
 */
export async function POST(request: Request) {
  const auth = await withRole("admin");
  if ("response" in auth) return auth.response;
  const { ctx } = auth;

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError(400, ctx.t.common.error);

  const businessId = Number(form.get("businessId"));
  const file = form.get("file");

  const business = await getBusiness(ctx.tenant.id, businessId);
  if (!business) return jsonError(404, ctx.t.common.error);

  if (form.get("remove") === "1") {
    await db
      .update(businesses)
      .set({ logoDataUrl: null })
      .where(
        and(eq(businesses.id, business.id), eq(businesses.tenantId, ctx.tenant.id)),
      );
    return Response.json({ logoDataUrl: null });
  }

  if (!(file instanceof File)) return jsonError(400, ctx.t.common.error);
  if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
    return jsonError(415, ctx.t.businesses.logoBadType);
  }
  if (file.size > LOGO_MAX_BYTES) {
    return jsonError(413, ctx.t.businesses.logoTooBig);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > LOGO_MAX_BYTES) {
    return jsonError(413, ctx.t.businesses.logoTooBig);
  }

  // The declared Content-Type only decides whether to bother reading the file; the type
  // that gets stored is the one sniffed from the bytes.
  const logo = buildLogoDataUrl(buffer);
  if (!logo.ok || !logo.dataUrl) {
    return jsonError(415, ctx.t.businesses.logoBadType);
  }
  const logoDataUrl = logo.dataUrl;

  await db
    .update(businesses)
    .set({ logoDataUrl })
    .where(
      and(eq(businesses.id, business.id), eq(businesses.tenantId, ctx.tenant.id)),
    );

  return Response.json({ logoDataUrl });
}
