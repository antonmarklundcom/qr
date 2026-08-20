import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant, hasRole } from "@/lib/auth";
import { getCardDetail } from "@/lib/queries";
import { parseCardStyle } from "@/lib/card-style";
import { buildShortUrl } from "@/lib/short-links";
import { QrEditor } from "../QrEditor";

export default async function CardEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenant();
  const { t, tenant } = ctx;
  const detail = await getCardDetail(tenant.id, Number((await params).id));
  if (!detail) notFound();

  const { card, business, shortLink } = detail;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow mb-2">{business.name}</span>
          <h1 className="display-md">{card.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/qr/${card.id}/stats`} className="btn btn--ghost btn--sm">
            {t.dashboard.viewStats}
          </Link>
          <Link href="/app" className="btn btn--ghost btn--sm">
            {t.common.back}
          </Link>
        </div>
      </div>

      <QrEditor
        t={t}
        plan={tenant.plan}
        canEdit={hasRole(ctx, "member")}
        card={{
          id: card.id,
          name: card.name,
          status: card.status,
          // Re-validated on read: a style written by an older build still loads.
          style: parseCardStyle(card.style, tenant.locale),
        }}
        business={{
          id: business.id,
          name: business.name,
          logoDataUrl: business.logoDataUrl,
        }}
        shortLink={{
          slug: shortLink.slug,
          destinationUrl: shortLink.destinationUrl,
          active: shortLink.active,
        }}
        shortUrl={buildShortUrl(shortLink.slug)}
      />
    </>
  );
}
