import {
  getAgent,
  getAppServerClient,
  listAgentMemory,
  listAgents,
  updateAgent,
  writeMemoryFile,
} from "./letta-server";

/**
 * SERVER-ONLY. Shared knowledge files that are fanned out to every agent's
 * git-backed memory (MemFS) so all agents carry the same shared context.
 *
 * Letta Code's MemFS rules (verified live):
 *  - `shared/MEMORY.md` is a frontmatter-free index file that makes the
 *    `shared/` directory a memory directory.
 *  - Every other Markdown file in it requires YAML frontmatter with `name`
 *    and `description`.
 */

export interface SharedFile {
  name: string;
  description: string;
  content: string;
  agentIds: string[];
}

interface DeleteMemoryFileResponse {
  type: "delete_memory_file_response";
  request_id: string;
  agent_id: string;
  path: string;
  success: boolean;
  committed?: boolean;
  commit_sha?: string;
  error?: string;
}

function buildSharedIndex(names: string[]): string {
  const lines = names.map((n) => `- ${n}.md`);
  return `# Shared Memory Index\n\n${lines.join("\n")}\n`;
}

function buildSharedFileContent(
  name: string,
  description: string,
  content: string,
): string {
  const desc = description?.trim() || "Shared knowledge";
  return `---\nname: ${name}\ndescription: ${desc}\n---\n\n${content}\n`;
}

async function getAllAgentIds(): Promise<string[]> {
  const agents = await listAgents();
  return agents.map((a) => a.id);
}

/** Aggregate the shared/ memory files present across all agents. */
export async function listSharedFiles(): Promise<SharedFile[]> {
  const agents = await listAgents();
  const map = new Map<string, SharedFile>();
  for (const agent of agents) {
    try {
      const files = await listAgentMemory(agent.id);
      for (const f of files) {
        if (!f.relative_path.startsWith("shared/")) continue;
        if (f.relative_path === "shared/MEMORY.md") continue;
        const name = f.relative_path
          .replace("shared/", "")
          .replace(/\.md$/, "");
        const entry = map.get(name) ?? {
          name,
          description: f.description ?? "",
          content: f.content,
          agentIds: [],
        };
        if (f.description && !entry.description) entry.description = f.description;
        if (!entry.agentIds.includes(agent.id)) entry.agentIds.push(agent.id);
        map.set(name, entry);
      }
    } catch {
      // skip agents whose memory can't be read
    }
  }
  return Array.from(map.values());
}

/** Create or update a shared knowledge file and push it to every agent. */
export async function writeSharedFile(
  name: string,
  description: string,
  content: string,
  addToPrompts = false,
): Promise<SharedFile> {
  const agentIds = await getAllAgentIds();
  const existing = await listSharedFiles();
  const names = Array.from(new Set([...existing.map((f) => f.name), name])).sort();
  const index = buildSharedIndex(names);
  const fileContent = buildSharedFileContent(name, description, content);

  for (const agentId of agentIds) {
    await writeMemoryFile(agentId, "shared/MEMORY.md", index);
    await writeMemoryFile(agentId, `shared/${name}.md`, fileContent);
  }

  if (addToPrompts) {
    await addPromptReference(agentIds, name);
  }

  return { name, description, content, agentIds };
}

function buildPromptReference(name: string): string {
  return `\n\n### Shared Knowledge\nRefer to \`shared/${name}.md\` for shared project knowledge before answering.\n`;
}

/** Append a reference to the shared file in each agent's system prompt. */
async function addPromptReference(agentIds: string[], name: string): Promise<void> {
  const ref = buildPromptReference(name);
  for (const agentId of agentIds) {
    try {
      const agent = await getAgent(agentId);
      const system = agent.system ?? "";
      // Avoid duplicating the reference if it's already present.
      if (system.includes(`shared/${name}.md`)) continue;
      await updateAgent(agentId, { system: system + ref });
    } catch {
      // skip agents whose prompt couldn't be updated
    }
  }
}

/** Remove a shared knowledge file from every agent and rebuild the index. */
export async function deleteSharedFile(name: string): Promise<void> {
  const agentIds = await getAllAgentIds();
  const existing = await listSharedFiles();
  const remaining = existing
    .filter((f) => f.name !== name)
    .map((f) => f.name)
    .sort();
  const index = buildSharedIndex(remaining);

  const client = await getAppServerClient();
  for (const agentId of agentIds) {
    // Rebuild the index first so the file is no longer referenced.
    await writeMemoryFile(agentId, "shared/MEMORY.md", index);
    // Then remove the file itself.
    const res = await client.request<DeleteMemoryFileResponse>(
      {
        type: "delete_memory_file",
        request_id: client.nextRequestId("delete-memory-file"),
        agent_id: agentId,
        path: `shared/${name}.md`,
      },
      {
        predicate: (m): m is DeleteMemoryFileResponse =>
          m.type === "delete_memory_file_response",
      },
    );
    if (!res.success) {
      throw new Error(res.error ?? "Failed to delete shared file");
    }

    // If no shared files remain, remove the now-empty index too.
    if (remaining.length === 0) {
      const res2 = await client.request<DeleteMemoryFileResponse>(
        {
          type: "delete_memory_file",
          request_id: client.nextRequestId("delete-memory-file"),
          agent_id: agentId,
          path: "shared/MEMORY.md",
        },
        {
          predicate: (m): m is DeleteMemoryFileResponse =>
            m.type === "delete_memory_file_response",
        },
      );
      if (!res2.success) {
        throw new Error(res2.error ?? "Failed to remove shared index");
      }
    }
  }
}
