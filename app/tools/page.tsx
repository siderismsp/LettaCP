"use client";

import { useMemo } from "react";
import { Wrench } from "lucide-react";
import { useAgents } from "@/lib/hooks";
import { PageHeader, Spinner, ErrorState, EmptyState, Badge, Card } from "@/components/ui";

interface ToolBinding {
  toolId: string;
  toolName: string;
  toolDescription?: string | null;
  agents: { id: string; name: string }[];
}

export default function ToolsPage() {
  const { data: agents, loading, error, refetch } = useAgents();

  const bindings = useMemo<ToolBinding[]>(() => {
    if (!agents) return [];
    const map = new Map<string, ToolBinding>();
    for (const agent of agents) {
      for (const tool of agent.tools ?? []) {
        const entry = map.get(tool.id) ?? {
          toolId: tool.id,
          toolName: tool.name ?? tool.id,
          toolDescription: tool.description,
          agents: [],
        };
        entry.agents.push({ id: agent.id, name: agent.name || agent.id });
        map.set(tool.id, entry);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.toolName.localeCompare(b.toolName),
    );
  }, [agents]);

  const totalBindings = bindings.reduce((sum, b) => sum + b.agents.length, 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Tool Registry"
        description="Tools available to agents and which agents they are bound to."
      />

      {loading && <Spinner label="Loading agents…" />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Unique tools" value={bindings.length} />
            <Stat label="Total bindings" value={totalBindings} />
            <Stat label="Agents" value={agents?.length ?? 0} />
          </div>

          {bindings.length === 0 ? (
            <EmptyState
              title="No tools registered"
              description="No tools are currently bound to any agent on this App Server."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {bindings.map((binding) => (
                <Card key={binding.toolId}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-tool)]/20 text-[var(--color-tool)]">
                      <Wrench className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">
                        {binding.toolName}
                      </p>
                      <p className="break-all font-mono text-[11px] text-[var(--color-subtle)]">
                        {binding.toolId}
                      </p>
                      {binding.toolDescription && (
                        <p className="mt-2 text-xs text-[var(--color-muted)]">
                          {binding.toolDescription}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-subtle)]">
                      Bound to {binding.agents.length} agent
                      {binding.agents.length === 1 ? "" : "s"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {binding.agents.map((a) => (
                        <Badge key={a.id}>{a.name}</Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-tool)]/20 text-[var(--color-tool)]">
        <Wrench className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-semibold text-[var(--color-foreground)]">
          {value}
        </p>
        <p className="text-xs text-[var(--color-muted)]">{label}</p>
      </div>
    </Card>
  );
}
