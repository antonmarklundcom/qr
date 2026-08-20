# QR Review Cards — v1 Plan

**Status:** Draft for review — no application code exists yet, this repo is empty apart from `.gitignore`.
**Product:** SaaS for local businesses: a styled QR code that routes customers to leave a Google review, printed as a card/sticker. Tripwire into a larger review/reputation offering (minarecensioner / resenas.com.py family).

---

## 1. Stack & repo conventions (per stack skills, not reinvented)

Follows `nodejs-mysql-hostinger-stack` + `nextjs-deploy-hostinger` + `zero-runner-deploy`:

- **Next.js 15 (App Router, TypeScript, Tailwind)** + **Drizzle ORM** + **Hostinger MySQL** (`mysql2` pool, `connectionLimit: 8`, `timezone: "Z"`), `tsx` for one-off scripts.
- Deploy via hPanel → Node.js App → Import Git Repository (webhook build). **No `.github/workflows/` files, ever** — quality gate is a husky pre-push hook (`typecheck && build`), plus the pre-commit hook that blocks workflow files.
- One Hostinger Node slot for this app. DB init/seeds run from a local machine against Remote MySQL (the tsx-doesn't-load-.env and password-change gotchas from the deploy skill apply).
- Auth: hand-rolled sessions (`iron-session` + `users` table + `bcrypt`) — no social login in v1. `role` enum on users from day one.
- `.env.example` committed listing `DATABASE_URL`, `SESSION_SECRET`, `APP_URL` (needed for building absolute short-link URLs), with source comments.

## 2. QR styling approach

**Recommendation: [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling) (MIT), rendered fully client-side.**

Why it wins over the alternatives:

| Option | Verdict |
|---|---|
| `qr-code-styling` | ✅ Exactly the feature set in scope: dot styles (dots/rounded/classy/square), corner-square + corner-dot styles, solid/gradient colors, embedded center logo with excavation, exports to SVG/PNG/canvas. Actively maintained, no server dependency. |
| `qrcode` (node-qrcode) | Only plain QR — we'd hand-build all styling on top. No. |
| `react-qrcode-logo`, `qrcode.react` | Logo support but far fewer styling options; less print-export control. No. |
| Server-side rendering (node-canvas/sharp on Hostinger) | Native deps are fragile on Hostinger managed Node and burn slot CPU. Avoid for v1. |

**Integration pattern:**

- A client component `QrEditor` wraps a single `QRCodeStyling` instance; every control change calls `.update(options)` against a mounted `<div>` — that IS the live preview, no extra work.
- The style options object (dots, corners, colors, logo ref, frame config) is stored **as JSON in the DB** (`qr_codes.style` JSON column). The library's options object is already serializable, so save/load is trivial and future style features don't need migrations.
- **The frame + CTA text is ours, not the library's.** `qr-code-styling` renders only the code itself. The frame (border, background, CTA like "Califícanos en Google" / "Betygsätt oss på Google", business name) is an SVG/DOM template we compose around the QR — this is also what makes print export work (see §6).
- Logo upload: stored on disk under an app-owned uploads dir (or as base64 in the DB if small — decision point, see §9). Rendered into the QR via the library's `image` option with `imageOptions.excavate`.
- QR error correction fixed at **H (30%)** when a logo is embedded, **Q** otherwise — encoded content is a short URL so capacity is never a concern.

## 3. Dynamic short links

- The QR **always** encodes `https://<domain>/r/<slug>` — never the Google URL directly. Path-based, no subdomains (no wildcard SSL confirmed on Hostinger — matches the locked scope).
- `slug`: 6–8 char lowercase base36/nanoid, unique index, generated server-side with collision retry. Human-opaque is fine; short matters (smaller QR = better scan reliability at print size).
- Destination is editable at any time in the editor; the printed card never changes.
- Google review deeplink helper: store the business's Google **Place ID** and build `https://search.google.com/local/writereview?placeid=<id>` — more stable than pasting raw maps URLs, but also allow a raw URL fallback for businesses that only have a link.

## 4. Drizzle schema sketch

`tenant_id` on every table from day one (multi-tenant SaaS rule from the business-apps skills). One MySQL DB, row-level isolation via a server-side helper — never client-supplied tenant ids.

```ts
// tenants — the paying account (an agency or the business itself)
tenants: {
  id: bigint pk autoincrement,
  name: varchar(160),
  plan: mysqlEnum('free' | 'paid'),            // tripwire → upsell flag
  locale: mysqlEnum('es-PY' | 'sv-SE'),        // UI + default CTA language
  createdAt, updatedAt
}

// users — login identities, scoped to a tenant
users: {
  id: bigint pk,
  tenantId: bigint fk → tenants.id,
  email: varchar(190) unique,
  passwordHash: varchar(120),
  role: mysqlEnum('owner' | 'admin' | 'member'),   // enum from day one
  createdAt
}

// businesses — the physical business a card belongs to.
// Separate from tenants so one account (e.g. an agency) can manage many locations.
businesses: {
  id: bigint pk,
  tenantId: bigint fk,
  name: varchar(190),
  googlePlaceId: varchar(120) nullable,
  googleReviewUrl: varchar(500) nullable,      // raw-URL fallback
  logoPath: varchar(255) nullable,
  createdAt, updatedAt
}

// qr_codes — one styled card design
qr_codes: {
  id: bigint pk,
  tenantId: bigint fk,
  businessId: bigint fk,
  name: varchar(160),                          // "Mostrador", "Bordskort kassan"
  style: json,                                 // qr-code-styling options + frame config + CTA text
  shortLinkId: bigint fk → short_links.id,     // 1:1 in v1, FK kept separate for reuse
  status: mysqlEnum('draft' | 'active' | 'archived'),
  createdAt, updatedAt
}

// short_links — the /r/[slug] redirect target
short_links: {
  id: bigint pk,
  tenantId: bigint fk,
  slug: varchar(16) unique index,
  destinationUrl: varchar(700),                // today: the Google review URL
  mode: mysqlEnum('direct' | 'rating_gate'),   // 'rating_gate' reserved for v1.1 (§5)
  active: boolean default true,
  createdAt, updatedAt
}

// scans — append-only analytics
scans: {
  id: bigint pk,
  shortLinkId: bigint fk (indexed),
  tenantId: bigint fk,                         // denormalized for cheap per-tenant dashboards
  scannedAt: timestamp (indexed),
  deviceType: mysqlEnum('mobile' | 'tablet' | 'desktop' | 'unknown'),  // parsed from UA, coarse only
  uaHash: varchar(64) nullable,                // hashed UA for rough uniques; no IP stored (GDPR, §7)
  referrer: varchar(255) nullable              // almost always empty on camera scans; capture since it's free
}
```

v1.1 added one more table, exactly as §5 anticipated — no change to any of the above:

```ts
// feedback — private messages left on the rating-gate interstitial
feedback: {
  id: bigint pk,
  tenantId: bigint fk,
  shortLinkId: bigint fk (indexed),
  businessId: bigint fk nullable,               // denormalized: survives its card being deleted
  rating: tinyint nullable,                     // 1-5, null when no star was picked
  message: text,
  contact: varchar(190) nullable,               // whatever the visitor chose to leave
  status: mysqlEnum('new' | 'read' | 'archived'),
  createdAt: timestamp (indexed with tenantId)
}
```

Relations: tenant 1—n users, 1—n businesses; business 1—n qr_codes; qr_code 1—1 short_link (v1); short_link 1—n scans, 1—n feedback. Timestamps stored UTC; displayed in `America/Asuncion` / `Europe/Stockholm` per tenant locale.

## 5. Star-rating routing → deferred to v1.1, **now built** (compliant variant) ✅

> **Decision taken:** §9.2 was answered in favour of the compliant variant. `/r/[slug]`
> renders the interstitial when `short_links.mode = 'rating_gate'`; the rating is
> informational and both the Google review link and the private-feedback form are shown
> to every visitor, whatever they tapped. `npm run check:gate` fails the pre-push hook
> if the Google link ever stops rendering in any locale or in the post-submit state.
> Shipped with it: the `feedback` table, `POST /r/[slug]/feedback` with signed-token +
> honeypot + rate-limit spam protection, and the `/app/feedback` inbox. As planned, this
> needed no schema migration on `short_links` and no reprints.

The original analysis follows.

### Original assessment

Flagging this per the brief rather than building it silently. Two reasons:

1. **Real scope:** it turns `/r/[slug]` from a 302 redirect into a rendered interstitial page (star widget, mobile-polished, per-tenant branding + language), plus a `feedback` table, a private feedback form with spam protection, and a feedback inbox view in the dashboard. That's roughly a third again of v1's surface area.
2. **Compliance risk you should decide on:** selectively steering only happy customers to Google ("review gating") **violates Google's review policies** and is explicitly prohibited by FTC rules in the US; Google has taken action against review-funnel tools for it. A compliant variant shows both options to everyone regardless of stars (rating is informational, both "review us on Google" and "send private feedback" always visible). This changes the feature's design, so it's worth deciding deliberately, not mid-implementation.

**What v1 does to keep the door open:** the `mode` column on `short_links` and the interstitial-capable route structure already exist, so v1.1 is additive — no schema migration, no reprints.

## 6. Print-ready export

**Recommendation: fully client-side export** — zero server load, no native deps on Hostinger:

- The editor composes the card as **SVG**: frame template + CTA text + the QR (via `qr-code-styling`'s `getRawData("svg")`) — vector end to end.
- **PDF:** `pdf-lib` (pure JS) in the browser — embed the card at exact physical size with **3 mm bleed** and **4 mm safe margin** guides on a standard preset (default **85.6 × 54 mm** credit-card size for lamination; plus A6 table-tent as a second preset). Crop marks optional toggle.
- **PNG:** render the same SVG to a canvas at **300 DPI** minimum for the chosen physical size (e.g. ~1063×673 px for card size + bleed) and download.
- Print sizes/presets are config data, not hardcoded — adding A5/sticker sizes later is a JSON entry.
- Fallback if client-side PDF quality disappoints in testing: a server export route using `@react-pdf/renderer` (pure JS, no native deps) — noted as plan B, not built up front.

## 7. Routes

```
/                      → marketing/landing page (later; placeholder in v1)
/login, /register      → auth (iron-session)

/app                   → dashboard: list of QR cards + headline scan stats
/app/businesses        → CRUD for businesses (name, Place ID, logo)
/app/qr/new            → create card (pick business → editor)
/app/qr/[id]           → editor: live preview, style controls, destination URL,
                         export buttons (PDF/PNG, client-side per §6)
/app/qr/[id]/stats     → analytics: scans over time (day buckets), device split, totals

/r/[slug]              → PUBLIC redirect handler (the only latency-critical route):
                         1. lookup slug (indexed) → 302 to destinationUrl
                         2. fire-and-forget scan insert (after redirect decision,
                            not awaited in the response path)
                         3. inactive/unknown slug → branded 404 ("this code is inactive")
                         v1.1: mode === 'rating_gate' renders interstitial instead of 302

/api/... (route handlers)
  POST /api/qr, PATCH /api/qr/[id]      → save design/destination (server-side tenant check)
  POST /api/upload/logo                 → logo upload
```

Analytics view stays deliberately simple in v1: total scans, scans/day chart (last 30 days), device split. All computable with two indexed GROUP BY queries on `scans` — no aggregation tables until volume demands it.

## 8. Multi-tenant / auth / SaaS considerations

- **Isolation:** every query goes through a `requireTenant(session)` helper; mutating routes additionally `requireRole`. Ownership checks server-side on every `[id]` route (fetch by `id AND tenantId`, 404 on miss — never trust the URL).
- **Roles:** `owner` (billing, delete), `admin` (manage everything), `member` (edit cards, view stats). Overkill for a solo café, cheap to have from day one — and it's what makes the **agency reseller** case (one tenant, many businesses) work, which is likely how this actually gets sold.
- **Public vs private surface:** `/r/[slug]` is unauthenticated and must never leak tenant data; everything under `/app` is session-gated via middleware.
- **Tripwire → upsell:** `tenants.plan` gates limits (e.g. free = 1 business/1 card with watermarked export; paid = unlimited + clean export). Enforce limits server-side at create time. No payment integration in v1 — plan flag flipped manually after a transferencia/Swish, per market norms.
- **GDPR (matters for the Swedish market, good hygiene for PY):** scans store **no IP and no precise geo** — coarse device type + hashed UA only. Feedback form (v1.1) will collect personal data → needs purpose text + retention; noted for that phase.
- **Locale:** UI strings behind a minimal dictionary keyed by tenant locale (es-PY voseo / sv-SE du-form) — even if v1 ships one market first, hardcoded Spanish strings are the expensive mistake.

## 9. Open questions — need your decision before implementation

1. **Market order & domain(s).** Is v1 Paraguay-first (resenas.com.py), Sweden-first (minarecensioner), or one codebase deployed twice? My recommendation: **one codebase, locale per tenant, deploy to one domain first** (whichever market you're selling in next). This affects the `/r/` URL printed on physical cards, so it's the one thing that can't change later per card. Which domain does v1 ship on?
2. ~~**Star-rating routing:** confirm **defer to v1.1** (§5), and — separately — whether v1.1 should be the compliant "both options always visible" variant or classic gating. My recommendation: compliant variant; the gating version is a liability for a product you're attaching your reputation brand to.~~ **Decided: compliant variant, built in v1.1 — see §5.**
3. **Logo storage:** files on disk under the app (survives redeploys only if the uploads dir is outside the build output — needs a quick verification on Hostinger's Git-deploy behavior) **vs** base64 in the DB (~50–200 KB per logo, dead simple, no filesystem risk). My recommendation for v1: **DB base64 with a 300 KB cap**, migrate to disk/object storage if it ever hurts. OK?
4. **Free tier shape:** does the tripwire have a free tier at all, or is it paid-only with a demo? Affects `plan` gating and the register flow, nothing structural.
5. **Scan uniqueness:** v1 counts raw scans only. Is a rough "unique scans" number (via UA-hash + day bucket) wanted in v1, or fine as a later refinement? (It's cheap but imprecise; I'd skip it and label the metric honestly as "scans".)

## 10. Explicitly out of scope (locked)

- Linktree-style multi-block bio pages
- Per-user subdomains (path-based `/r/[slug]` only — no confirmed wildcard-subdomain SSL on Hostinger)
- NFC tag writing/hardware
- Payment provider integration (manual plan flag in v1)
- SIFEN/e-invoicing or any invoicing features (separate product)

## 11. Scaffolding notes (for the implementation PR, not this one)

- `create-next-app` (App Router, TS, Tailwind) → delete any generated `.github/workflows/` before first commit → husky pre-commit (workflow blocker) + pre-push (`typecheck && build`).
- Drizzle config + `src/db/{index,schema}.ts` per the stack skill; `scripts/seed-demo.ts` creating a demo tenant with one business + one styled card (realistic PY or SE data per §9 Q1).
- Record which Hostinger account/slot this app takes when it first deploys.
