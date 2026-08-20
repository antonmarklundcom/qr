import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Optimistic gate only — it checks that a session cookie exists, nothing more.
 * The real authorization (who the user is, which tenant they belong to, what role
 * they hold) happens server-side in requireTenant/requireRole on every page and
 * mutating route.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/app/:path*"],
};
