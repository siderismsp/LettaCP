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

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, getSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
