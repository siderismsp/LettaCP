import type { AgentView, MemoryFile, SharedFile } from "./types";

/**
 * Client-side API helper. The browser never talks to the Letta App Server
 * directly (its WebSocket can't send the auth header) — it calls the Next.js
 * REST routes in `app/api/**`, which proxy to the App Server via `ws`.
 */

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = getTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Request failed (${res.status}): ${text}`);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

/** Client fetch timeout (configurable via NEXT_PUBLIC_API_TIMEOUT_MS). */
function getTimeoutMs(): number {
  const n = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

export function fetchAgents() {
  return request<AgentView[]>("/api/agents");
}

export function fetchAgent(id: string) {
  return request<AgentView>(`/api/agents/${encodeURIComponent(id)}`);
}

export function updateAgentRemote(
  id: string,
  opts: { name?: string; description?: string; model?: string },
) {
  return request<AgentView>(`/api/agents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
}

export function fetchAgentMemory(id: string) {
  return request<MemoryFile[]>(`/api/agents/${encodeURIComponent(id)}/memory`);
}

export function updateMemoryFile(id: string, path: string, content: string) {
  return request<{ committed: boolean; commit_sha?: string; files: MemoryFile[] }>(
    `/api/agents/${encodeURIComponent(id)}/memory`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    },
  );
}

export function fetchNetwork() {
  return request<{ agents: AgentView[]; memories: Record<string, MemoryFile[]> }>(
    "/api/network",
  );
}

export function fetchSharedFiles() {
  return request<{ files: SharedFile[] }>("/api/shared-memory");
}

export function saveSharedFile(
  name: string,
  description: string,
  content: string,
  addToPrompts = false,
) {
  return request<{ file: SharedFile }>("/api/shared-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, content, addToPrompts }),
  });
}

export function removeSharedFile(name: string) {
  return request<{ ok: boolean }>(
    `/api/shared-memory/${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );
}

export interface EmbeddingConfig {
  model: string;
  endpoint: string;
}

export function fetchConfig() {
  return request<{ lettaUrl: string; embedding: EmbeddingConfig }>("/api/config");
}

export function saveConfig(
  lettaUrl?: string,
  embedding?: EmbeddingConfig,
) {
  return request<{
    ok: boolean;
    lettaUrl?: string;
    embedding?: EmbeddingConfig;
  }>("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lettaUrl, embedding }),
  });
}
