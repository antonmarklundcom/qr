import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getCardDetail, getScanStats } from "@/lib/queries";
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

  const stats = await getScanStats(tenant.id, tenant.locale, detail.shortLink.id);

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

      <p className="hint mt-6">{t.stats.rawCountNote}</p>
    </>
  );
}
