/**
 * SERVER-ONLY runtime configuration.
 *
 * Holds runtime-overridable settings that are synchronized with the client via
 * `/api/config`. Falls back to env vars (`LETTA_APP_SERVER_URL`,
 * `NEXT_PUBLIC_DEFAULT_LETTA_URL`, `NEXT_PUBLIC_DEFAULT_EMBEDDING_*`) then
 * hard-coded defaults.
 */

export interface EmbeddingConfig {
  model: string;
  endpoint: string;
}

let lettaUrl: string | null = null;
let embedding: EmbeddingConfig | null = null;

const DEFAULT_LETTA_URL =
  process.env.LETTA_APP_SERVER_URL ??
  process.env.NEXT_PUBLIC_DEFAULT_LETTA_URL ??
  "http://localhost:8283";

const DEFAULT_EMBEDDING: EmbeddingConfig = {
  model: process.env.NEXT_PUBLIC_DEFAULT_EMBEDDING_MODEL ?? "nomic-embed-text",
  endpoint: process.env.NEXT_PUBLIC_DEFAULT_EMBEDDING_ENDPOINT ?? "",
};

export function getLettaUrl(): string {
  return lettaUrl ?? DEFAULT_LETTA_URL;
}

export function setLettaUrl(url: string): string {
  const cleaned = url.trim().replace(/\/+$/, "");
  if (!cleaned) {
    lettaUrl = null;
    return getLettaUrl();
  }
  lettaUrl = cleaned;
  return lettaUrl;
}

export function resetLettaUrl(): void {
  lettaUrl = null;
}

export function getEmbeddingConfig(): EmbeddingConfig {
  return embedding ?? DEFAULT_EMBEDDING;
}

export function setEmbeddingConfig(config: EmbeddingConfig): EmbeddingConfig {
  embedding = {
    model: config.model.trim(),
    endpoint: config.endpoint.trim(),
  };
  return embedding;
}

export function resetEmbeddingConfig(): void {
  embedding = null;
}

/** Full runtime config snapshot (used by GET /api/config). */
export function getConfig() {
  return {
    lettaUrl: getLettaUrl(),
    embedding: getEmbeddingConfig(),
  };
}

