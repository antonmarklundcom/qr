import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants, users, type Tenant, type User, type UserRole } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getDictionary, type Dictionary } from "@/lib/locale";

export interface AuthContext {
  user: User;
  tenant: Tenant;
  t: Dictionary;
}

/** Role hierarchy. `owner` can do everything an `admin` can, and so on. */
export const ROLE_RANK: Record<UserRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Loads the session user and tenant fresh from the DB on every call — role and plan
 * changes take effect immediately instead of living in a stale cookie.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session.userId) return null;

  const rows = await db
    .select({ user: users, tenant: tenants })
    .from(users)
    .innerJoin(tenants, eq(users.tenantId, tenants.id))
    .where(eq(users.id, session.userId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    await session.destroy();
    return null;
  }
  return { user: row.user, tenant: row.tenant, t: getDictionary(row.tenant.locale) };
}

/** For pages/layouts: bounces to /login when there is no session. */
export async function requireTenant(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** For API routes: returns null instead of redirecting. */
export async function requireApiTenant(): Promise<AuthContext | null> {
  return getAuthContext();
}

export function hasRole(ctx: AuthContext, minimum: UserRole): boolean {
  return ROLE_RANK[ctx.user.role] >= ROLE_RANK[minimum];
}

/**
 * Server-side role gate. Every mutating route calls this — hiding a button in the UI is
 * a nicety, this is the actual check.
 */
export function requireRole(ctx: AuthContext, minimum: UserRole): void {
  if (!hasRole(ctx, minimum)) throw new ForbiddenError();
}
