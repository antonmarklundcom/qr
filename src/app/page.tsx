import Link from "next/link";
import { getDictionary } from "@/lib/locale";
import { getAuthContext } from "@/lib/auth";

export default async function LandingPage() {
  const ctx = await getAuthContext();
  const t = ctx?.t ?? getDictionary();
  const l = t.landing;

  const steps = [
    { title: l.step1Title, body: l.step1Body, n: "01" },
    { title: l.step2Title, body: l.step2Body, n: "02" },
    { title: l.step3Title, body: l.step3Body, n: "03" },
  ];

  return (
    <main>
      <header className="wrap flex items-center justify-between py-6">
        <span className="font-[family-name:var(--font-display)] text-[var(--t-1)] font-medium">
          {t.brand.name}
        </span>
        <nav className="flex items-center gap-3">
          {ctx ? (
            <Link className="btn btn--ink btn--sm" href="/app">
              {t.nav.dashboard}
            </Link>
          ) : (
            <>
              <Link className="btn btn--ghost btn--sm" href="/login">
                {l.ctaSecondary}
              </Link>
              <Link className="btn btn--primary btn--sm" href="/register">
                {l.ctaPrimary}
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* P1 asymmetric split (7/5) */}
      <section className="wrap grid items-center gap-12 py-16 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-7">
          <span className="eyebrow mb-4">{l.eyebrow}</span>
          <h1 className="display-xl">{l.heroTitle}</h1>
          <p className="muted measure mt-6 text-balance">{l.heroBody}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="btn btn--primary"
              href="/register"
              data-ev="cta_register"
              data-ev-loc="hero"
            >
              {l.ctaPrimary}
            </Link>
            <Link
              className="btn btn--ghost"
              href="/login"
              data-ev="cta_login"
              data-ev-loc="hero"
            >
              {l.ctaSecondary}
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="card card--ink grain rounded-[var(--r-lg)] p-8">
            <span className="eyebrow mb-4 text-[color:var(--base)] opacity-70">
              {t.editor.preview}
            </span>
            <div
              className="mx-auto aspect-[85.6/54] w-full max-w-[360px] rounded-[var(--r-md)] bg-white p-5"
              style={{ boxShadow: "var(--shadow-2)" }}
            >
              <div className="flex h-full items-center gap-4">
                <div
                  aria-hidden
                  className="h-full aspect-square shrink-0 rounded-[var(--r-sm)]"
                  style={{
                    backgroundImage:
                      "repeating-conic-gradient(var(--ink) 0% 25%, #ffffff 0% 50%)",
                    backgroundSize: "14px 14px",
                  }}
                />
                <div className="min-w-0">
                  <p className="m-0 font-[family-name:var(--font-display)] text-[var(--t-1)] leading-tight text-[color:var(--ink)]">
                    {t.editor.ctaDefault}
                  </p>
                  <p className="meta m-0 mt-2">{t.editor.footerDefault}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* P3 staggered-weight grid */}
      <section className="wrap grid gap-6 pb-24 md:grid-cols-3">
        {steps.map((s, i) => (
          <article
            key={s.n}
            className={
              i === 1
                ? "card card--accent md:translate-y-6"
                : "card card--hair bg-[color:var(--surface)]"
            }
          >
            <span className="statement block text-[var(--t-4)] leading-none text-[color:var(--accent)]">
              {s.n}
            </span>
            <h3 className="display-md mt-4">{s.title}</h3>
            <p className="muted mt-3 mb-0 text-[var(--t--1)]">{s.body}</p>
          </article>
        ))}
      </section>

      <footer className="wrap border-t border-[color:var(--hairline)] py-8">
        <p className="meta m-0">
          {t.brand.name} · {t.brand.tagline}
        </p>
      </footer>
    </main>
  );
}
