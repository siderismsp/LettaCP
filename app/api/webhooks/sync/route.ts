import { NextRequest, NextResponse } from "next/server";
import { writeSharedFile } from "@/lib/shared-memory";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";

function authorize(req: NextRequest): boolean {
  if (!WEBHOOK_SECRET) {
    // If no secret is configured, only allow requests that don't claim one.
    return true;
  }
  const header = req.headers.get("x-webhook-secret");
  const query = new URL(req.url).searchParams.get("token");
  const provided = header ?? query ?? "";
  return provided === WEBHOOK_SECRET;
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: string;
    description?: string;
    content?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || !body.name.trim() || typeof body.content !== "string") {
    return NextResponse.json(
      { error: "`name` and `content` are required." },
      { status: 400 },
    );
  }

  const name = body.name.trim().replace(/\.md$/i, "");
  if (!/^[a-z0-9_-]+$/i.test(name)) {
    return NextResponse.json(
      { error: "Name may only contain letters, numbers, dashes and underscores." },
      { status: 400 },
    );
  }

  try {
    const result = await writeSharedFile(
      name,
      body.description?.trim() ?? "",
      body.content,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
