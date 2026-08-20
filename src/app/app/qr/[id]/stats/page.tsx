import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getCardDetail, getFeedbackStats, getScanStats } from "@/lib/queries";
import { formatNumber } from "@/lib/locale";
import { StatTile } from "@/components/StatTile";
import { ScansChart } from "@/components/ScansChart";
import { DeviceSplit } from "@/components/DeviceSplit";
import { buildShortUrl } from "@/lib/short-links";

export default async function CardStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, tenant } = await requireTenant();
  const detail = await getCardDetail(tenant.id, Number((await params).id));
  if (!detail) notFound();

  const isGate = detail.shortLink.mode === "rating_gate";
  const [stats, feedbackStats] = await Promise.all([
    getScanStats(tenant.id, tenant.locale, detail.shortLink.id),
    // A 'direct' card has no form to leave a message on, so this block is hidden
    // rather than shown as a row of zeros.
    isGate ? getFeedbackStats(tenant.id, detail.shortLink.id) : null,
  ]);

  const responseRate =
    feedbackStats && stats.total > 0
      ? Math.round((feedbackStats.total / stats.total) * 100)
      : null;
  const maxRatingCount = feedbackStats
    ? Math.max(1, ...feedbackStats.distribution.map((d) => d.count))
    : 1;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow mb-2">{detail.business.name}</span>
          <h1 className="display-md">{t.stats.title}</h1>
          <p className="muted mt-2 mb-0 text-meta">{t.stats.subtitle}</p>
          <span className="meta font-mono">
            {buildShortUrl(detail.shortLink.slug)}
          </span>
        </div>
        <Link href={`/app/qr/${detail.card.id}`} className="btn btn--ghost btn--sm">
          {t.dashboard.openEditor}
        </Link>
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t.stats.total}
          value={formatNumber(stats.total, tenant.locale)}
          variant="ink"
        />
        <StatTile
          label={t.stats.last30}
          value={formatNumber(stats.last30, tenant.locale)}
          variant="accent"
        />
        <StatTile
          label={t.stats.last7}
          value={formatNumber(stats.last7, tenant.locale)}
        />
        <StatTile
          label={t.stats.today}
          value={formatNumber(stats.today, tenant.locale)}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="panel p-6 lg:col-span-8">
          <ScansChart
            data={stats.perDay}
            label={t.stats.perDay}
            emptyLabel={t.stats.noScans}
          />
        </div>
        <div className="panel p-6 lg:col-span-4">
          <span className="meta mb-4 block">{t.stats.devices}</span>
          <DeviceSplit devices={stats.devices} t={t} emptyLabel={t.stats.noScans} />
        </div>
      </div>

      {feedbackStats ? (
        <section className="panel mt-8 p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="display-md m-0 text-title">{t.stats.feedbackTitle}</h2>
            <Link href="/app/feedback" className="btn btn--ghost btn--sm">
              {t.stats.openInbox}
            </Link>
          </div>

          {feedbackStats.total === 0 ? (
            <p className="muted m-0">{t.stats.noFeedback}</p>
          ) : (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  label={t.stats.feedbackTotal}
                  value={formatNumber(feedbackStats.total, tenant.locale)}
                  variant="ink"
                />
                <StatTile
                  label={t.stats.avgRating}
                  value={
                    feedbackStats.average === null
                      ? t.common.none
                      : feedbackStats.average.toFixed(1)
                  }
                  variant="accent"
                />
                <StatTile
                  label={t.stats.ratedCount}
                  value={formatNumber(feedbackStats.rated, tenant.locale)}
                />
                <StatTile
                  label={t.stats.responseRate}
                  value={responseRate === null ? t.common.none : `${responseRate}%`}
                />
              </div>

              <span className="meta mb-3 block">{t.stats.ratingBreakdown}</span>
              <ul className="m-0 grid list-none gap-2 p-0">
                {feedbackStats.distribution.map((row) => (
                  <li key={row.rating} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 font-mono text-meta">
                      {"★".repeat(row.rating)}
                    </span>
                    <span
                      className="h-2 rounded-full bg-[color:var(--accent)]"
                      style={{
                        width: `${Math.round((row.count / maxRatingCount) * 100)}%`,
                        minWidth: row.count > 0 ? "8px" : "0",
                      }}
                      aria-hidden="true"
                    />
                    <span className="meta">
                      {formatNumber(row.count, tenant.locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ) : null}

      <p className="hint mt-6">{t.stats.rawCountNote}</p>
    </>
  );
}
