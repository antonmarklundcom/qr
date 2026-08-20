import type { TenantPlan } from "@/db/schema";

export interface PlanLimits {
  maxBusinesses: number;
  maxCards: number;
  /** Free exports carry a watermark; the flag is always read from the DB. */
  watermarkExports: boolean;
}

export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  free: { maxBusinesses: 1, maxCards: 1, watermarkExports: true },
  paid: {
    maxBusinesses: Number.POSITIVE_INFINITY,
    maxCards: Number.POSITIVE_INFINITY,
    watermarkExports: false,
  },
};

export function limitsFor(plan: TenantPlan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

/** Watermark text is a brand string, not UI copy — same in every locale. */
export const WATERMARK_TEXT = "DEMO";

/** 300 KB cap on logos stored as base64 in the DB (plan §9.3). */
export const LOGO_MAX_BYTES = 300 * 1024;
export const LOGO_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];
