import {
  bigint,
  boolean,
  index,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import type { CardStyle } from "@/lib/card-style";

const id = () =>
  bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey();

const tenantId = () =>
  bigint("tenant_id", { mode: "number", unsigned: true }).notNull();

/** The paying account. An agency or a single business owning the subscription. */
export const tenants = mysqlTable("tenants", {
  id: id(),
  name: varchar("name", { length: 160 }).notNull(),
  plan: mysqlEnum("plan", ["free", "paid"]).notNull().default("free"),
  locale: mysqlEnum("locale", ["es-PY", "sv-SE"]).notNull().default("es-PY"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

/** Login identities. Always scoped to exactly one tenant. */
export const users = mysqlTable(
  "users",
  {
    id: id(),
    tenantId: tenantId(),
    email: varchar("email", { length: 190 }).notNull(),
    passwordHash: varchar("password_hash", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }),
    role: mysqlEnum("role", ["owner", "admin", "member"])
      .notNull()
      .default("member"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    index("users_tenant_idx").on(t.tenantId),
  ],
);

/** The physical business a card points at. One tenant can hold many (agency case). */
export const businesses = mysqlTable(
  "businesses",
  {
    id: id(),
    tenantId: tenantId(),
    name: varchar("name", { length: 190 }).notNull(),
    googlePlaceId: varchar("google_place_id", { length: 120 }),
    /** Raw-URL fallback for businesses that only have a share link. */
    googleReviewUrl: varchar("google_review_url", { length: 500 }),
    /**
     * data: URI, base64. Capped at LOGO_MAX_BYTES on upload (plan §9.3); mediumtext
     * because a 300 KB logo base64-encodes to ~400 KB, past TEXT's 64 KB ceiling.
     */
    logoDataUrl: mediumtext("logo_data_url"),
    city: varchar("city", { length: 120 }),
    whatsapp: varchar("whatsapp", { length: 24 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("businesses_tenant_idx").on(t.tenantId)],
);

/** The /r/<slug> redirect target. What the printed QR actually encodes. */
export const shortLinks = mysqlTable(
  "short_links",
  {
    id: id(),
    tenantId: tenantId(),
    slug: varchar("slug", { length: 16 }).notNull(),
    destinationUrl: varchar("destination_url", { length: 700 }).notNull(),
    /**
     * 'direct' 302s straight to the destination. 'rating_gate' renders the compliant
     * interstitial (plan §5): the star rating is informational and BOTH the Google
     * review link and the private feedback form are shown to everyone, whatever the
     * rating. Steering only happy customers to Google breaks Google's review policy.
     */
    mode: mysqlEnum("mode", ["direct", "rating_gate"]).notNull().default("direct"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex("short_links_slug_idx").on(t.slug),
    index("short_links_tenant_idx").on(t.tenantId),
  ],
);

/** One styled card design. */
export const qrCodes = mysqlTable(
  "qr_codes",
  {
    id: id(),
    tenantId: tenantId(),
    businessId: bigint("business_id", { mode: "number", unsigned: true }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    /** qr-code-styling options + our frame config + CTA text. */
    style: json("style").$type<CardStyle>().notNull(),
    shortLinkId: bigint("short_link_id", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    status: mysqlEnum("status", ["draft", "active", "archived"])
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("qr_codes_tenant_idx").on(t.tenantId),
    index("qr_codes_business_idx").on(t.businessId),
    index("qr_codes_short_link_idx").on(t.shortLinkId),
  ],
);

/**
 * Append-only scan log. No IP, no precise geo (plan §8) — coarse device type and a
 * salted UA hash only.
 */
export const scans = mysqlTable(
  "scans",
  {
    id: id(),
    shortLinkId: bigint("short_link_id", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    /** Denormalized so per-tenant dashboards need no join. */
    tenantId: tenantId(),
    scannedAt: timestamp("scanned_at").notNull().defaultNow(),
    deviceType: mysqlEnum("device_type", [
      "mobile",
      "tablet",
      "desktop",
      "unknown",
    ])
      .notNull()
      .default("unknown"),
    uaHash: varchar("ua_hash", { length: 64 }),
    referrer: varchar("referrer", { length: 255 }),
  },
  (t) => [
    index("scans_short_link_idx").on(t.shortLinkId),
    index("scans_scanned_at_idx").on(t.scannedAt),
    index("scans_tenant_scanned_idx").on(t.tenantId, t.scannedAt),
  ],
);

/**
 * Private feedback left on the rating-gate interstitial. Unlike `scans` this DOES hold
 * personal data the visitor typed (an optional contact), so it is deletable per card
 * and carries a retention note in the public form (plan §8, GDPR).
 */
export const feedback = mysqlTable(
  "feedback",
  {
    id: id(),
    tenantId: tenantId(),
    shortLinkId: bigint("short_link_id", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    businessId: bigint("business_id", { mode: "number", unsigned: true }),
    /** 1–5, or null when the visitor wrote a message without picking a star. */
    rating: tinyint("rating"),
    message: text("message").notNull(),
    /** Whatever the visitor chose to leave: an email, a phone, or nothing. */
    contact: varchar("contact", { length: 190 }),
    status: mysqlEnum("status", ["new", "read", "archived"])
      .notNull()
      .default("new"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("feedback_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("feedback_short_link_idx").on(t.shortLinkId),
    index("feedback_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  businesses: many(businesses),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [businesses.tenantId],
    references: [tenants.id],
  }),
  qrCodes: many(qrCodes),
}));

export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  tenant: one(tenants, { fields: [qrCodes.tenantId], references: [tenants.id] }),
  business: one(businesses, {
    fields: [qrCodes.businessId],
    references: [businesses.id],
  }),
  shortLink: one(shortLinks, {
    fields: [qrCodes.shortLinkId],
    references: [shortLinks.id],
  }),
}));

export const shortLinksRelations = relations(shortLinks, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [shortLinks.tenantId],
    references: [tenants.id],
  }),
  scans: many(scans),
  feedback: many(feedback),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  tenant: one(tenants, { fields: [feedback.tenantId], references: [tenants.id] }),
  shortLink: one(shortLinks, {
    fields: [feedback.shortLinkId],
    references: [shortLinks.id],
  }),
  business: one(businesses, {
    fields: [feedback.businessId],
    references: [businesses.id],
  }),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  shortLink: one(shortLinks, {
    fields: [scans.shortLinkId],
    references: [shortLinks.id],
  }),
}));

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type QrCode = typeof qrCodes.$inferSelect;
export type ShortLink = typeof shortLinks.$inferSelect;
export type Scan = typeof scans.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type UserRole = User["role"];
export type TenantPlan = Tenant["plan"];
export type AppLocale = Tenant["locale"];
export type ShortLinkMode = ShortLink["mode"];
export type FeedbackStatus = Feedback["status"];
