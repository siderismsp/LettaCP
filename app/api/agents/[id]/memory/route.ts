import { NextResponse } from "next/server";
import { listAgentMemory, writeMemoryFile } from "@/lib/letta-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const files = await listAgentMemory(id);
    return NextResponse.json(files);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await req.json()) as { path?: string; content?: string };
    if (!body.path || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "Both `path` and `content` are required." },
        { status: 400 },
      );
    }
    const result = await writeMemoryFile(id, body.path, body.content);
    const files = await listAgentMemory(id);
    return NextResponse.json({ ...result, files });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

