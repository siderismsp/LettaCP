"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Cpu, Save, Wrench, FileText, Check, Pencil, X } from "lucide-react";
import { useAgent, useAgentMemory } from "@/lib/hooks";
import { updateAgentRemote, updateMemoryFile } from "@/lib/api";
import { PageHeader, Spinner, ErrorState, EmptyState, Badge } from "@/components/ui";
import { ModelDropdown } from "@/components/ModelDropdown";
import { ActivityPanel } from "@/components/ActivityPanel";
import { cn, formatBytes } from "@/lib/utils";
import type { AgentView, MemoryFile } from "@/lib/types";

export default function AgentInspectorPage() {
  const params = useParams<{ id: string }>();
  const agentId = params?.id;

  const {
    data: agent,
    loading,
    error,
    refetch,
  } = useAgent(agentId);
  const {
    data: memory,
    loading: memoryLoading,
    error: memoryError,
    refetch: refetchMemory,
  } = useAgentMemory(agentId);

  // Dual-mode: core memory (system/*) vs file-based MemFS.
  const coreFiles = (memory ?? []).filter((f) =>
    f.relative_path.startsWith("system/"),
  );
  const fileFiles = (memory ?? []).filter(
    (f) => !f.relative_path.startsWith("system/"),
  );

  if (loading) return <Spinner label="Loading agent…" />;
  if (error || !agent) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="p-6">
      <Link
        href="/agents"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>

      <PageHeader
        title={agent.name || agent.id}
        description={`Agent ID: ${agent.id}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AgentForm key={agent.id} agent={agent} onSaved={refetch} />

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            Details
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <MetaRow label="Model">
              {agent.model ? (
                <Badge className="gap-1">
                  <Cpu className="h-3 w-3" /> {agent.model}
                </Badge>
              ) : (
                <span className="text-[var(--color-subtle)]">—</span>
              )}
            </MetaRow>
            <MetaRow label="Tools">
              <Badge className="gap-1">
                <Wrench className="h-3 w-3" /> {agent.tools?.length ?? 0}
              </Badge>
            </MetaRow>
            <MetaRow label="Tags">
              <div className="flex flex-wrap gap-1">
                {(agent.tags ?? []).map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
                {(agent.tags ?? []).length === 0 && (
                  <span className="text-[var(--color-subtle)]">—</span>
                )}
              </div>
            </MetaRow>
          </dl>
        </section>
      </div>
      {/* Memory: dual-mode (core blocks + file workspace) */}
      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            Memory
          </h2>
          <button
            onClick={refetchMemory}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            Refresh
          </button>
        </div>

        {memoryLoading && <Spinner label="Loading memory…" />}
        {!memoryLoading && memoryError && (
          <p className="mt-3 text-xs text-red-400">{memoryError.message}</p>
        )}
        {!memoryLoading && !memoryError && (memory?.length ?? 0) === 0 && (
          <EmptyState
            title="No memory files"
            description="This agent has no git-backed memory files yet."
          />
        )}

        {!memoryLoading && !memoryError && (memory?.length ?? 0) > 0 && (
          <>
            {coreFiles.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-subtle)]">
                  Core Memory
                </h3>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {coreFiles.map((f) => (
                    <CoreMemoryEditor
                      key={f.relative_path}
                      file={f}
                      agentId={agent.id}
                      onSaved={refetchMemory}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-subtle)]">
                Memory Files ({fileFiles.length})
              </h3>
              {fileFiles.length === 0 ? (
                <p className="text-xs text-[var(--color-subtle)]">
                  No additional memory files.
                </p>
              ) : (
                <div className="space-y-3">
                  {fileFiles.map((f) => (
                    <MemoryBlockCard
                      key={f.relative_path}
                      file={f}
                      agentId={agent.id}
                      onSaved={refetchMemory}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Bound tools */}
      <section className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
          Bound Tools
        </h2>
        {!agent.tools || agent.tools.length === 0 ? (
          <EmptyState
            title="No tools bound"
            description="This agent currently has no tools attached."
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {agent.tools!.map((tool) => (
              <div
                key={tool.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
              >
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {tool.name ?? tool.id}
                </p>
                {tool.description && (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {tool.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6">
        <ActivityPanel agentId={agent.id} />
      </div>
    </div>
  );
}

function AgentForm({
  agent,
  onSaved,
}: {
  agent: AgentView;
  onSaved: () => void;
}) {
  const [name, setName] = useState(agent.name ?? "");
  const [description, setDescription] = useState(agent.description ?? "");
  const [model, setModel] = useState(agent.model ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const dirty =
    name !== (agent.name ?? "") ||
    description !== (agent.description ?? "") ||
    model !== (agent.model ?? "");

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await updateAgentRemote(agent.id, { name, description, model });
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:col-span-2">
      <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
        Agent Settings
      </h2>
      <div className="mt-4 space-y-4">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Agent name"
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(inputClass, "min-h-[80px] resize-y")}
            placeholder="What this agent does"
          />
        </Field>
        <Field label="Model">
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputClass}
            placeholder="provider/model-name"
          />
          <div className="mt-2">
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Or pick from Ollama
            </label>
            <ModelDropdown
              onSelectModel={(name) => setModel(`ollama/${name}`)}
            />
          </div>
        </Field>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Spinner label="" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving…" : saved ? "Saved" : "Save Changes"}
          </button>
          {saveError && (
            <p className="text-xs text-red-400">{saveError.message}</p>
          )}
        </div>
      </div>
    </section>
  );
}

const inputClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-accent)]";

function CoreMemoryEditor({
  file,
  agentId,
  onSaved,
}: {
  file: MemoryFile;
  agentId: string;
  onSaved: () => void;
}) {
  const label = file.relative_path
    .replace("system/", "")
    .replace(/\.md$/, "");
  const [draft, setDraft] = useState(file.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateMemoryFile(agentId, file.relative_path, draft);
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold uppercase tracking-wide text-[var(--color-foreground)]">
          {label}
        </span>
        <span className="font-mono text-[10px] text-[var(--color-subtle)]">
          {draft.length} chars
        </span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="mt-2 min-h-[120px] w-full resize-y rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 font-mono text-xs leading-relaxed text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent)]"
        spellCheck={false}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving || draft === file.content}
          className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--color-accent)] px-3 py-1.5 font-mono text-xs text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <span>Saving…</span> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? "Saved" : "Save"}
        </button>
        {error && <p className="text-xs text-red-400">{error.message}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="text-right text-[var(--color-foreground)]">{children}</dd>
    </div>
  );
}

function MemoryBlockCard({
  file,
  agentId,
  onSaved,
}: {
  file: { relative_path: string; content: string; size: number; is_system: boolean };
  agentId: string;
  onSaved: () => void;
}) {
  const isSystem = file.is_system;
  const isStub =
    !file.content.trim() || /^#\s+\w+\s*$/.test(file.content.trim());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(file.content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateMemoryFile(agentId, file.relative_path, draft);
      setSaved(true);
      onSaved();
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--color-muted)]" />
          <span className="font-mono text-sm text-[var(--color-foreground)]">
            {file.relative_path}
          </span>
          {isSystem && <Badge>system</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-subtle)]">
            {editing
              ? `${draft.length.toLocaleString()} chars`
              : `${file.content.length.toLocaleString()} chars · ${formatBytes(file.size)}`}
          </span>
          {!editing && (
            <button
              onClick={() => {
                setDraft(file.content);
                setEditing(true);
                setError(null);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={cn(inputClass, "min-h-[140px] resize-y font-mono text-xs leading-relaxed")}
            spellCheck={false}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || draft === file.content}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Spinner label="" />
              ) : saved ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            {error && <p className="text-xs text-red-400">{error.message}</p>}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--color-bg)] p-3 text-xs leading-relaxed text-[var(--color-muted)]">
            {file.content || "(empty)"}
          </pre>
          {isStub && (
            <p className="mt-2 font-mono text-[10px] text-[var(--color-subtle)]">
              default memory index — click Edit to add content.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

