import { NextResponse } from "next/server";
import { listAgents, listAgentMemory } from "@/lib/letta-server";
import { listSharedFiles } from "@/lib/shared-memory";

export async function GET() {
  try {
    const agents = await listAgents();
    const sharedFiles = await listSharedFiles();

    const agentMemory: Record<
      string,
      { name: string; files: { path: string; content: string; size: number }[] }
    > = {};

    await Promise.all(
      agents.map(async (agent) => {
        try {
          const files = await listAgentMemory(agent.id);
          agentMemory[agent.id] = {
            name: agent.name || agent.id,
            files: files.map((f) => ({
              path: f.relative_path,
              content: f.content,
              size: f.size,
            })),
          };
        } catch {
          agentMemory[agent.id] = { name: agent.name || agent.id, files: [] };
        }
      }),
    );

    const snapshot = {
      generatedAt: new Date().toISOString(),
      agentCount: agents.length,
      sharedFiles,
      agents: agentMemory,
    };

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const json = JSON.stringify(snapshot, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="letta-memory-snapshot-${stamp}.json"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
