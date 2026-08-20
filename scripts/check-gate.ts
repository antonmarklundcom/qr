/**
 * Guards the two properties of the rating-gate interstitial that are not allowed to
 * regress (plan §5):
 *
 *   1. compliance — the Google review link is on the page for EVERY visitor, in every
 *      locale and in the post-submit state. Hiding it behind a rating is exactly what
 *      makes a review funnel a Google policy violation.
 *   2. safety — the page is one hand-built HTML string on a public route, so business
 *      names must stay escaped and a non-http destination must never reach an href.
 *
 * Plus the anti-spam token maths, which is pure and cheap to check.
 *
 * Runs on `npm run check:gate` and in the husky pre-push hook. Needs no database.
 */
import { randomBytes } from "node:crypto";

let failures = 0;

function check(name: string, passed: boolean) {
  if (!passed) failures++;
  console.log(`${passed ? "ok  " : "FAIL"}  ${name}`);
}

async function main() {
  // The token helper reads it at call time; a throwaway value is enough here.
  process.env.SESSION_SECRET ??= randomBytes(32).toString("hex");

  const { renderGateHtml } = await import("../src/app/r/[slug]/gate-page");
  const { issueFormToken, verifyFormToken, rateLimitOk } = await import(
    "../src/lib/form-token"
  );
  const { getDictionary } = await import("../src/lib/locale");

  for (const locale of ["es-PY", "sv-SE"] as const) {
    const t = getDictionary(locale);
    const html = renderGateHtml({
      t,
      slug: "abc123",
      businessName: 'Café "El <b>Sol</b>" & Cía',
      destinationUrl: "https://search.google.com/local/writereview?placeid=X",
      formToken: issueFormToken("abc123"),
    });

    check(`${locale}: Google review link is shown`, html.includes(t.gate.googleCta));
    check(`${locale}: private feedback is shown`, html.includes(t.gate.privateCta));
    check(
      `${locale}: five rating options`,
      (html.match(/name="rating"/g) ?? []).length === 5,
    );
    check(`${locale}: honeypot field present`, html.includes('name="company"'));
    check(
      `${locale}: business name is escaped`,
      html.includes("&quot;El &lt;b&gt;Sol&lt;/b&gt;&quot; &amp; Cía") &&
        !html.includes("<b>Sol</b>"),
    );
    check(`${locale}: no script tag`, !/<script/i.test(html));
    check(`${locale}: privacy notice present`, html.includes(t.gate.privacy));
    check(
      `${locale}: form posts to the feedback route`,
      html.includes('action="/r/abc123/feedback"'),
    );
    check(`${locale}: page carries the locale tag`, html.includes(`lang="${t.meta.localeTag}"`));
  }

  const evil = renderGateHtml({
    t: getDictionary("es-PY"),
    slug: "s",
    businessName: null,
    destinationUrl: "javascript:alert(1)",
    formToken: issueFormToken("s"),
  });
  check(
    "a non-http destination never becomes an href",
    !evil.includes("javascript:") && evil.includes('href="#"'),
  );

  const thanks = renderGateHtml({
    t: getDictionary("es-PY"),
    slug: "s",
    businessName: null,
    destinationUrl: "https://x.test/review",
    formToken: issueFormToken("s"),
    sent: true,
  });
  check(
    "the thank-you state still offers Google",
    thanks.includes("https://x.test/review"),
  );

  const now = Date.now();
  const token = issueFormToken("abc123", now);
  check("a submit inside 2s is rejected", verifyFormToken("abc123", token, now + 500) === "too_fast");
  check("a human-paced submit is accepted", verifyFormToken("abc123", token, now + 5_000) === "ok");
  check("a stale token expires", verifyFormToken("abc123", token, now + 7 * 3_600_000) === "expired");
  check("a token from another slug is rejected", verifyFormToken("other", token, now + 5_000) === "invalid");
  check(
    "a tampered signature is rejected",
    verifyFormToken("abc123", `${token.slice(0, -1)}Z`, now + 5_000) === "invalid",
  );
  check("a missing token is rejected", verifyFormToken("abc123", null) === "invalid");

  let allowed = 0;
  for (let i = 0; i < 20; i++) if (rateLimitOk("check-gate")) allowed++;
  check("the hourly submit ceiling holds", allowed === 12);

  console.log(failures === 0 ? "\nAll gate checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
