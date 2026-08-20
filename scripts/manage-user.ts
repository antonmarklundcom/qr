/**
 * Add a user to an existing tenant, change a role, or reset a password.
 *
 * v1 has no invite flow: registering creates a *new* tenant, so this is the only way to
 * give a second person access to an existing account — which is what the agency case in
 * plan §8 needs. Run it like the seed; `tsx` does NOT auto-load .env:
 *
 *   export DATABASE_URL="mysql://user:pass@host:3306/dbname"
 *   npx tsx scripts/manage-user.ts --add --tenant 3 --email socio@ejemplo.com.py --role admin --password 'una-clave-larga'
 *   npx tsx scripts/manage-user.ts --role owner --email socio@ejemplo.com.py
 *   npx tsx scripts/manage-user.ts --password 'nueva-clave' --email socio@ejemplo.com.py
 *   npx tsx scripts/manage-user.ts --list --tenant 3
 */
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { tenants, users, type UserRole } from "../src/db/schema";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/lib/passwords";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function isRole(value: string | undefined): value is UserRole {
  return value === "owner" || value === "admin" || value === "member";
}

async function list(tenantId?: number) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      tenantId: users.tenantId,
      tenantName: tenants.name,
    })
    .from(users)
    .innerJoin(tenants, eq(users.tenantId, tenants.id))
    .orderBy(users.tenantId, users.id);

  for (const row of rows) {
    if (tenantId && row.tenantId !== tenantId) continue;
    console.log(
      `#${row.id}\t${row.role.padEnd(6)}\t${row.email}\ttenant #${row.tenantId} ${row.tenantName}`,
    );
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — see the comment at the top of this file");
  }

  const email = arg("email")?.trim().toLowerCase();
  const role = arg("role");
  const password = arg("password");
  const name = arg("name")?.trim().slice(0, 160) ?? null;
  const tenantArg = arg("tenant");
  const tenantId = tenantArg ? Number(tenantArg) : undefined;

  if (process.argv.includes("--list")) {
    await list(tenantId);
    return;
  }

  if (!email) throw new Error("Pass --email <address>");
  if (role !== undefined && !isRole(role)) {
    throw new Error(`--role must be owner|admin|member, got "${role}"`);
  }
  if (password !== undefined && password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`--password needs at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (process.argv.includes("--add")) {
    if (existing) {
      throw new Error(
        `${email} already exists (user #${existing.id}, tenant #${existing.tenantId}). ` +
          "Drop --add to change their role or password instead.",
      );
    }
    if (!tenantId || !Number.isInteger(tenantId)) {
      throw new Error("Pass --tenant <id> — run scripts/set-plan.ts --list to find it");
    }
    if (!password) throw new Error("Pass --password for a new user");
    if (!isRole(role)) throw new Error("Pass --role owner|admin|member for a new user");

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant) throw new Error(`No tenant with id ${tenantId}`);

    const [inserted] = await db.insert(users).values({
      tenantId,
      email,
      passwordHash: await hashPassword(password),
      name,
      role,
    });

    console.log(
      `Added user #${inserted.insertId} ${email} as ${role} on tenant #${tenantId} "${tenant.name}".`,
    );
    return;
  }

  if (!existing) {
    throw new Error(`No user with email ${email}. Use --add to create one.`);
  }
  if (!role && !password && name === null) {
    throw new Error("Nothing to do — pass --role, --password, --name, or --add");
  }

  const update: { role?: UserRole; passwordHash?: string; name?: string } = {};
  if (isRole(role)) update.role = role;
  if (password) update.passwordHash = await hashPassword(password);
  if (name) update.name = name;

  await db.update(users).set(update).where(eq(users.id, existing.id));

  const changed = [
    update.role ? `role ${existing.role} -> ${update.role}` : null,
    update.passwordHash ? "password reset" : null,
    update.name ? `name -> ${update.name}` : null,
  ].filter(Boolean);
  console.log(`User #${existing.id} ${email}: ${changed.join(", ")}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
