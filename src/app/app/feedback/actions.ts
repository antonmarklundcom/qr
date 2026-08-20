"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { feedback, type FeedbackStatus } from "@/db/schema";
import { hasRole, requireTenant } from "@/lib/auth";

const STATUSES: FeedbackStatus[] = ["new", "read", "archived"];

/** Every write is scoped by id AND tenantId — a foreign id simply matches nothing. */
export async function setFeedbackStatusAction(formData: FormData) {
  const ctx = await requireTenant();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  if (!Number.isInteger(id) || !STATUSES.includes(status as FeedbackStatus)) return;

  await db
    .update(feedback)
    .set({ status: status as FeedbackStatus })
    .where(and(eq(feedback.id, id), eq(feedback.tenantId, ctx.tenant.id)));

  revalidatePath("/app/feedback");
}

/**
 * Feedback rows hold personal data the visitor typed, so deleting them has to be
 * possible — and it is a real delete, not a status flip (plan §8, GDPR).
 */
export async function deleteFeedbackAction(formData: FormData) {
  const ctx = await requireTenant();
  if (!hasRole(ctx, "admin")) return;

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await db
    .delete(feedback)
    .where(and(eq(feedback.id, id), eq(feedback.tenantId, ctx.tenant.id)));

  revalidatePath("/app/feedback");
}
