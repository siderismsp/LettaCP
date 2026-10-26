"use client";

import Link from "next/link";
import { Bot, Boxes, Wrench, Network, ArrowRight } from "lucide-react";
import { useAgents } from "@/lib/hooks";
import { Card, PageHeader, Spinner, ErrorState } from "@/components/ui";

export default function DashboardPage() {
  const { data: agents, loading, error, refetch } = useAgents();

  const toolCount = agents?.reduce(
    (sum, a) => sum + (a.tools?.length ?? 0),
    0,
  );

  const stats = [
    { label: "Agents", value: agents?.length ?? 0, icon: Bot, color: "agent" },
    { label: "Tool bindings", value: toolCount ?? 0, icon: Wrench, color: "tool" },
    { label: "Memory files", value: "—", icon: Boxes, color: "block" },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Overview"
        description="Administrative control panel for the self-hosted Letta App Server."
      />

      {loading && <Spinner label="Connecting to App Server…" />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((s) => {
              const Icon = s.icon;
              const colorVar =
                s.color === "agent"
                  ? "var(--color-agent)"
                  : s.color === "tool"
                    ? "var(--color-tool)"
                    : "var(--color-block-core)";
              return (
                <Card key={s.label} className="flex items-center gap-4">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${colorVar}22`, color: colorVar }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[var(--color-foreground)]">
                      {s.value}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {s.label}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { href: "/agents", label: "Agents", desc: "Inspect and edit agent state", icon: Bot },
              { href: "/blocks", label: "Memory Blocks", desc: "View memory files across agents", icon: Boxes },
              { href: "/tools", label: "Tools & Registry", desc: "Tool bindings per agent", icon: Wrench },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface-2)]"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-[var(--color-accent)]" />
                    <ArrowRight className="h-4 w-4 text-[var(--color-subtle)] transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-foreground)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {item.desc}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <Network className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent-2)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                Network Map
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Visualize agents, memory blocks, and tool bindings as an
                interactive graph.
              </p>
              <Link
                href="/network"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                Open network map <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
