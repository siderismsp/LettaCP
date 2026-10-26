"use client";

import { useMemo, useState } from "react";
import { FileText, Boxes, Download } from "lucide-react";
import { useNetwork } from "@/lib/hooks";
import { SharedKnowledgePanel } from "@/components/SharedKnowledgePanel";
import type { MemoryFile } from "@/lib/types";
import {
  PageHeader,
  Spinner,
  ErrorState,
  EmptyState,
  Badge,
  Card,
} from "@/components/ui";
import { formatBytes } from "@/lib/utils";

interface MemoryRow {
  agentId: string;
  agentName: string;
  file: MemoryFile;
}

export default function BlocksPage() {
  const {
    data,
    loading,
    error,
    refetch,
  } = useNetwork();
  const [agentFilter, setAgentFilter] = useState<string>("all");

  const rows = useMemo<MemoryRow[]>(() => {
    if (!data) return [];
    return data.agents.flatMap((agent) =>
      (data.memories[agent.id] ?? []).map((file) => ({
        agentId: agent.id,
        agentName: agent.name || agent.id,
        file,
      })),
    );
  }, [data]);

  const filtered =
    agentFilter === "all" ? rows : rows.filter((r) => r.agentId === agentFilter);

  const totalChars = filtered.reduce(
    (sum, r) => sum + (r.file.content?.length ?? 0),
    0,
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Memory Block Matrix"
        description="Shared memory files across all agents, aggregated from their git-backed memory stores."
        actions={
          <div className="flex items-center gap-2">
            {data && data.agents.length > 0 && (
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
              >
                <option value="all">All agents</option>
                {data.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.id}
                  </option>
                ))}
              </select>
            )}
            <a
              href="/api/snapshot"
              download
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]"
            >
              <Download className="h-4 w-4" /> Backup Snapshots
            </a>
          </div>
        }
      />

      <div className="mb-6">
        <SharedKnowledgePanel />
      </div>

      {loading && <Spinner label="Loading memory files…" />}
      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Memory files" value={filtered.length} />
            <Stat label="Total characters" value={totalChars.toLocaleString()} />
            <Stat label="Agents" value={data.agents.length} />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No memory files"
              description="No git-backed memory files found for the selected agents."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-surface-2)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Agent</th>
                    <th className="px-4 py-3 font-medium">Memory file</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Content</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filtered.map((row) => (
                    <tr
                      key={`${row.agentId}-${row.file.relative_path}`}
                      className="align-top"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-[var(--color-foreground)]">
                          {row.agentName}
                        </span>
                        <span className="block font-mono text-[11px] text-[var(--color-subtle)]">
                          {row.agentId}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                          <span className="font-mono text-xs text-[var(--color-foreground)]">
                            {row.file.relative_path}
                          </span>
                          {row.file.is_system && <Badge>system</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--color-muted)]">
                        {row.file.content.length.toLocaleString()} chars ·{" "}
                        {formatBytes(row.file.size)}
                      </td>
                      <td className="px-4 py-3">
                        <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--color-bg)] p-2 text-xs leading-relaxed text-[var(--color-muted)]">
                          {row.file.content || "(empty)"}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-block-core)]/20 text-[var(--color-block-core)]">
        <Boxes className="h-5 w-5" />
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
