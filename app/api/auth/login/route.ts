import { NextRequest, NextResponse } from "next/server";
import { getSessionToken, isAuthEnabled, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ ok: true, disabled: true });
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (body.password !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Only mark the cookie `Secure` when the request actually arrived over HTTPS.
  // Forcing `secure` from NODE_ENV breaks login over plain HTTP, which is common
  // for self-hosted LAN / Proxmox deployments — browsers will not send a Secure
  // cookie back over HTTP, so the session would never be accepted.
  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const isSecure =
    forwardedProto === "https" || req.nextUrl.protocol === "https:";

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, getSessionToken(), {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
