import { LettaAgentClient } from "@letta-ai/letta-agent-sdk/client";
import type {
  LettaCodeSocketConstructor,
  ListAgentsOptions,
  UpdateAgentOptions,
} from "@letta-ai/letta-agent-sdk/client";
import {
  createAppServerClient,
  type AppServerClient,
} from "@letta-ai/letta-code/app-server-client";
import WebSocket from "ws";
import { getLettaUrl } from "./config";
import type { MemoryFile } from "./types";
import type { AgentView, ActivityItem } from "./types";

export type { ActivityItem };

/**
 * SERVER-ONLY module.
 *
 * The Letta App Server WebSocket requires an `Authorization: Bearer <token>`
 * header during the upgrade handshake. The browser's native `WebSocket` cannot
 * send custom headers, so all App Server traffic is proxied through the
 * Next.js Node server, which uses the `ws` library (header-capable). Client
 * components talk to the REST routes in `app/api/**` instead of this module.
 */

const AUTH_TOKEN = process.env.LETTA_AUTH_TOKEN ?? "";
const REQUEST_TIMEOUT_MS = Number(
  process.env.LETTA_REQUEST_TIMEOUT_MS ?? 120_000,
);

// `ws` accepts `(url, { headers })` and treats the object as options.
const wsConstructor = WebSocket as unknown as LettaCodeSocketConstructor;

let _agentClient: LettaAgentClient | null = null;
let _agentClientUrl: string | null = null;
let _appServer: AppServerClient | null = null;
let _appServerUrl: string | null = null;
let _appServerConnect: Promise<AppServerClient> | null = null;

/** Singleton Agent SDK client (Node build, `backend: "remote"`). */
export function getClient(): LettaAgentClient {
  const url = getLettaUrl();
  if (_agentClient && _agentClientUrl !== url) {
    // URL changed at runtime — drop the old pooled connection.
    _agentClientUrl = url;
    _agentClient = null;
  }
  if (!_agentClient) {
    _agentClient = new LettaAgentClient({
      backend: "remote",
      url,
      authToken: AUTH_TOKEN,
      WebSocket: wsConstructor,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
    });
    _agentClientUrl = url;
  }
  return _agentClient;
}

/** Lazily connect the low-level App Server WebSocket client (for memory). */
export function getAppServerClient(): Promise<AppServerClient> {
  const url = getLettaUrl();
  if ((_appServer && _appServerUrl !== url) || (_appServerConnect && _appServerUrl !== url)) {
    _appServer?.close();
    _appServer = null;
    _appServerUrl = null;
    _appServerConnect = null;
  }
  if (_appServer) return Promise.resolve(_appServer);
  if (!_appServerConnect) {
    _appServerConnect = (async () => {
      const client = createAppServerClient({
        url,
        authToken: AUTH_TOKEN,
        WebSocket: wsConstructor,
        requestTimeoutMs: REQUEST_TIMEOUT_MS,
      });
      await client.connect();
      _appServer = client;
      _appServerUrl = url;
      return client;
    })();
  }
  return _appServerConnect;
}

// ── Agents ────────────────────────────────────────────────────────────────

export async function listAgents(options?: ListAgentsOptions) {
  return getClient().agents.list({ limit: 200, ...options });
}

/** Map a raw SDK agent state to the clean shape exposed to the browser. */
export function toAgentView(agent: unknown): AgentView {
  const a = agent as {
    id: string;
    name?: string;
    description?: string | null;
    model?: string | null;
    system?: string;
    tags?: string[];
    tools?: { id: string; name?: string; description?: string | null }[];
  };
  return {
    id: a.id,
    name: a.name ?? "",
    description: a.description ?? null,
    model: a.model ?? null,
    system: a.system,
    tags: a.tags ?? [],
    tools: (a.tools ?? []).map((t) => ({
      id: t.id,
      name: t.name ?? t.id,
      description: t.description ?? null,
    })),
  };
}

export async function getAgent(agentId: string) {
  return getClient().agents.retrieve(agentId);
}

export async function updateAgent(agentId: string, options: UpdateAgentOptions) {
  return getClient().agents.update(agentId, options);
}

// ── Memory (git-backed MemFS files) ───────────────────────────────────────

interface ListMemoryResponse {
  type: "list_memory_response";
  request_id: string;
  entries: MemoryFile[];
  done: boolean;
  total: number;
  success: boolean;
  error?: string;
  memfs_enabled?: boolean;
  memfs_initialized?: boolean;
}

interface ReadMemoryFileResponse {
  type: "read_memory_file_response";
  request_id: string;
  agent_id: string;
  path: string;
  content: string | null;
  encoding: "utf8" | "base64";
  success: boolean;
  error?: string;
}

export async function listAgentMemory(agentId: string): Promise<MemoryFile[]> {
  const client = await getAppServerClient();
  const res = await client.request<ListMemoryResponse>(
    {
      type: "list_memory",
      request_id: client.nextRequestId("list-memory"),
      agent_id: agentId,
    },
    { predicate: (m): m is ListMemoryResponse => m.type === "list_memory_response" },
  );
  if (!res.success) throw new Error(res.error ?? "Failed to list memory");
  return res.entries ?? [];
}

export async function readMemoryFile(agentId: string, path: string): Promise<string | null> {
  const client = await getAppServerClient();
  const res = await client.request<ReadMemoryFileResponse>(
    {
      type: "read_memory_file",
      request_id: client.nextRequestId("read-memory-file"),
      agent_id: agentId,
      path,
    },
    {
      predicate: (m): m is ReadMemoryFileResponse =>
        m.type === "read_memory_file_response",
    },
  );
  if (!res.success) throw new Error(res.error ?? "Failed to read memory file");
  return res.content;
}

interface WriteMemoryFileResponse {
  type: "write_memory_file_response";
  request_id: string;
  agent_id: string;
  path: string;
  success: boolean;
  committed?: boolean;
  commit_sha?: string;
  error?: string;
}

export interface WriteMemoryResult {
  committed: boolean;
  commit_sha?: string;
}

/** Write (and git-commit) a memory file for an agent. */
export async function writeMemoryFile(
  agentId: string,
  path: string,
  content: string,
): Promise<WriteMemoryResult> {
  const client = await getAppServerClient();
  const res = await client.request<WriteMemoryFileResponse>(
    {
      type: "write_memory_file",
      request_id: client.nextRequestId("write-memory-file"),
      agent_id: agentId,
      path,
      content,
    },
    {
      predicate: (m): m is WriteMemoryFileResponse =>
        m.type === "write_memory_file_response",
    },
  );
  if (!res.success) throw new Error(res.error ?? "Failed to write memory file");
  return { committed: res.committed ?? true, commit_sha: res.commit_sha };
}

// ── Misc ──────────────────────────────────────────────────────────────────

export async function listModels() {
  return getClient().models.list();
}

export async function listConversations(agentId?: string) {
  return getClient().conversations.list({ agentId });
}

// ── Activity feed (conversation steps + tool executions) ───────────────────

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : (part as { text?: string }).text ?? "",
      )
      .join(" ");
  }
  return "";
}

function normalizeMessage(
  msg: {
    id: string;
    date?: string;
    created_at?: string;
    message_type?: string;
    name?: string | null;
    content?: unknown;
    tool_calls?: unknown;
    tool_call_id?: string | null;
    status?: string;
  },
  agentId: string,
  conversationId: string,
): ActivityItem {
  const timestamp = msg.date ?? msg.created_at ?? new Date().toISOString();
  const type = msg.message_type ?? "";
  const base = { id: msg.id, agentId, conversationId, timestamp };

  if (type === "tool_call_message") {
    const calls = (msg.tool_calls ?? []) as Array<{
      function?: { name?: string };
    }>;
    const toolName = calls[0]?.function?.name ?? msg.name ?? "tool";
    return {
      ...base,
      type: "tool_call",
      toolName,
      summary: `Executing tool: ${toolName}`,
    };
  }
  if (type === "tool_result_message") {
    return {
      ...base,
      type: "tool_result",
      toolName: msg.name ?? undefined,
      summary: msg.status === "error" ? "Tool returned an error" : "Tool result",
    };
  }
  if (type === "assistant_message") {
    return { ...base, type: "assistant", summary: truncateText(contentToString(msg.content), 160) };
  }
  if (type === "reasoning_message") {
    return { ...base, type: "reasoning", summary: "Reasoning" };
  }
  if (type === "user_message") {
    return { ...base, type: "user", summary: truncateText(contentToString(msg.content), 160) };
  }
  return { ...base, type: "system", summary: type || "event" };
}

function truncateText(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) + "…" : value;
}

/** Return recent activity (steps + tool executions) for an agent. */
export async function getAgentActivity(
  agentId: string,
  limit = 40,
): Promise<ActivityItem[]> {
  const conversations = await getClient().conversations.list({
    agentId,
    limit: 10,
  });
  const items: ActivityItem[] = [];
  for (const conv of conversations.slice(0, 3)) {
    try {
      const result = await getClient().conversations.listMessages(conv.id, {
        limit: 30,
        order: "desc",
      });
      for (const msg of result.messages ?? []) {
        items.push(normalizeMessage(msg, agentId, conv.id));
      }
    } catch {
      // skip conversations that can't be read
    }
  }
  // Deduplicate by id, sort newest-first, cap at limit.
  const seen = new Map<string, ActivityItem>();
  for (const item of items) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return Array.from(seen.values())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

/** Clean up pooled connections (for tests / hot reload safety). */
export async function closeClients(): Promise<void> {
  if (_agentClient) {
    await _agentClient.close();
    _agentClient = null;
  }
  if (_appServer) {
    _appServer.close();
    _appServer = null;
  }
  _appServerConnect = null;
}
