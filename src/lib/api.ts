import "server-only";
import { hasRole, requireApiTenant, type AuthContext } from "@/lib/auth";
import type { UserRole } from "@/db/schema";

export function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/**
 * Every mutating route starts here: session -> tenant -> role. A route that skips it
 * is a bug, not a shortcut.
 */
export async function withRole(
  minimum: UserRole,
): Promise<{ ctx: AuthContext } | { response: Response }> {
  const ctx = await requireApiTenant();
  if (!ctx) return { response: jsonError(401, "Unauthorized") };
  if (!hasRole(ctx, minimum)) {
    return { response: jsonError(403, ctx.t.auth.forbidden) };
  }
  return { ctx };
}

export function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
