import type { DayBucket } from "@/lib/queries";

/**
 * Real data only — 30 day buckets, drawn as a plain SVG bar chart so the stats page
 * ships no chart library and no client JS.
 */
export function ScansChart({
  data,
  label,
  emptyLabel,
}: {
  data: DayBucket[];
  label: string;
  emptyLabel: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const width = 100;
  const height = 34;
  const gap = 0.6;
  const barWidth = (width - gap * (data.length - 1)) / data.length;

  return (
    <figure className="m-0">
      <figcaption className="meta mb-4">{label}</figcaption>
      {total === 0 ? (
        <p className="muted m-0 py-8 text-center text-meta">{emptyLabel}</p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={label}
          className="h-40 w-full"
        >
          {data.map((bucket, i) => {
            const barHeight = (bucket.count / max) * (height - 2);
            return (
              <rect
                key={bucket.day}
                x={i * (barWidth + gap)}
                y={height - barHeight}
                width={barWidth}
                height={Math.max(barHeight, bucket.count > 0 ? 0.6 : 0.15)}
                rx={0.4}
                fill={bucket.count > 0 ? "var(--accent)" : "var(--hairline-strong)"}
              >
                <title>{`${bucket.day}: ${bucket.count}`}</title>
              </rect>
            );
          })}
        </svg>
      )}
      <div className="meta mt-2 flex justify-between">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </figure>
  );
}
