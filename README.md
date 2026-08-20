# Reseñas QR — QR review cards

SaaS for local businesses: design a styled QR card, print it, and let customers reach
your Google review page in two taps. The printed code never changes — it encodes a
short link whose destination you can edit at any time.

Implements [`docs/plans/qr-review-cards-v1.md`](docs/plans/qr-review-cards-v1.md).
Paraguay first (es-PY, `America/Asuncion`); the locale dictionary is already in place
for sv-SE.

## Stack

Next.js 16 (App Router, TypeScript, Tailwind v4) · Drizzle ORM · MySQL (`mysql2` pool,
`connectionLimit: 8`, `timezone: "Z"`) · iron-session + bcryptjs · qr-code-styling ·
pdf-lib · tsx for scripts.

## Local setup

```bash
npm install
cp .env.example .env      # then fill in the four values
npm run db:push           # create the schema
npm run seed:demo         # optional demo tenant
npm run dev
```

`tsx` does **not** auto-load `.env`, so scripts need the variable in the shell:

```bash
export DATABASE_URL="mysql://user:pass@host:3306/dbname"   # bash
$env:DATABASE_URL = "mysql://user:pass@host:3306/dbname"   # PowerShell
npm run seed:demo
```

The seed prints its login once. The password is random unless you set `DEMO_PASSWORD`,
so pointing the seed at a real database never plants a guessable owner account.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check:gate` | Compliance + escaping checks on the rating-gate page (no DB needed) |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply `src/db/schema.ts` to the database |
| `npm run db:generate` | Write a migration instead of pushing |
| `npm run seed:demo` | Idempotent Paraguayan demo tenant + 30 days of scans |
| `npm run set-plan` | Flip a tenant between `free` and `paid` (`--list`, `--tenant`/`--email`, `--plan`) |
| `npm run manage-user` | Add a user to an existing tenant, change a role, reset a password |

## What a scan does

Each card picks one of two behaviours in the editor, switchable at any time — the
printed QR is identical either way:

- **`direct`** — the scan 302s straight to the business's Google review page.
- **`rating_gate`** — the scan lands on a branded interstitial: a 1–5 star control,
  the Google review button, and a private-feedback form. Every visitor sees both
  routes regardless of the rating (see the compliance rule below). Private messages
  land in `/app/feedback`; nothing about them is published.

The interstitial is server-rendered HTML with no client bundle and works with
JavaScript disabled. Its form is protected by a slug-scoped signed token (minimum two
seconds of dwell time, six-hour lifetime), a honeypot field, and a per-link hourly
ceiling held in process memory — single Node process, so that ceiling is per-instance.

There is no payment integration and no invite flow in v1, by design. A customer pays by
transferencia and you flip the flag:

```bash
npm run set-plan -- --list
npm run set-plan -- --email cliente@ejemplo.com.py --plan paid
npm run manage-user -- --add --tenant 3 --email socio@ejemplo.com.py --role admin --password '...'
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/login`, `/register` | Auth (registering creates the tenant and its `owner`) |
| `/app` | Dashboard: card list and headline scan stats |
| `/app/businesses`, `/app/businesses/[id]` | Business CRUD, Place ID, logo |
| `/app/qr/new`, `/app/qr/[id]` | Create a card, then the editor and export |
| `/app/qr/[id]/stats` | Scans/day, device split, totals — plus feedback volume, average rating and star distribution on a `rating_gate` card |
| `/r/[slug]` | **Public.** Indexed slug lookup → 302, scan logged after the response. In `rating_gate` mode it renders the interstitial instead |
| `/r/[slug]/feedback` | **Public.** Receives the private feedback form, then 303s back |
| `/app/feedback` | Private feedback inbox (unread badge in the nav) |
| `/api/qr`, `/api/qr/[id]` | Create / update / delete a card |
| `/api/upload/logo` | Logo upload, 300 KB cap, stored as base64 in the DB |
| `/api/export/permit` | Whether this tenant's exports carry the watermark |

## Rules this codebase keeps

- **Tenant isolation.** Every query is scoped by `tenantId` server-side; every `[id]`
  route fetches by id **and** `tenantId` and 404s on a miss. `proxy.ts` only checks
  that a session cookie exists — it is not authorization.
- **Roles.** `owner` > `admin` > `member`, checked with `requireRole`/`withRole` on
  every mutating route. Hidden buttons are not a security boundary.
- **No IP, no geo.** Scans store a coarse device type and a salted UA hash.
- **Uploads are typed by their bytes, not their headers.** The logo route sniffs the
  real image type and stores that; an SVG is stripped of scripts, event handlers and
  `foreignObject` before it is saved.
- **The app refuses to start on the `.env.example` `SESSION_SECRET`** — a placeholder in
  source control would let anyone forge a session cookie.
- **No UI string in a component.** Everything comes from `src/lib/locale`.
- **The rating gate never filters reviewers.** A card in `rating_gate` mode shows the
  Google link and the private-feedback form to every visitor, whatever they tapped;
  the stars are informational. Steering only happy customers to Google violates
  Google's review policies, and `npm run check:gate` fails if the link ever stops
  being rendered.
- **No GitHub Actions workflow.** Quality gate is the husky `pre-push` hook
  (`typecheck && check:gate && build`); `pre-commit` blocks anything under
  `.github/workflows/`.
  Deploys run on Hostinger's build servers from a webhook.

## Deploying

Manual, per the `nextjs-deploy-hostinger` playbook: hPanel → Websites → Node.js Apps →
Import Git Repository, then set `DATABASE_URL`, `SESSION_SECRET`, `APP_URL` and
`SCAN_HASH_SALT` as environment variables and redeploy.

`APP_URL` is the one value that cannot change after cards are printed — it is baked
into every QR. Set the final domain before the first print run.

Run `db:push` and the seed from a local machine against Remote MySQL (hPanel →
Databases → Remote MySQL, whitelist your IP), not over Hostinger SSH.
