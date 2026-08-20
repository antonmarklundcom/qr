import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "../AuthForm";
import { registerAction } from "../actions";
import { getAuthContext } from "@/lib/auth";
import { getDictionary } from "@/lib/locale";

export default async function RegisterPage() {
  if (await getAuthContext()) redirect("/app");
  const t = getDictionary();

  return (
    <>
      <span className="eyebrow mb-3">{t.plan.free}</span>
      <h1 className="display-md mb-2">{t.auth.registerTitle}</h1>
      <p className="muted mb-6 text-[var(--t--1)]">{t.auth.registerSubtitle}</p>
      <AuthForm mode="register" action={registerAction} t={t} />
      <p className="meta mt-6 mb-0">
        {t.auth.hasAccount}{" "}
        <Link href="/login" className="text-[color:var(--accent)]">
          {t.auth.login}
        </Link>
      </p>
    </>
  );
}
