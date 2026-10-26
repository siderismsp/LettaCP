import { NextResponse } from "next/server";
import { listSharedFiles, writeSharedFile } from "@/lib/shared-memory";

export async function GET() {
  try {
    const files = await listSharedFiles();
    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      content?: string;
    };
    if (!body.name || !body.name.trim() || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "`name` and `content` are required." },
        { status: 400 },
      );
    }
    // Allow only safe file names (no slashes / traversal).
    const name = body.name.trim().replace(/\.md$/i, "");
    if (!/^[a-z0-9_-]+$/i.test(name)) {
      return NextResponse.json(
        { error: "Name may only contain letters, numbers, dashes and underscores." },
        { status: 400 },
      );
    }
    const result = await writeSharedFile(
      name,
      body.description?.trim() ?? "",
      body.content,
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
