import { NextResponse } from "next/server";
import { listAgentMemory, listAgents, toAgentView } from "@/lib/letta-server";
import type { MemoryFile } from "@/lib/types";

export async function GET() {
  try {
    const agents = await listAgents();
    const memories: Record<string, MemoryFile[]> = {};
    await Promise.all(
      agents.map(async (agent) => {
        try {
          memories[agent.id] = await listAgentMemory(agent.id);
        } catch {
          memories[agent.id] = [];
        }
      }),
    );
    return NextResponse.json({
      agents: agents.map(toAgentView),
      memories,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
