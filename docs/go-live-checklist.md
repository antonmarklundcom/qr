# Go-live checklist

Everything in [`plans/qr-review-cards-v1.md`](plans/qr-review-cards-v1.md) is built —
v1 and the v1.1 rating gate. What is left is not code: it is four decisions and one
deploy. Work through this in order; each step says what it blocks.

## 1. Decide the domain — do this first

Plan §9.1. `APP_URL` is baked into every printed QR as `https://<domain>/r/<slug>`.
It is the one value that **cannot** change after a customer prints cards — changing it
turns every card already in the wild into a dead code.

- Paraguay first → `resenas.com.py` (or whichever PY domain you own)
- Sweden first → the `minarecensioner` domain
- Both → still pick one to deploy now; the codebase is already locale-per-tenant, so
  the second market is a second deploy of the same repo, not a fork.

Nothing else can be finished until this is answered.

## 2. Provision on Hostinger

Per the `nextjs-deploy-hostinger` playbook:

1. hPanel → Websites → **Node.js Apps** → Import Git Repository → this repo, branch `main`.
2. Create the MySQL database. Note which account and slot the app lands in — write it
   at the bottom of this file so the next person does not have to guess.
3. hPanel → Databases → **Remote MySQL** → whitelist your own IP. You need this for
   step 3; do not try to run the schema push over SSH.
4. Point the domain at the app and confirm SSL is issued before printing anything.

## 3. Set the four environment variables

In hPanel → Node.js App → Environment Variables. Source comments are in `.env.example`.

| Variable | Value |
|---|---|
| `DATABASE_URL` | The **localhost** connection string for the live app |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `APP_URL` | The domain from step 1, no trailing slash |
| `SCAN_HASH_SALT` | Any random string |

The app **refuses to boot** on the `.env.example` placeholder `SESSION_SECRET` — that is
deliberate, not a bug. A placeholder committed to source control would let anyone forge
a session cookie.

## 4. Create the schema

From your own machine, against Remote MySQL — `tsx` does not auto-load `.env`:

```bash
export DATABASE_URL="mysql://user:pass@srvXXXX.hstgr.io:3306/dbname"
npm run db:push
```

This creates the `feedback` table along with everything else. **The live app will error
on the feedback inbox until this has run.**

Optionally seed a demo tenant for sales calls (idempotent, prints its login once):

```bash
npm run seed:demo
```

## 5. Answer the two remaining product questions

- **Free tier (plan §9.4).** Today: free = 1 business, 1 card, watermarked exports;
  paid = unlimited and clean. If you would rather sell paid-only with a demo account,
  say so — it is a change to `src/lib/plan.ts` and the register flow, nothing structural.
- **Rating gate default.** New cards are created in `direct` mode and you flip them in
  the editor. If every card should start on the interstitial instead, that is a one-line
  change in `POST /api/qr`.

## 6. First real customer

1. Get the business's **Google Place ID** (Google's Place ID finder). A pasted maps URL
   works as a fallback but breaks if they rename themselves — the Place ID does not.
2. Create the tenant by registering, then flip them to paid after they pay:
   ```bash
   npm run set-plan -- --list
   npm run set-plan -- --email cliente@ejemplo.com.py --plan paid
   ```
3. Design the card, export the PDF, **scan the printed proof with a real phone before
   the full print run** — not the on-screen preview. Check it at the actual physical
   size, on the actual card stock, under the lighting it will live in.
4. If they want the interstitial, switch the card to "show an intermediate screen" in
   the editor and check the page on a phone in their language.

## 7. Off-site, once cards are out

The QR only creates the opportunity — the Google Business Profile decides whether the
review sticks and whether it moves the local pack. Category, NAP consistency, photos,
and replying to every review matter more than the card design.

---

## Deployment record

Fill in when the app first deploys:

- Hostinger account: _______
- Node.js slot / app name: _______
- Domain: _______
- Database name: _______
- First deploy date: _______
