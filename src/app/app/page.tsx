import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { formatNumber } from "@/lib/locale";
import { StatTile } from "@/components/StatTile";
import {
  countBusinesses,
  getScanStats,
  listCards,
} from "@/lib/queries";
import { buildShortUrl } from "@/lib/short-links";

export default async function DashboardPage() {
  const { t, tenant } = await requireTenant();
  const [cards, businessCount, stats] = await Promise.all([
    listCards(tenant.id),
    countBusinesses(tenant.id),
    getScanStats(tenant.id, tenant.locale),
  ]);

  const activeCards = cards.filter((c) => c.status === "active").length;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow mb-2">{tenant.name}</span>
          <h1 className="display-md">{t.dashboard.title}</h1>
          <p className="muted mt-2 mb-0 text-meta">
            {t.dashboard.subtitle}
          </p>
        </div>
        <Link href="/app/qr/new" className="btn btn--primary" data-ev="card_new" data-ev-loc="dashboard">
          {t.dashboard.newCard}
        </Link>
      </div>

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t.dashboard.totalScans}
          value={formatNumber(stats.total, tenant.locale)}
          variant="ink"
        />
        <StatTile
          label={t.dashboard.scansLast30}
          value={formatNumber(stats.last30, tenant.locale)}
          variant="accent"
        />
        <StatTile
          label={t.dashboard.activeCards}
          value={formatNumber(activeCards, tenant.locale)}
        />
        <StatTile
          label={t.dashboard.businessesCount}
          value={formatNumber(businessCount, tenant.locale)}
        />
      </section>

      {cards.length === 0 ? (
        <div className="panel p-10 text-center">
          <h2 className="display-md mb-3">{t.dashboard.noCards}</h2>
          <p className="muted mx-auto mb-6">{t.dashboard.noCardsHint}</p>
          <Link href="/app/qr/new" className="btn btn--primary">
            {t.dashboard.newCard}
          </Link>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[color:var(--hairline)]">
                <Th>{t.dashboard.cardColumnName}</Th>
                <Th>{t.dashboard.cardColumnBusiness}</Th>
                <Th>{t.dashboard.cardColumnScans}</Th>
                <Th>{t.dashboard.cardColumnStatus}</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr
                  key={card.id}
                  className="border-b border-[color:var(--hairline)] last:border-0"
                >
                  <Td>
                    <Link
                      href={`/app/qr/${card.id}`}
                      className="font-medium text-[color:var(--ink)] no-underline"
                    >
                      {card.name}
                    </Link>
                    <span className="meta block font-mono">
                      {buildShortUrl(card.slug)}
                    </span>
                  </Td>
                  <Td>{card.businessName}</Td>
                  <Td>{formatNumber(Number(card.scanCount), tenant.locale)}</Td>
                  <Td>
                    <span className="badge">{t.status[card.status]}</span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/app/qr/${card.id}`}
                        className="btn btn--ghost btn--sm"
                      >
                        {t.dashboard.openEditor}
                      </Link>
                      <Link
                        href={`/app/qr/${card.id}/stats`}
                        className="btn btn--ghost btn--sm"
                      >
                        {t.dashboard.viewStats}
                      </Link>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-meta font-medium tracking-[0.06em] text-[color:var(--ink-55)] uppercase">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-4 align-middle">{children}</td>;
}
