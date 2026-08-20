import type { ScanStats } from "@/lib/queries";
import type { Dictionary } from "@/lib/locale";

export function DeviceSplit({
  devices,
  t,
  emptyLabel,
}: {
  devices: ScanStats["devices"];
  t: Dictionary;
  emptyLabel: string;
}) {
  const total = devices.reduce((sum, d) => sum + d.count, 0);
  const order = ["mobile", "tablet", "desktop", "unknown"] as const;
  const rows = order
    .map((key) => ({
      key,
      count: devices.find((d) => d.deviceType === key)?.count ?? 0,
    }))
    .filter((row) => row.count > 0);

  if (total === 0) {
    return <p className="muted m-0 py-8 text-center text-meta">{emptyLabel}</p>;
  }

  return (
    <ul className="m-0 grid list-none gap-4 p-0">
      {rows.map((row) => {
        const share = Math.round((row.count / total) * 100);
        return (
          <li key={row.key}>
            <div className="mb-1 flex justify-between text-meta">
              <span>{t.stats.device[row.key]}</span>
              <span className="meta">
                {row.count} · {share}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--hairline)]">
              <div
                className="h-full rounded-full bg-[color:var(--accent)]"
                style={{ width: `${share}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
