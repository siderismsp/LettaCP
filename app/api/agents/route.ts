import { NextResponse } from "next/server";
import { listAgents, toAgentView } from "@/lib/letta-server";

export async function GET() {
  try {
    const agents = await listAgents();
    return NextResponse.json(agents.map(toAgentView));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
