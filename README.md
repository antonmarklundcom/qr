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

Seed credentials: `demo@resenas.com.py` / `demo1234` (override with `DEMO_PASSWORD`).
Rotate them before any deployment that is reachable from the internet.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply `src/db/schema.ts` to the database |
| `npm run db:generate` | Write a migration instead of pushing |
| `npm run seed:demo` | Idempotent Paraguayan demo tenant + 30 days of scans |

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/login`, `/register` | Auth (registering creates the tenant and its `owner`) |
| `/app` | Dashboard: card list and headline scan stats |
| `/app/businesses`, `/app/businesses/[id]` | Business CRUD, Place ID, logo |
| `/app/qr/new`, `/app/qr/[id]` | Create a card, then the editor and export |
| `/app/qr/[id]/stats` | Scans/day, device split, totals |
| `/r/[slug]` | **Public.** Indexed slug lookup → 302, scan logged after the response |
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
- **No UI string in a component.** Everything comes from `src/lib/locale`.
- **No GitHub Actions workflow.** Quality gate is the husky `pre-push` hook
  (`typecheck && build`); `pre-commit` blocks anything under `.github/workflows/`.
  Deploys run on Hostinger's build servers from a webhook.

## Deploying

Manual, per the `nextjs-deploy-hostinger` playbook: hPanel → Websites → Node.js Apps →
Import Git Repository, then set `DATABASE_URL`, `SESSION_SECRET`, `APP_URL` and
`SCAN_HASH_SALT` as environment variables and redeploy.

`APP_URL` is the one value that cannot change after cards are printed — it is baked
into every QR. Set the final domain before the first print run.

Run `db:push` and the seed from a local machine against Remote MySQL (hPanel →
Databases → Remote MySQL, whitelist your IP), not over Hostinger SSH.
