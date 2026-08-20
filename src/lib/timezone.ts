/**
 * Current UTC offset of a timezone, in minutes. Used to bucket scans into local days
 * without depending on MySQL's timezone tables being loaded (they often are not on
 * shared hosting, which makes CONVERT_TZ silently return NULL).
 *
 * The offset is sampled once per query, so a 30-day window that straddles a DST switch
 * can put a single scan in the neighbouring day. Paraguay has had no DST since 2024;
 * for Europe/Stockholm the error is at most one hour, twice a year.
 */
export function timezoneOffsetMinutes(timeZone: string, at = new Date()): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(at).map((p) => [p.type, p.value]),
  ) as Record<string, string>;

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}
