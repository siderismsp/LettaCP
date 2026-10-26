"use client";

import { useRef, useEffect } from "react";
import {
  Bot,
  Wrench,
  CheckCircle2,
  Brain,
  User,
  Activity,
} from "lucide-react";
import { useActivity } from "@/lib/hooks";
import type { ActivityItem } from "@/lib/types";
import { EmptyState, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

function itemIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "assistant":
      return <Bot className="h-3.5 w-3.5" />;
    case "tool_call":
      return <Wrench className="h-3.5 w-3.5" />;
    case "tool_result":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "reasoning":
      return <Brain className="h-3.5 w-3.5" />;
    case "user":
      return <User className="h-3.5 w-3.5" />;
    default:
      return <Activity className="h-3.5 w-3.5" />;
  }
}

function itemColor(type: ActivityItem["type"]) {
  switch (type) {
    case "assistant":
      return "text-[var(--color-accent)]";
    case "tool_call":
      return "text-[var(--color-tool)]";
    case "tool_result":
      return "text-[var(--color-block-core)]";
    case "reasoning":
      return "text-[var(--color-accent-2)]";
    case "user":
      return "text-[var(--color-muted)]";
    default:
      return "text-[var(--color-muted)]";
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ActivityPanel({ agentId }: { agentId: string }) {
  const { items, connected, error } = useActivity(agentId);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [items.length]);

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            Live Activity
          </h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Recent steps and tool executions streamed from the App Server.
          </p>
        </div>
        <Badge
          className={cn(
            "gap-1.5",
            connected
              ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-300"
              : "border-red-600/40 bg-red-600/10 text-red-300",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              connected ? "bg-emerald-400" : "bg-red-400",
            )}
          />
          {connected ? "Live" : "Offline"}
        </Badge>
      </div>

      <div ref={listRef} className="mt-4 max-h-72 space-y-1 overflow-y-auto pr-1">
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!error && items.length === 0 && (
          <EmptyState
            title="No activity yet"
            description="Agent steps will appear here as the agent runs."
          />
        )}
        {items.map((item) => {
          const Icon = itemIcon(item.type);
          return (
            <div
              key={item.id}
              className="flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-2)]"
            >
              <span className={cn("mt-0.5 shrink-0", itemColor(item.type))}>
                {Icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--color-foreground)]">
                  {item.summary}
                </p>
                {item.toolName && (
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--color-subtle)]">
                    {item.toolName}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-mono text-[10px] text-[var(--color-subtle)]">
                {formatTime(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
