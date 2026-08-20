export function StatTile({
  label,
  value,
  variant = "hair",
}: {
  label: string;
  value: string | number;
  variant?: "hair" | "accent" | "ink";
}) {
  const onInk = variant === "ink";
  const className =
    variant === "ink"
      ? "card card--ink grain"
      : variant === "accent"
        ? "card card--accent"
        : "card card--hair bg-[color:var(--surface)]";

  return (
    <div className={`${className} p-6`}>
      <span className={`meta block ${onInk ? "meta--on-ink" : ""}`}>{label}</span>
      <span className="mt-2 block font-[family-name:var(--font-display)] text-hero leading-none font-medium">
        {value}
      </span>
    </div>
  );
}
