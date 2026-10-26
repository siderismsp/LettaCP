import { NextRequest, NextResponse } from "next/server";
import {
  getConfig,
  setEmbeddingConfig,
  getEmbeddingConfig,
  setLettaUrl,
} from "@/lib/config";

export async function GET() {
  return NextResponse.json(getConfig());
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      lettaUrl?: string;
      embedding?: { model?: string; endpoint?: string };
    };

    const result: {
      ok: boolean;
      lettaUrl?: string;
      embedding?: { model: string; endpoint: string };
    } = { ok: true };

    if (typeof body.lettaUrl === "string") {
      result.lettaUrl = setLettaUrl(body.lettaUrl);
    }

    if (body.embedding) {
      const current = getEmbeddingConfig();
      result.embedding = setEmbeddingConfig({
        model: body.embedding.model ?? current.model,
        endpoint: body.embedding.endpoint ?? current.endpoint,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
