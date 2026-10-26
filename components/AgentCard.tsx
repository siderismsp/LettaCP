"use client";

import Link from "next/link";
import { Bot, Cpu, ChevronRight } from "lucide-react";
import type { AgentView } from "@/lib/types";
import { Badge, StatusDot } from "@/components/ui";
import { truncate } from "@/lib/utils";

export function AgentCard({ agent }: { agent: AgentView }) {
  const toolCount = agent.tools?.length ?? 0;

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group flex flex-col rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <Bot className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          </span>
          <StatusDot status="ok" />
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--color-subtle)] transition-transform group-hover:translate-x-0.5" />
      </div>

      <h3 className="mt-3 font-mono text-sm font-semibold text-[var(--color-foreground)]">
        {agent.name || agent.id}
      </h3>
      <p className="mt-0.5 break-all font-mono text-[11px] text-[var(--color-subtle)]">
        {agent.id}
      </p>

      {agent.model && (
        <p className="mt-2 truncate font-mono text-[11px] text-[var(--color-muted)]">
          {agent.model}
        </p>
      )}
      {agent.description && (
        <p className="mt-1 line-clamp-2 font-mono text-[11px] text-[var(--color-muted)]">
          {truncate(agent.description, 140)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge className="gap-1">
          <Cpu className="h-3 w-3" />
          <span className="max-w-[160px] truncate">{toolCount} tools</span>
        </Badge>
        {(agent.tags ?? []).slice(0, 2).map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </Link>
  );
}

