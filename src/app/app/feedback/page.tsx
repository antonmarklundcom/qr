import Link from "next/link";
import { hasRole, requireTenant } from "@/lib/auth";
import { formatDateTime } from "@/lib/locale";
import { listFeedback } from "@/lib/queries";
import type { FeedbackStatus } from "@/db/schema";
import { deleteFeedbackAction, setFeedbackStatusAction } from "./actions";

const FILTERS = ["all", "new", "archived"] as const;
type Filter = (typeof FILTERS)[number];

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const ctx = await requireTenant();
  const { t, tenant } = ctx;
  const requested = (await searchParams).filter;
  const filter: Filter = FILTERS.includes(requested as Filter)
    ? (requested as Filter)
    : "all";

  const rows = await listFeedback(
    tenant.id,
    filter === "all" ? "all" : (filter as FeedbackStatus),
  );
  const canDelete = hasRole(ctx, "admin");

  const filterLabel: Record<Filter, string> = {
    all: t.feedback.filterAll,
    new: t.feedback.filterNew,
    archived: t.feedback.filterArchived,
  };

  return (
    <>
      <div className="mb-8">
        <span className="eyebrow mb-2">{t.nav.feedback}</span>
        <h1 className="display-md">{t.feedback.title}</h1>
        <p className="muted mt-2 mb-0 text-meta">{t.feedback.subtitle}</p>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <Link
            key={value}
            href={value === "all" ? "/app/feedback" : `/app/feedback?filter=${value}`}
            className={`btn btn--sm ${
              filter === value ? "btn--primary" : "btn--ghost"
            }`}
          >
            {filterLabel[value]}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="card card--hair bg-[color:var(--surface)] p-8">
          <p className="m-0">{t.feedback.empty}</p>
          <p className="muted mt-2 mb-0 text-meta">{t.feedback.emptyHint}</p>
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`card card--raised p-6 ${
                row.status === "new" ? "border-l-4 border-l-[color:var(--accent)]" : ""
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="badge badge--accent" aria-label={t.feedback.rating}>
                  {row.rating
                    ? "★".repeat(row.rating) + "☆".repeat(5 - row.rating)
                    : t.feedback.noRating}
                </span>
                {row.status === "new" ? (
                  <span className="badge">{t.feedback.newCount}</span>
                ) : null}
                <span className="meta">
                  {formatDateTime(row.createdAt, tenant.locale)}
                </span>
                <span className="meta ml-auto">
                  {row.businessName ?? t.common.none}
                  {row.cardId ? (
                    <>
                      {" · "}
                      <Link href={`/app/qr/${row.cardId}`}>
                        {row.cardName ?? t.feedback.card}
                      </Link>
                    </>
                  ) : null}
                </span>
              </div>

              <p className="m-0 whitespace-pre-wrap">{row.message}</p>

              {row.contact ? (
                <p className="meta mt-3 mb-0">
                  {t.feedback.contact}: <strong>{row.contact}</strong>
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={setFeedbackStatusAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={row.status === "new" ? "read" : "new"}
                  />
                  <button type="submit" className="btn btn--ghost btn--sm">
                    {row.status === "new" ? t.feedback.markRead : t.feedback.markNew}
                  </button>
                </form>
                <form action={setFeedbackStatusAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={row.status === "archived" ? "read" : "archived"}
                  />
                  <button type="submit" className="btn btn--ghost btn--sm">
                    {row.status === "archived"
                      ? t.feedback.unarchive
                      : t.feedback.archive}
                  </button>
                </form>
                {canDelete ? (
                  <form action={deleteFeedbackAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button type="submit" className="btn btn--ghost btn--sm">
                      {t.feedback.delete}
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="muted mt-6 mb-0 text-meta">{t.feedback.retentionNote}</p>
    </>
  );
}
