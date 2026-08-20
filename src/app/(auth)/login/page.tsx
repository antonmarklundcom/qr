import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "../AuthForm";
import { loginAction } from "../actions";
import { getAuthContext } from "@/lib/auth";
import { getDictionary } from "@/lib/locale";

export default async function LoginPage() {
  if (await getAuthContext()) redirect("/app");
  const t = getDictionary();

  return (
    <>
      <span className="eyebrow mb-3">{t.brand.name}</span>
      <h1 className="display-md mb-2">{t.auth.loginTitle}</h1>
      <p className="muted mb-6 text-meta">{t.auth.loginSubtitle}</p>
      <AuthForm mode="login" action={loginAction} t={t} />
      <p className="meta mt-6 mb-0">
        {t.auth.noAccount}{" "}
        <Link href="/register" className="text-[color:var(--accent)]">
          {t.auth.register}
        </Link>
      </p>
    </>
  );
}
