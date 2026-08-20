import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { countNewFeedback } from "@/lib/queries";
import { logoutAction } from "@/app/(auth)/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, user, tenant } = await requireTenant();
  const newFeedback = await countNewFeedback(tenant.id);

  const links = [
    { href: "/app", label: t.nav.dashboard, count: 0 },
    { href: "/app/businesses", label: t.nav.businesses, count: 0 },
    { href: "/app/feedback", label: t.nav.feedback, count: newFeedback },
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[color:var(--hairline)] bg-[color:var(--surface)]">
        <div className="wrap flex flex-wrap items-center gap-4 py-4">
          <Link
            href="/app"
            className="font-[family-name:var(--font-display)] text-title font-medium text-[color:var(--ink)] no-underline"
          >
            {t.brand.name}
          </Link>

          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[var(--r-sm)] px-3 py-2 text-meta font-medium text-[color:var(--ink-70)] no-underline transition-colors hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--accent)]"
              >
                {link.label}
                {link.count > 0 ? (
                  <span className="badge badge--accent ml-2">{link.count}</span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="badge badge--accent">
              {tenant.plan === "paid" ? t.plan.paid : t.plan.free}
            </span>
            <span className="meta hidden sm:inline">
              {user.email} · {t.roles[user.role]}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="btn btn--ghost btn--sm">
                {t.auth.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="wrap py-10">{children}</main>
    </div>
  );
}
