import { NextResponse } from "next/server";

/**
 * Fetch the list of models from a local Ollama instance.
 *
 * The Ollama URL is supplied as `?url=` (client sends the stored setting) or
 * falls back to `OLLAMA_BASE_URL` / `NEXT_PUBLIC_OLLAMA_BASE_URL` / a default.
 * Ollama exposes its model list at `GET /api/tags`.
 */

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

interface OllamaModel {
  name: string;
  size: number;
}

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  // strip trailing slash
  return url.replace(/\/+$/, "");
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const configured =
    searchParams.get("url")?.trim() ||
    process.env.OLLAMA_BASE_URL ||
    process.env.NEXT_PUBLIC_OLLAMA_BASE_URL ||
    DEFAULT_OLLAMA_URL;

  const baseUrl = normalizeBaseUrl(configured);

  if (!isValidHttpUrl(baseUrl)) {
    return NextResponse.json(
      { error: "Invalid Ollama URL. Must be http(s)://host:port" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${baseUrl}/api/tags`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Ollama responded with ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      models?: { name?: string; model?: string; size?: number }[];
    };
    const models: OllamaModel[] = (data.models ?? []).map((m) => ({
      name: m.name ?? m.model ?? "",
      size: m.size ?? 0,
    }));
    return NextResponse.json({ models, url: baseUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
