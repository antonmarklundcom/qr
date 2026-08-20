import Link from "next/link";
import { requireTenant, hasRole } from "@/lib/auth";
import { limitsFor } from "@/lib/plan";
import { countBusinesses, listBusinesses } from "@/lib/queries";
import { buildReviewDestination } from "@/lib/short-links";
import { BusinessForm } from "./BusinessForm";
import { createBusinessAction } from "./actions";

export default async function BusinessesPage() {
  const ctx = await requireTenant();
  const { t, tenant } = ctx;
  const [rows, count] = await Promise.all([
    listBusinesses(tenant.id),
    countBusinesses(tenant.id),
  ]);

  const limits = limitsFor(tenant.plan);
  const canCreate = hasRole(ctx, "admin") && count < limits.maxBusinesses;

  return (
    <>
      <div className="mb-8">
        <span className="eyebrow mb-2">{t.nav.businesses}</span>
        <h1 className="display-md">{t.businesses.title}</h1>
        <p className="muted mt-2 mb-0 text-meta">
          {t.businesses.subtitle}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7">
          {rows.length === 0 ? (
            <div className="card card--hair bg-[color:var(--surface)] p-8">
              <p className="muted m-0">{t.businesses.empty}</p>
            </div>
          ) : (
            <ul className="m-0 grid list-none gap-4 p-0">
              {rows.map((business) => {
                const destination = buildReviewDestination(business);
                return (
                  <li key={business.id} className="card card--raised p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] border border-[color:var(--hairline)]">
                          {business.logoDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={business.logoDataUrl}
                              alt=""
                              className="max-h-10 max-w-10 object-contain"
                            />
                          ) : (
                            <span className="meta">{t.common.none}</span>
                          )}
                        </div>
                        <div>
                          <h2 className="display-md text-title">
                            {business.name}
                          </h2>
                          <span className="meta">
                            {business.city ?? t.common.none}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/app/businesses/${business.id}`}
                        className="btn btn--ghost btn--sm"
                      >
                        {t.common.edit}
                      </Link>
                    </div>
                    {destination ? null : (
                      <p className="alert alert--error mt-4 mb-0">
                        {t.businesses.needsDestination}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="lg:col-span-5">
          <div className="panel p-6">
            <h2 className="display-md mb-4 text-title">
              {t.businesses.new}
            </h2>
            {canCreate ? (
              <BusinessForm
                action={createBusinessAction}
                t={t}
                submitLabel={t.common.create}
              />
            ) : (
              <p className="alert alert--info m-0">
                {hasRole(ctx, "admin")
                  ? t.plan.freeLimitBusinesses
                  : t.auth.forbidden}
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
