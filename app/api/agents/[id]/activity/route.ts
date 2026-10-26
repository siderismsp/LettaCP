import { NextRequest } from "next/server";
import { getAgentActivity, type ActivityItem } from "@/lib/letta-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const state: {
    interval: ReturnType<typeof setInterval> | null;
    closed: boolean;
    lastIds: Set<string>;
  } = { interval: null, closed: false, lastIds: new Set() };

  const send = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    data: unknown,
    event = "activity",
  ) => {
    if (state.closed) return;
    controller.enqueue(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
    );
  };

  const poll = async (
    controller: ReadableStreamDefaultController<Uint8Array>,
  ) => {
    try {
      const items = await getAgentActivity(id);
      const fresh = items.filter((i) => !state.lastIds.has(i.id));
      state.lastIds = new Set(items.map((i) => i.id));
      send(controller, { items: fresh, all: items });
    } catch (err) {
      send(controller, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        if (state.closed) return;
        state.closed = true;
        if (state.interval) clearInterval(state.interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      req.signal.addEventListener("abort", cleanup);

      send(controller, { connected: true });
      void poll(controller);
      state.interval = setInterval(() => void poll(controller), 3000);
    },
    cancel() {
      state.closed = true;
      if (state.interval) clearInterval(state.interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// Re-export the shape so consumers can import the type from this module.
export type { ActivityItem };
