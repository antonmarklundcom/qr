/**
 * Demo tenant for sales calls: one Paraguayan business, one styled card, and a month
 * of plausible scan traffic.
 *
 * Run it from a machine whitelisted in hPanel -> Databases -> Remote MySQL. `tsx` does
 * NOT auto-load .env, so set the variable for the shell session first:
 *
 *   $env:DATABASE_URL = "mysql://user:pass@srv####.hstgr.io:3306/dbname"   # PowerShell
 *   export DATABASE_URL="mysql://user:pass@srv####.hstgr.io:3306/dbname"   # bash
 *   npm run seed:demo
 *
 * Idempotent: re-running updates the same rows instead of duplicating them.
 */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import {
  businesses,
  feedback,
  qrCodes,
  scans,
  shortLinks,
  tenants,
  users,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/passwords";
import { defaultCardStyle } from "../src/lib/card-style";
import { buildReviewDestination, generateSlug } from "../src/lib/short-links";
import type { DeviceType } from "../src/lib/scan-tracking";

const DEMO_EMAIL = "demo@resenas.com.py";
const DEMO_SLUG = "demopy1";

/**
 * A fixed default here would put a guessable owner login on every database this script
 * is ever pointed at, including production. Set DEMO_PASSWORD to choose one; otherwise
 * a random one is generated and printed once.
 */
const DEMO_PASSWORD =
  process.env.DEMO_PASSWORD ?? randomBytes(9).toString("base64url");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — see the comment at the top of this file");
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEMO_EMAIL))
    .limit(1);

  let tenantId: number;
  if (existingUser) {
    tenantId = existingUser.tenantId;
    await db
      .update(tenants)
      .set({ name: "Panadería Ñandutí", plan: "free", locale: "es-PY" })
      .where(eq(tenants.id, tenantId));
  } else {
    const [inserted] = await db.insert(tenants).values({
      name: "Panadería Ñandutí",
      plan: "free",
      locale: "es-PY",
    });
    tenantId = inserted.insertId;
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  if (existingUser) {
    await db
      .update(users)
      .set({ passwordHash, role: "owner", name: "Rocío Benítez" })
      .where(eq(users.id, existingUser.id));
  } else {
    await db.insert(users).values({
      tenantId,
      email: DEMO_EMAIL,
      passwordHash,
      name: "Rocío Benítez",
      role: "owner",
    });
  }

  const businessValues = {
    tenantId,
    name: "Panadería Ñandutí",
    city: "Asunción",
    whatsapp: "+595981456789",
    googlePlaceId: "ChIJDemoPanaderiaNanduti00",
    googleReviewUrl: null,
    logoDataUrl: null,
  };

  const [existingBusiness] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.tenantId, tenantId))
    .limit(1);

  let businessId: number;
  if (existingBusiness) {
    businessId = existingBusiness.id;
    await db
      .update(businesses)
      .set(businessValues)
      .where(eq(businesses.id, businessId));
  } else {
    const [inserted] = await db.insert(businesses).values(businessValues);
    businessId = inserted.insertId;
  }

  const destinationUrl =
    buildReviewDestination(businessValues) ?? "https://www.google.com/maps";

  const [existingLink] = await db
    .select()
    .from(shortLinks)
    .where(eq(shortLinks.slug, DEMO_SLUG))
    .limit(1);

  let shortLinkId: number;
  if (existingLink) {
    shortLinkId = existingLink.id;
    await db
      .update(shortLinks)
      .set({ tenantId, destinationUrl, mode: "rating_gate", active: true })
      .where(eq(shortLinks.id, shortLinkId));
  } else {
    const [inserted] = await db.insert(shortLinks).values({
      tenantId,
      slug: DEMO_SLUG || generateSlug(),
      destinationUrl,
      // The demo card shows the compliant interstitial: it is the thing worth
      // demonstrating on a sales call, and it fills the feedback inbox below.
      mode: "rating_gate",
      active: true,
    });
    shortLinkId = inserted.insertId;
  }

  const style = defaultCardStyle("es-PY");
  style.qr.dotsType = "classy-rounded";
  style.qr.dotsColor = "#1B1B2F";
  style.qr.cornerSquareColor = "#C2410C";
  style.qr.cornerDotColor = "#1B1B2F";
  style.frame.style = "ribbon";
  style.frame.accent = "#C2410C";
  style.frame.ink = "#1B1B2F";
  style.text.cta = "Califícanos en Google";
  style.text.footer = "Escaneá con la cámara de tu celular";

  const [existingCard] = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.shortLinkId, shortLinkId))
    .limit(1);

  if (existingCard) {
    await db
      .update(qrCodes)
      .set({ name: "Mostrador", style, status: "active" })
      .where(eq(qrCodes.id, existingCard.id));
  } else {
    await db.insert(qrCodes).values({
      tenantId,
      businessId,
      name: "Mostrador",
      style,
      shortLinkId,
      status: "active",
    });
  }

  // Rebuild the scan history so re-running the seed does not pile traffic up.
  await db.delete(scans).where(eq(scans.shortLinkId, shortLinkId));

  const devices: DeviceType[] = ["mobile", "mobile", "mobile", "tablet", "desktop"];
  const rows: (typeof scans.$inferInsert)[] = [];
  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    // Busier on weekends, the way a bakery counter actually behaves.
    const date = new Date(Date.now() - daysAgo * 86400000);
    const weekend = [0, 6].includes(date.getUTCDay());
    const count = (weekend ? 6 : 3) + ((daysAgo * 7) % 5);
    for (let i = 0; i < count; i++) {
      const at = new Date(date);
      at.setUTCHours(11 + (i % 9), (i * 13) % 60, 0, 0);
      rows.push({
        shortLinkId,
        tenantId,
        scannedAt: at,
        deviceType: devices[(daysAgo + i) % devices.length],
        uaHash: null,
        referrer: null,
      });
    }
  }
  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(scans).values(rows.slice(i, i + 200));
  }

  // A handful of private messages so the inbox is not an empty state on a demo.
  await db.delete(feedback).where(eq(feedback.shortLinkId, shortLinkId));
  const demoFeedback: {
    rating: number | null;
    message: string;
    contact: string | null;
    daysAgo: number;
    status: "new" | "read";
  }[] = [
    {
      rating: 5,
      message: "Las chipas de la mañana son las mejores de Asunción. Sigan así.",
      contact: null,
      daysAgo: 1,
      status: "new",
    },
    {
      rating: 3,
      message:
        "Rica la comida pero esperé casi 20 minutos en la caja un sábado. Faltaría alguien más atendiendo.",
      contact: "clienta@ejemplo.com.py",
      daysAgo: 4,
      status: "new",
    },
    {
      rating: 4,
      message: "Todo bien, solo faltaría una opción sin azúcar.",
      contact: "+595981123456",
      daysAgo: 11,
      status: "read",
    },
  ];
  await db.insert(feedback).values(
    demoFeedback.map((f) => ({
      tenantId,
      shortLinkId,
      businessId,
      rating: f.rating,
      message: f.message,
      contact: f.contact,
      status: f.status,
      createdAt: new Date(Date.now() - f.daysAgo * 86400000),
    })),
  );

  console.log(
    [
      "Demo tenant ready:",
      `  login     ${DEMO_EMAIL} / ${DEMO_PASSWORD}`,
      `  business  Panadería Ñandutí (Asunción)`,
      `  card      Mostrador -> /r/${DEMO_SLUG}`,
      `  scans     ${rows.length} over the last 30 days`,
      `  feedback  ${demoFeedback.length} private messages (card is in rating_gate mode)`,
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
