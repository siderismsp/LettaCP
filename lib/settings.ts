/**
 * Client-side settings helpers.
 *
 * The Ollama base URL is user-configurable and persisted in `localStorage`
 * (with an env/`NEXT_PUBLIC_` fallback and a safe default). A custom window
 * event lets consumers (e.g. the model dropdown) refetch when it changes.
 */

const STORAGE_KEY = "letta-cp:ollama-url";
const DEFAULT_OLLAMA_URL = "http://localhost:11434";

export function getOllamaUrl(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  }
  // NEXT_PUBLIC_* is inlined into the browser bundle at build time.
  const publicUrl = process.env.NEXT_PUBLIC_OLLAMA_BASE_URL;
  // Non-public env vars only exist on the server; guard for the browser.
  const serverUrl =
    typeof process !== "undefined" && process.env
      ? process.env.OLLAMA_BASE_URL
      : undefined;
  return publicUrl ?? serverUrl ?? DEFAULT_OLLAMA_URL;
}

export function saveOllamaUrl(url: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, url.trim());
    window.dispatchEvent(new Event("letta-cp:settings-changed"));
  }
}

// ── Default Embedding Provider ─────────────────────────────────────────────

const EMBEDDING_KEY = "letta-cp:embedding";

export interface EmbeddingConfig {
  model: string;
  endpoint: string;
}

const DEFAULT_EMBEDDING: EmbeddingConfig = {
  model: process.env.NEXT_PUBLIC_DEFAULT_EMBEDDING_MODEL ?? "nomic-embed-text",
  endpoint: process.env.NEXT_PUBLIC_DEFAULT_EMBEDDING_ENDPOINT ?? "",
};

export function getEmbeddingConfig(): EmbeddingConfig {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(EMBEDDING_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_EMBEDDING, ...JSON.parse(stored) };
      } catch {
        // fall through to default
      }
    }
  }
  return DEFAULT_EMBEDDING;
}

export function saveEmbeddingConfig(config: EmbeddingConfig) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      EMBEDDING_KEY,
      JSON.stringify({
        model: config.model.trim(),
        endpoint: config.endpoint.trim(),
      }),
    );
    window.dispatchEvent(new Event("letta-cp:settings-changed"));
  }
}
