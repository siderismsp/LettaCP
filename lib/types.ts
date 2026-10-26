/**
 * Shared types used across server API routes and client components.
 */

/** A single memory file in an agent's git-backed memory store (MemFS). */
export interface MemoryFile {
  relative_path: string;
  is_system: boolean;
  description: string | null;
  content: string;
  size: number;
  references?: string[];
  kind?: "markdown" | "image";
  mime_type?: string | null;
}

/** A memory file grouped with its owning agent (used by the matrix / map). */
export interface MemoryFileWithAgent extends MemoryFile {
  agentId: string;
  agentName: string;
}

/** Minimal tool info surfaced from agent state for the registry / map. */
export interface ToolInfo {
  id: string;
  name: string;
  description?: string | null;
}

/** Clean agent shape returned by the dashboard API (decoupled from SDK types). */
export interface AgentView {
  id: string;
  name: string;
  description?: string | null;
  model?: string | null;
  system?: string;
  tags: string[];
  tools: ToolInfo[];
}

/** A shared knowledge file fanned out to all agents' memory. */
export interface SharedFile {
  name: string;
  description: string;
  content: string;
  agentIds: string[];
}

/** A normalized activity item (step / tool execution) for an agent. */
export interface ActivityItem {
  id: string;
  agentId: string;
  conversationId: string;
  type:
    | "assistant"
    | "tool_call"
    | "tool_result"
    | "reasoning"
    | "user"
    | "system";
  timestamp: string;
  summary: string;
  toolName?: string;
}

