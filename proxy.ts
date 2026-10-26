import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, isAuthEnabled, SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export function proxy(req: NextRequest) {
  // Auth is disabled when no DASHBOARD_PASSWORD is configured.
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token === getSessionToken()) return NextResponse.next();

  // API requests: return 401; page requests: redirect to /login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Match everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
