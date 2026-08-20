"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { businesses, qrCodes, shortLinks } from "@/db/schema";
import { requireTenant, hasRole } from "@/lib/auth";
import { limitsFor } from "@/lib/plan";
import {
  countBusinesses,
  countCardsForBusiness,
  getBusiness,
} from "@/lib/queries";
import { buildReviewDestination } from "@/lib/short-links";

export interface BusinessFormState {
  error?: string;
  ok?: boolean;
}

function readFields(formData: FormData) {
  const str = (key: string, max: number) =>
    String(formData.get(key) ?? "").trim().slice(0, max) || null;
  return {
    name: str("name", 190),
    city: str("city", 120),
    whatsapp: str("whatsapp", 24),
    googlePlaceId: str("googlePlaceId", 120),
    googleReviewUrl: str("googleReviewUrl", 500),
  };
}

export async function createBusinessAction(
  _prev: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const ctx = await requireTenant();
  if (!hasRole(ctx, "admin")) return { error: ctx.t.auth.forbidden };

  const fields = readFields(formData);
  const name = fields.name;
  if (!name) return { error: ctx.t.businesses.name };

  const limits = limitsFor(ctx.tenant.plan);
  if ((await countBusinesses(ctx.tenant.id)) >= limits.maxBusinesses) {
    return { error: ctx.t.plan.freeLimitBusinesses };
  }

  const [inserted] = await db.insert(businesses).values({
    tenantId: ctx.tenant.id,
    name,
    city: fields.city,
    whatsapp: fields.whatsapp,
    googlePlaceId: fields.googlePlaceId,
    googleReviewUrl: fields.googleReviewUrl,
  });

  revalidatePath("/app/businesses");
  redirect(`/app/businesses/${inserted.insertId}`);
}

export async function updateBusinessAction(
  _prev: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const ctx = await requireTenant();
  if (!hasRole(ctx, "admin")) return { error: ctx.t.auth.forbidden };

  const id = Number(formData.get("id"));
  const business = await getBusiness(ctx.tenant.id, id);
  if (!business) return { error: ctx.t.common.error };

  const fields = readFields(formData);
  const name = fields.name;
  if (!name) return { error: ctx.t.businesses.name };

  await db
    .update(businesses)
    .set({ ...fields, name })
    .where(
      and(eq(businesses.id, business.id), eq(businesses.tenantId, ctx.tenant.id)),
    );

  // The destination lives on the short link so the printed QR never changes; when the
  // Place ID changes, every card of this business follows along.
  const destination = buildReviewDestination({ ...business, ...fields });
  if (destination) {
    const linkIds = await db
      .select({ id: shortLinks.id })
      .from(shortLinks)
      .innerJoin(qrCodes, eq(qrCodes.shortLinkId, shortLinks.id))
      .where(
        and(
          eq(qrCodes.businessId, business.id),
          eq(qrCodes.tenantId, ctx.tenant.id),
        ),
      );
    for (const link of linkIds) {
      await db
        .update(shortLinks)
        .set({ destinationUrl: destination })
        .where(
          and(
            eq(shortLinks.id, link.id),
            eq(shortLinks.tenantId, ctx.tenant.id),
          ),
        );
    }
  }

  revalidatePath("/app/businesses");
  revalidatePath(`/app/businesses/${business.id}`);
  return { ok: true };
}

export async function deleteBusinessAction(formData: FormData): Promise<void> {
  const ctx = await requireTenant();
  if (!hasRole(ctx, "owner")) return;

  const id = Number(formData.get("id"));
  const business = await getBusiness(ctx.tenant.id, id);
  if (!business) return;

  // Deleting a business that still has cards would orphan printed QR codes.
  if ((await countCardsForBusiness(ctx.tenant.id, business.id)) > 0) return;

  await db
    .delete(businesses)
    .where(
      and(eq(businesses.id, business.id), eq(businesses.tenantId, ctx.tenant.id)),
    );

  revalidatePath("/app/businesses");
  redirect("/app/businesses");
}
