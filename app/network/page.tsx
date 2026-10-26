"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { NodeMouseHandler } from "@xyflow/react";
import { useNetwork } from "@/lib/hooks";
import { PageHeader, Spinner, ErrorState, EmptyState } from "@/components/ui";
import { NetworkDrawer } from "@/components/NetworkDrawer";
import type { NetworkNode } from "@/components/nodes";

const NetworkMap = dynamic(
  () => import("@/components/NetworkMap").then((m) => m.NetworkMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Spinner label="Loading network map…" />
      </div>
    ),
  },
);

export default function NetworkPage() {
  const {
    data,
    loading,
    error,
    refetch,
  } = useNetwork();
  const [selected, setSelected] = useState<NetworkNode | null>(null);

  const hasGraph = !!data && (data.agents.length > 0 || Object.keys(data.memories).length > 0);

  const onNodeClick: NodeMouseHandler<NetworkNode> = useMemo(
    () => (_, node) => {
      if (node.type === "ring") return; // ignore decorative orbital tracks
      setSelected(node);
    },
    [],
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Network Map"
        description="Visualize agents, memory blocks, and tool bindings on the Letta App Server."
      />

      {loading && <Spinner label="Loading agents…" />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}
      {!loading && !error && !hasGraph && (
        <EmptyState
          title="No agents to visualize"
          description="The App Server returned no agents."
        />
      )}
      {!loading && !error && data && hasGraph && (
        <NetworkMap
          agents={data.agents}
          memories={data.memories}
          onNodeClick={onNodeClick}
        />
      )}

      <NetworkDrawer
        node={selected}
        onClose={() => setSelected(null)}
        onSaved={() => refetch()}
      />
    </div>
  );
}
