import type { Dictionary } from "@/lib/locale";
import { HONEYPOT_FIELD } from "@/lib/form-fields";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Only ever emit a destination we would have redirected to. */
function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : "#";
}

export type GateError = "empty" | "too_fast" | "expired" | "rate_limited";

export interface GatePageInput {
  t: Dictionary;
  slug: string;
  businessName: string | null;
  destinationUrl: string;
  formToken: string;
  /** Renders the thank-you state instead of the form after a successful post. */
  sent?: boolean;
  error?: GateError | null;
}

const STYLES = `
:root{--base:#f4f4fb;--ink:#171628;--accent:#4b3fd1;--surface:#fff;--star:#f5a524}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;
  background:var(--base);color:var(--ink);
  font:17px/1.6 "Inter Tight",system-ui,-apple-system,sans-serif}
.panel{max-width:440px;width:100%;background:var(--surface);border-radius:28px;
  padding:36px 28px 32px;text-align:center;
  box-shadow:0 1px 2px rgb(23 22 40/.04),0 16px 40px rgb(23 22 40/.10)}
.eyebrow{font-size:13px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--accent);font-weight:500;margin:0 0 14px}
h1{font-size:27px;line-height:1.15;letter-spacing:-.03em;font-weight:600;margin:0 0 10px}
.sub{margin:0 0 24px;color:color-mix(in srgb,var(--ink) 70%,transparent);font-size:15px}
.rating-label{display:block;font-size:13px;font-weight:500;
  color:color-mix(in srgb,var(--ink) 60%,transparent);margin:0 0 8px}
.stars{display:flex;flex-direction:row-reverse;justify-content:center;gap:2px;margin:0 0 26px}
.stars input{position:absolute;opacity:0;width:1px;height:1px}
.stars label{cursor:pointer;font-size:38px;line-height:1;padding:2px 3px;
  color:color-mix(in srgb,var(--ink) 18%,transparent);transition:color .12s ease}
.stars label:hover,.stars label:hover ~ label,
.stars input:checked ~ label{color:var(--star)}
.stars input:focus-visible + label{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
.btn{display:block;width:100%;border:0;border-radius:999px;padding:16px 20px;
  font:inherit;font-weight:600;font-size:16px;cursor:pointer;text-decoration:none;
  text-align:center;transition:transform .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(1px)}
.btn--primary{background:var(--accent);color:#fff;
  box-shadow:0 8px 20px color-mix(in srgb,var(--accent) 28%,transparent)}
.btn--ghost{background:color-mix(in srgb,var(--ink) 5%,transparent);color:var(--ink)}
.hint{margin:8px 0 0;font-size:13px;
  color:color-mix(in srgb,var(--ink) 55%,transparent)}
.or{margin:22px 0 12px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;
  color:color-mix(in srgb,var(--ink) 40%,transparent)}
details{text-align:left}
details summary{list-style:none;cursor:pointer}
details summary::-webkit-details-marker{display:none}
details[open] summary{margin-bottom:16px}
.field{display:block;margin:0 0 14px;text-align:left}
.field span{display:block;font-size:13px;font-weight:500;margin:0 0 6px}
textarea,input[type=text],input[type=email]{width:100%;font:inherit;font-size:16px;
  border:1px solid color-mix(in srgb,var(--ink) 14%,transparent);border-radius:16px;
  padding:12px 14px;background:var(--base);color:var(--ink);resize:vertical}
textarea:focus,input:focus{outline:2px solid var(--accent);outline-offset:1px}
.trap{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.alert{margin:0 0 16px;padding:12px 14px;border-radius:14px;font-size:14px;text-align:left;
  background:#fdecec;color:#8c1d1d}
.privacy{margin:18px 0 0;font-size:12px;line-height:1.5;
  color:color-mix(in srgb,var(--ink) 50%,transparent);text-align:left}
.brand{margin:26px 0 0;font-size:13px;
  color:color-mix(in srgb,var(--ink) 55%,transparent)}
`;

function starsMarkup(t: Dictionary): string {
  // Rendered 5 → 1 and flipped with row-reverse so `input:checked ~ label` can fill
  // every star below the chosen one with no JavaScript on the page.
  const values = [5, 4, 3, 2, 1] as const;
  return values
    .map((value) => {
      const label = t.gate.stars[String(value) as "1"];
      return `<input type="radio" id="star-${value}" name="rating" value="${value}">
<label for="star-${value}" title="${escapeHtml(label)}"><span class="trap">${escapeHtml(
        label,
      )}</span>★</label>`;
    })
    .join("\n");
}

/**
 * The compliant rating gate (plan §5): the stars are informational and BOTH routes —
 * the public Google review and the private message — are on screen for every visitor,
 * whatever they tapped. Nothing here is revealed or hidden based on the rating.
 *
 * Built as a string for the same reason as the inactive page: /r/<slug> stays one
 * route, one request, no client bundle. It also means the whole form works with
 * JavaScript disabled.
 */
export function renderGateHtml({
  t,
  slug,
  businessName,
  destinationUrl,
  formToken,
  sent = false,
  error = null,
}: GatePageInput): string {
  const eyebrow = businessName || t.brand.name;
  const errorText = error
    ? {
        empty: t.gate.errorEmpty,
        too_fast: t.gate.errorTooFast,
        expired: t.gate.errorExpired,
        rate_limited: t.gate.errorRateLimited,
      }[error]
    : null;

  const body = sent
    ? `<h1>${escapeHtml(t.gate.thanksTitle)}</h1>
<p class="sub">${escapeHtml(t.gate.thanksBody)}</p>
<a class="btn btn--primary" href="${safeHref(destinationUrl)}" rel="noopener nofollow">${escapeHtml(
        t.gate.googleCta,
      )}</a>
<p class="hint">${escapeHtml(t.gate.thanksGoogle)}</p>`
    : `<h1>${escapeHtml(t.gate.title)}</h1>
<p class="sub">${escapeHtml(t.gate.subtitle)}</p>
${errorText ? `<p class="alert">${escapeHtml(errorText)}</p>` : ""}
<form method="post" action="/r/${encodeURIComponent(slug)}/feedback">
  <span class="rating-label">${escapeHtml(t.gate.ratingLabel)} · ${escapeHtml(
    t.gate.ratingOptional,
  )}</span>
  <div class="stars">
${starsMarkup(t)}
  </div>

  <a class="btn btn--primary" href="${safeHref(destinationUrl)}" rel="noopener nofollow"
     data-ev="gate_google">${escapeHtml(t.gate.googleCta)}</a>
  <p class="hint">${escapeHtml(t.gate.googleHint)}</p>

  <p class="or">${escapeHtml(t.common.or)}</p>

  <details>
    <summary class="btn btn--ghost">${escapeHtml(t.gate.privateCta)}</summary>
    <label class="field">
      <span>${escapeHtml(t.gate.messageLabel)}</span>
      <textarea name="message" rows="4" maxlength="2000" required
        placeholder="${escapeHtml(t.gate.messagePlaceholder)}"></textarea>
    </label>
    <label class="field">
      <span>${escapeHtml(t.gate.contactLabel)} · ${escapeHtml(t.common.optional)}</span>
      <input type="text" name="contact" maxlength="190" autocomplete="email">
    </label>
    <div class="trap" aria-hidden="true">
      <label>${escapeHtml(t.businesses.name)}
        <input type="text" name="${HONEYPOT_FIELD}" tabindex="-1" autocomplete="off">
      </label>
    </div>
    <input type="hidden" name="token" value="${escapeHtml(formToken)}">
    <button type="submit" class="btn btn--primary" data-ev="gate_feedback">${escapeHtml(
      t.gate.send,
    )}</button>
    <p class="hint">${escapeHtml(t.gate.privateHint)}</p>
    <p class="privacy">${escapeHtml(t.gate.privacy)}</p>
  </details>
</form>`;

  return `<!doctype html>
<html lang="${escapeHtml(t.meta.localeTag)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(eyebrow)} · ${escapeHtml(t.brand.name)}</title>
<style>${STYLES}</style>
</head>
<body>
<main class="panel">
<p class="eyebrow">${escapeHtml(eyebrow)}</p>
${body}
<p class="brand">${escapeHtml(t.brand.name)}</p>
</main>
</body>
</html>`;
}
