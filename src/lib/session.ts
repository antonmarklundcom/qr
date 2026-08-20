import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { UserRole } from "@/db/schema";
import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };

export interface SessionData {
  userId?: number;
  /** Cached for cheap proxy-level checks only — never trusted for authorization. */
  tenantId?: number;
  role?: UserRole;
}



function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters — see .env.example",
    );
  }
  // The .env.example placeholder is long enough to pass the length check, so a
  // deployment that copied the file verbatim would boot with a secret that is public in
  // source control — anyone could forge a session cookie. Refuse to start instead.
  if (/change-me/i.test(password)) {
    throw new Error(
      "SESSION_SECRET is still the .env.example placeholder — generate a real one: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  return {
    password,
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
