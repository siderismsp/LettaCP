"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize, LayoutGrid } from "lucide-react";
import type { AgentView, MemoryFile } from "@/lib/types";
import { nodeTypes, type NetworkNode } from "@/components/nodes";

interface NetworkMapProps {
  agents: AgentView[];
  memories: Record<string, MemoryFile[]>;
  onNodeClick?: NodeMouseHandler<NetworkNode>;
}

const CORE = { x: 0, y: 0 };
const AGENT_RADIUS = 300;
const SATELLITE_RADIUS = 520;
const SATELLITE_SPREAD = 0.4; // radians between sibling satellites

function addRing(
  nodes: NetworkNode[],
  radius: number,
  id: string,
): void {
  nodes.push({
    id,
    type: "ring",
    position: { x: -radius, y: -radius },
    data: { radius },
    selectable: false,
    draggable: false,
    focusable: false,
    style: { width: radius * 2, height: radius * 2, pointerEvents: "none" },
  } as NetworkNode);
}

function buildGraph(
  agents: AgentView[],
  memories: Record<string, MemoryFile[]>,
): { nodes: NetworkNode[]; edges: Edge[] } {
  const nodes: NetworkNode[] = [];
  const edges: Edge[] = [];

  // Orbital tracks (dashed rings) behind the planets.
  addRing(nodes, AGENT_RADIUS, "ring-agents");
  addRing(nodes, SATELLITE_RADIUS, "ring-satellites");

  nodes.push({
    id: "core",
    type: "core",
    position: CORE,
    data: { label: "App Server · Shared Ledger" },
  });

  const n = Math.max(agents.length, 1);
  agents.forEach((agent, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const ax = AGENT_RADIUS * Math.cos(angle);
    const ay = AGENT_RADIUS * Math.sin(angle);

    nodes.push({
      id: `agent-${agent.id}`,
      type: "agent",
      position: { x: ax, y: ay },
      data: { agent },
    });
    edges.push({
      id: `e-core-${agent.id}`,
      source: "core",
      target: `agent-${agent.id}`,
      type: "bezier",
      style: {
        stroke: "#22d3ee",
        strokeWidth: 2,
        filter: "drop-shadow(0 0 6px rgba(34,211,238,0.8))",
      },
    });

    const satellites: {
      id: string;
      type: "memory" | "tool";
      color: string;
      file?: MemoryFile;
      tool?: { id: string; name: string };
    }[] = [
      ...(memories[agent.id] ?? []).map((f) => ({
        id: `mem-${agent.id}-${f.relative_path}`,
        type: "memory" as const,
        color: f.is_system ? "#34d399" : "#a78bfa",
        file: f,
      })),
      ...(agent.tools ?? []).map((t) => ({
        id: `tool-${t.id}`,
        type: "tool" as const,
        color: "#fbbf24",
        tool: { id: t.id, name: t.name },
      })),
    ];

    const m = Math.max(satellites.length, 1);
    satellites.forEach((sat, j) => {
      const satAngle = angle + (j - (m - 1) / 2) * SATELLITE_SPREAD;
      const sx = SATELLITE_RADIUS * Math.cos(satAngle);
      const sy = SATELLITE_RADIUS * Math.sin(satAngle);
      nodes.push({
        id: sat.id,
        type: sat.type,
        position: { x: sx, y: sy },
        data:
          sat.type === "memory"
            ? {
                agentId: agent.id,
                agentName: agent.name || agent.id,
                file: sat.file!,
              }
            : {
                toolId: sat.tool!.id,
                toolName: sat.tool!.name,
                agentIds: [agent.id],
              },
      } as NetworkNode);
      edges.push({
        id: `e-${agent.id}-${sat.id}`,
        source: `agent-${agent.id}`,
        target: sat.id,
        type: "bezier",
        style: {
          stroke: sat.color,
          strokeWidth: 1.5,
          filter: `drop-shadow(0 0 4px ${sat.color})`,
        },
      });
    });
  });

  return { nodes, edges };
}

export function NetworkMap({ agents, memories, onNodeClick }: NetworkMapProps) {
  const initial = useMemo(
    () => buildGraph(agents, memories),
    [agents, memories],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<NetworkNode>(
    initial.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [hovered, setHovered] = useState<string | null>(null);

  // Rebuild graph when data changes.
  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // Nodes to keep highlighted (hovered + its direct neighbors).
  // Use the stable base edges (initial.edges) so recomputing the highlight set
  // does not depend on the mutable edges state (which would cause a render loop
  // when the dimming effect below updates edge opacity).
  const highlightSet = useMemo(() => {
    if (!hovered) return null;
    const set = new Set<string>([hovered]);
    for (const e of initial.edges) {
      if (e.source === hovered) set.add(e.target);
      if (e.target === hovered) set.add(e.source);
    }
    return set;
  }, [hovered, initial.edges]);

  // Dim unrelated nodes/edges while hovering (ring tracks stay visible).
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        style: {
          ...(n.style ?? {}),
          opacity:
            n.type === "ring"
              ? 1
              : highlightSet && !highlightSet.has(n.id)
                ? 0.18
                : 1,
        },
      })),
    );
    setEdges((prev) =>
      prev.map((e) => ({
        ...e,
        style: {
          ...(e.style ?? {}),
          opacity:
            highlightSet && !(e.source === hovered || e.target === hovered)
              ? 0.12
              : 1,
        },
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightSet, hovered]);

  return (
    <div className="galaxy-scene relative h-[calc(100vh-10rem)] w-full overflow-hidden rounded-xl border border-[var(--color-border)]">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={(_, node) => setHovered(node.id)}
        onNodeMouseLeave={() => setHovered(null)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background gap={0} color="transparent" />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            if (n.type === "ring") return "transparent";
            if (n.type === "core") return "#22d3ee";
            if (n.type === "agent") return "#818cf8";
            if (n.type === "memory")
              return (n.data as { file: MemoryFile }).file.is_system
                ? "#34d399"
                : "#a78bfa";
            return "#fbbf24";
          }}
          maskColor="rgba(2,4,9,0.75)"
          style={{ backgroundColor: "#05070d" }}
        />
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={() => {
              setNodes(initial.nodes);
              setEdges(initial.edges);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Auto-layout
          </button>
          <button
            onClick={() => {
              setNodes(initial.nodes);
              setEdges(initial.edges);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]"
          >
            <Maximize className="h-3.5 w-3.5" /> Reset
          </button>
        </Panel>
        <Panel position="bottom-left">
          <div className="flex flex-wrap gap-2 text-[10px]">
            <Legend color="#22d3ee" label="App Server" />
            <Legend color="#818cf8" label="Agent" />
            <Legend color="#34d399" label="Core memory" />
            <Legend color="#a78bfa" label="Shared memory" />
            <Legend color="#fbbf24" label="Tool" />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-2 py-0.5 text-[var(--color-muted)]">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      {label}
    </span>
  );
}

