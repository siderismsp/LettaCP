"use client";

import { useAgents } from "@/lib/hooks";
import { AgentCard } from "@/components/AgentCard";
import { PageHeader, Spinner, ErrorState, EmptyState } from "@/components/ui";

export default function AgentsPage() {
  const { data, loading, error, refetch } = useAgents();

  return (
    <div className="p-6">
      <PageHeader
        title="Agents"
        description="Provisioned agents on the Letta App Server. Select an agent to inspect its state and memory."
      />

      {loading && <Spinner label="Loading agents…" />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState
          title="No agents found"
          description="The App Server returned zero agents."
        />
      )}
      {!loading && !error && (data?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data!.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
