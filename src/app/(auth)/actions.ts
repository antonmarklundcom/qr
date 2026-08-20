"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from "@/lib/passwords";
import { getDictionary, DEFAULT_LOCALE } from "@/lib/locale";

export interface AuthFormState {
  error?: string;
}

const t = () => getDictionary(DEFAULT_LOCALE);

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: t().auth.invalidCredentials };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: t().auth.invalidCredentials };
  }

  const session = await getSession();
  session.userId = user.id;
  session.tenantId = user.tenantId;
  session.role = user.role;
  await session.save();

  redirect("/app");
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  const tenantName =
    String(formData.get("tenantName") ?? "").trim().slice(0, 160) || name || email;

  if (!email || !email.includes("@")) return { error: t().auth.invalidCredentials };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: t().auth.passwordTooShort };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) return { error: t().auth.emailTaken };

  const [tenantInsert] = await db
    .insert(tenants)
    .values({ name: tenantName, plan: "free", locale: DEFAULT_LOCALE });
  const tenantId = tenantInsert.insertId;

  const [userInsert] = await db.insert(users).values({
    tenantId,
    email,
    passwordHash: await hashPassword(password),
    name: name || null,
    // First user of a tenant owns it — billing and deletion live with this role.
    role: "owner",
  });

  const session = await getSession();
  session.userId = userInsert.insertId;
  session.tenantId = tenantId;
  session.role = "owner";
  await session.save();

  redirect("/app");
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  await session.destroy();
  redirect("/login");
}
