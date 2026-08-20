import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { countCards, listBusinesses } from "@/lib/queries";
import { limitsFor } from "@/lib/plan";
import { buildReviewDestination } from "@/lib/short-links";
import { NewCardForm } from "./NewCardForm";

export default async function NewCardPage() {
  const { t, tenant } = await requireTenant();
  const [businesses, cardCount] = await Promise.all([
    listBusinesses(tenant.id),
    countCards(tenant.id),
  ]);
  const atLimit = cardCount >= limitsFor(tenant.plan).maxCards;

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="mb-8">
        <span className="eyebrow mb-2">{t.nav.cards}</span>
        <h1 className="display-md">{t.editor.newTitle}</h1>
      </div>

      <div className="panel p-6">
        {businesses.length === 0 ? (
          <>
            <p className="muted">{t.businesses.empty}</p>
            <Link href="/app/businesses" className="btn btn--primary">
              {t.businesses.new}
            </Link>
          </>
        ) : atLimit ? (
          <p className="alert alert--info m-0">{t.plan.freeLimitCards}</p>
        ) : (
          <NewCardForm
            t={t}
            businesses={businesses.map((business) => ({
              id: business.id,
              name: business.name,
              hasDestination: Boolean(buildReviewDestination(business)),
            }))}
          />
        )}
      </div>
    </div>
  );
}
