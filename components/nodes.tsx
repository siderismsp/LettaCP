"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Bot, FileText, Wrench, Server } from "lucide-react";
import type { AgentView, MemoryFile } from "@/lib/types";

export type CoreNodeData = { label: string };
export type AgentNodeData = { agent: AgentView };
export type MemoryNodeData = {
  agentId: string;
  agentName: string;
  file: MemoryFile;
};
export type ToolNodeData = {
  toolId: string;
  toolName: string;
  agentIds: string[];
};
export type RingNodeData = { radius: number };

export type NetworkNode =
  | Node<CoreNodeData, "core">
  | Node<AgentNodeData, "agent">
  | Node<MemoryNodeData, "memory">
  | Node<ToolNodeData, "tool">
  | Node<RingNodeData, "ring">;

/** Concentric dashed orbital track (non-interactive). */
export function RingNode({ data }: NodeProps<Node<RingNodeData>>) {
  const r = data.radius;
  return (
    <div
      className="pointer-events-none rounded-full border border-dashed"
      style={{
        width: r * 2,
        height: r * 2,
        borderColor: "#30363d",
        borderWidth: 1,
        boxSizing: "border-box",
      }}
    />
  );
}

export function CoreNode({ data }: NodeProps<Node<CoreNodeData>>) {
  return (
    <div className="flex flex-col items-center">
      <Handle type="source" position={Position.Top} />
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" position={Position.Left} />
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-cyan-300/90 bg-cyan-400/20"
        style={{
          boxShadow:
            "0 0 30px rgba(34,211,238,0.9), 0 0 70px rgba(34,211,238,0.45), inset 0 0 20px rgba(34,211,238,0.3)",
        }}
      >
        <Server className="h-8 w-8 text-cyan-100" />
      </div>
      <span className="mt-2 w-32 text-center text-[9px] font-semibold uppercase tracking-widest text-cyan-200">
        {data.label}
      </span>
    </div>
  );
}

export function AgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const agent = data.agent;
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} />
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-indigo-400/90 bg-indigo-500/20"
        style={{
          boxShadow:
            "0 0 22px rgba(129,140,248,0.85), 0 0 50px rgba(129,140,248,0.4), inset 0 0 16px rgba(129,140,248,0.3)",
        }}
      >
        <Bot className="h-6 w-6 text-indigo-100" />
      </div>
      <span className="mt-1.5 w-28 truncate text-center font-mono text-[10px] text-indigo-100">
        {agent.name || agent.id}
      </span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function MemoryNode({ data }: NodeProps<Node<MemoryNodeData>>) {
  const file = data.file;
  const color = file.is_system ? "#34d399" : "#a78bfa";
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} />
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full border-2"
        style={{
          borderColor: color,
          backgroundColor: `${color}22`,
          boxShadow: `0 0 16px ${color}cc, 0 0 36px ${color}55`,
        }}
      >
        <FileText className="h-4 w-4" style={{ color }} />
      </div>
      <span className="mt-1 w-24 truncate text-center font-mono text-[9px] text-slate-300">
        {file.relative_path}
      </span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function ToolNode({ data }: NodeProps<Node<ToolNodeData>>) {
  return (
    <div className="flex flex-col items-center">
      <Handle type="target" position={Position.Left} />
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full border-2"
        style={{
          borderColor: "#fbbf24",
          backgroundColor: "#f59e0b22",
          boxShadow: "0 0 16px rgba(251,191,36,0.8), 0 0 36px rgba(251,191,36,0.4)",
        }}
      >
        <Wrench className="h-4 w-4 text-amber-300" />
      </div>
      <span className="mt-1 w-24 truncate text-center font-mono text-[9px] text-amber-200">
        {data.toolName}
      </span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const nodeTypes = {
  core: CoreNode,
  agent: AgentNode,
  memory: MemoryNode,
  tool: ToolNode,
  ring: RingNode,
};
