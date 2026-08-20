import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

declare global {
  var __qrPool: mysql.Pool | undefined;
}

// One pool per process. Hostinger MySQL caps concurrent connections per user, and
// `next dev` re-evaluates modules on every edit — hence the global cache.
const pool =
  globalThis.__qrPool ??
  mysql.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: 8,
    timezone: "Z",
  });

if (process.env.NODE_ENV !== "production") globalThis.__qrPool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export { schema, pool };
