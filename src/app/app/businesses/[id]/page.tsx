import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant, hasRole } from "@/lib/auth";
import { countCardsForBusiness, getBusiness } from "@/lib/queries";
import { BusinessForm } from "../BusinessForm";
import { deleteBusinessAction, updateBusinessAction } from "../actions";
import { LogoUploader } from "@/components/LogoUploader";

export default async function EditBusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  const { t, tenant } = ctx;
  const business = await getBusiness(tenant.id, Number((await params).id));
  if (!business) notFound();

  const cardCount = await countCardsForBusiness(tenant.id, business.id);
  const canDelete = hasRole(ctx, "owner") && cardCount === 0;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow mb-2">{t.businesses.edit}</span>
          <h1 className="display-md">{business.name}</h1>
        </div>
        <Link href="/app/businesses" className="btn btn--ghost btn--sm">
          {t.common.back}
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-7">
          {hasRole(ctx, "admin") ? (
            <BusinessForm
              action={updateBusinessAction}
              t={t}
              business={business}
              submitLabel={t.common.save}
            />
          ) : (
            <p className="alert alert--info m-0">{t.auth.forbidden}</p>
          )}
        </section>

        <section className="lg:col-span-5">
          <div className="panel mb-6 p-6">
            <LogoUploader
              businessId={business.id}
              initialLogo={business.logoDataUrl}
              t={t}
            />
          </div>

          <div className="card card--hair bg-[color:var(--surface)] p-6">
            <span className="meta block">{t.nav.cards}</span>
            <span className="mt-1 block font-[family-name:var(--font-display)] text-headline leading-none">
              {cardCount}
            </span>
            {canDelete ? (
              <form action={deleteBusinessAction} className="mt-5">
                <input type="hidden" name="id" value={business.id} />
                <button type="submit" className="btn btn--danger btn--sm">
                  {t.common.delete}
                </button>
              </form>
            ) : cardCount > 0 ? (
              <p className="hint mt-4 mb-0">{t.businesses.deleteBlocked}</p>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
