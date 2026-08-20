import type { Dictionary } from "@/lib/locale";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Built as a string rather than a React page so the whole /r/<slug> path stays one
 * request handled by one route file — no client bundle, no extra round trip, and the
 * response can carry a real 404 status.
 */
export function renderInactiveHtml({
  t,
  variant,
  businessName,
}: {
  t: Dictionary;
  variant: "inactive" | "unknown";
  businessName?: string | null;
}): string {
  const title =
    variant === "inactive" ? t.redirect.inactiveTitle : t.redirect.unknownTitle;
  const body =
    variant === "inactive" ? t.redirect.inactiveBody : t.redirect.unknownBody;
  const eyebrow = businessName || t.brand.name;

  return `<!doctype html>
<html lang="${escapeHtml(t.meta.localeTag)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · ${escapeHtml(t.brand.name)}</title>
<style>
:root{--base:#f4f4fb;--ink:#171628;--accent:#4b3fd1;--surface:#fff}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;
  background:var(--base);color:var(--ink);
  font:17px/1.6 "Inter Tight",system-ui,-apple-system,sans-serif}
.panel{max-width:420px;width:100%;background:var(--surface);border-radius:28px;
  padding:40px 32px;text-align:center;
  box-shadow:0 1px 2px rgb(23 22 40/.04),0 16px 40px rgb(23 22 40/.10)}
.eyebrow{font-size:13px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--accent);font-weight:500;margin:0 0 16px}
h1{font-size:28px;line-height:1.15;letter-spacing:-.03em;font-weight:600;margin:0 0 12px}
p{margin:0;color:color-mix(in srgb,var(--ink) 70%,transparent)}
.brand{margin-top:28px;font-size:13px;color:color-mix(in srgb,var(--ink) 55%,transparent)}
</style>
</head>
<body>
<main class="panel">
<p class="eyebrow">${escapeHtml(eyebrow)}</p>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(body)}</p>
<p class="brand">${escapeHtml(t.brand.name)}</p>
</main>
</body>
</html>`;
}
