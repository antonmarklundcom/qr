/**
 * Flip a tenant between the free and paid plan.
 *
 * v1 has no payment integration on purpose (plan §10): a customer pays by
 * transferencia, and the plan flag is flipped by hand here. Run it the same way as the
 * seed — `tsx` does NOT auto-load .env:
 *
 *   export DATABASE_URL="mysql://user:pass@host:3306/dbname"
 *   npx tsx scripts/set-plan.ts --tenant 3 --plan paid
 *   npx tsx scripts/set-plan.ts --email cliente@ejemplo.com.py --plan paid
 *   npx tsx scripts/set-plan.ts --list
 */
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { tenants, users, type TenantPlan } from "../src/db/schema";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function isPlan(value: string | undefined): value is TenantPlan {
  return value === "free" || value === "paid";
}

async function list() {
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      plan: tenants.plan,
      locale: tenants.locale,
      owner: users.email,
    })
    .from(tenants)
    .leftJoin(users, eq(users.tenantId, tenants.id))
    .orderBy(tenants.id);

  const seen = new Set<number>();
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    console.log(
      `#${row.id}\t${row.plan.padEnd(4)}\t${row.locale}\t${row.name}\t${row.owner ?? "-"}`,
    );
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — see the comment at the top of this file");
  }

  if (process.argv.includes("--list")) {
    await list();
    return;
  }

  const plan = arg("plan");
  if (!isPlan(plan)) {
    throw new Error("Pass --plan free|paid (or --list to see every tenant)");
  }

  const tenantArg = arg("tenant");
  const email = arg("email")?.trim().toLowerCase();

  let tenantId: number;
  if (tenantArg) {
    tenantId = Number(tenantArg);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      throw new Error(`--tenant must be a positive integer, got "${tenantArg}"`);
    }
  } else if (email) {
    const [user] = await db
      .select({ tenantId: users.tenantId })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user) throw new Error(`No user with email ${email}`);
    tenantId = user.tenantId;
  } else {
    throw new Error("Pass --tenant <id> or --email <address>");
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) throw new Error(`No tenant with id ${tenantId}`);

  if (tenant.plan === plan) {
    console.log(`Tenant #${tenant.id} "${tenant.name}" is already on the ${plan} plan.`);
    return;
  }

  await db.update(tenants).set({ plan }).where(eq(tenants.id, tenant.id));
  console.log(
    `Tenant #${tenant.id} "${tenant.name}": ${tenant.plan} -> ${plan}.` +
      (plan === "paid"
        ? " Limits lifted and exports are now watermark-free."
        : " Limits reapplied and exports are watermarked again."),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
