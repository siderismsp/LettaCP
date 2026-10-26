import { NextResponse } from "next/server";
import { deleteSharedFile } from "@/lib/shared-memory";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  try {
    const clean = name.replace(/\.md$/i, "");
    await deleteSharedFile(clean);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
