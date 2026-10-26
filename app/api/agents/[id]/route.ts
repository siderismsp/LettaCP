import { NextResponse } from "next/server";
import { getAgent, updateAgent, toAgentView } from "@/lib/letta-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const agent = await getAgent(id);
    return NextResponse.json(toAgentView(agent));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      model?: string;
      system?: string;
    };
    const agent = await updateAgent(id, {
      name: body.name,
      description: body.description,
      model: body.model,
      system: body.system,
    });
    return NextResponse.json(toAgentView(agent));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
