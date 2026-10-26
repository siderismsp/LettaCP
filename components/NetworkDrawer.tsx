"use client";

import { useState } from "react";
import { X, Bot, FileText, Wrench, Save, Check, Pencil, Server } from "lucide-react";
import { updateAgentRemote, updateMemoryFile } from "@/lib/api";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { NetworkNode } from "@/components/nodes";

interface NetworkDrawerProps {
  node: NetworkNode | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function NetworkDrawer({ node, onClose, onSaved }: NetworkDrawerProps) {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-[380px] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            {node.type === "agent"
              ? "Agent"
              : node.type === "memory"
                ? "Memory Block"
                : node.type === "tool"
                  ? "Tool"
                  : "Core"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {node.type === "core" && <CoreDrawerContent node={node} />}
          {node.type === "agent" && (
            <AgentDrawerContent key={node.data.agent.id} node={node} onSaved={onSaved} />
          )}
          {node.type === "memory" && (
            <MemoryDrawerContent node={node} onSaved={onSaved} />
          )}
          {node.type === "tool" && <ToolDrawerContent node={node} />}
        </div>
      </div>
    </div>
  );
}

function CoreDrawerContent({
  node,
}: {
  node: Extract<NetworkNode, { type: "core" }>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
          <Server className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {node.data.label}
          </p>
          <p className="text-[11px] text-[var(--color-muted)]">
            Central core / shared ledger
          </p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-[var(--color-muted)]">
        The central anchor of the network. Agents orbit this node and share
        state through their git-backed memory (MemFS). Click an agent, memory
        block, or tool node to inspect it.
      </p>
    </div>
  );
}

function AgentDrawerContent({
  node,
  onSaved,
}: {
  node: Extract<NetworkNode, { type: "agent" }>;
  onSaved?: () => void;
}) {
  const agent = node.data.agent;
  const [name, setName] = useState(agent.name ?? "");
  const [description, setDescription] = useState(agent.description ?? "");
  const [model, setModel] = useState(agent.model ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await updateAgentRemote(agent.id, { name, description, model });
      setSaved(true);
      onSaved?.();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-agent)]/20 text-[var(--color-agent)]">
          <Bot className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {agent.name || agent.id}
          </p>
          <p className="break-all font-mono text-[11px] text-[var(--color-subtle)]">
            {agent.id}
          </p>
        </div>
      </div>

      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} min-h-[80px] resize-y`}
        />
      </Field>
      <Field label="Model">
        <input value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} />
      </Field>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:opacity-50"
        >
          {saving ? (
            <span className="text-xs">Saving…</span>
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Saved" : "Save Changes"}
        </button>
        {saveError && <p className="text-xs text-red-400">{saveError.message}</p>}
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-subtle)]">
          Tags
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(agent.tags ?? []).map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
          {(agent.tags ?? []).length === 0 && (
            <span className="text-xs text-[var(--color-subtle)]">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MemoryDrawerContent({
  node,
  onSaved,
}: {
  node: Extract<NetworkNode, { type: "memory" }>;
  onSaved?: () => void;
}) {
  const file = node.data.file;
  const agentId = node.data.agentId;
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
      setEditing(false);
      onSaved?.();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-block-core)]/20 text-[var(--color-block-core)]">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-[var(--color-foreground)]">
              {file.relative_path}
            </p>
            <p className="text-[11px] text-[var(--color-muted)]">
              {node.data.agentName}
            </p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={() => {
              setDraft(file.content);
              setEditing(true);
              setError(null);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {file.is_system && <Badge>system</Badge>}
        {file.kind && <Badge>{file.kind}</Badge>}
        <Badge>
          {(editing ? draft : file.content).length.toLocaleString()} chars
        </Badge>
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={cn(
              inputClass,
              "min-h-[45vh] resize-y font-mono text-xs leading-relaxed",
            )}
            spellCheck={false}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || draft === file.content}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span className="text-xs">Saving…</span>
              ) : saved ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saved ? "Saved" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            {error && <p className="text-xs text-red-400">{error.message}</p>}
          </div>
        </div>
      ) : (
        <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs leading-relaxed text-[var(--color-muted)]">
          {file.content || "(empty)"}
        </pre>
      )}
    </div>
  );
}

function ToolDrawerContent({ node }: { node: Extract<NetworkNode, { type: "tool" }> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-tool)]/20 text-[var(--color-tool)]">
          <Wrench className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {node.data.toolName}
          </p>
          <p className="break-all font-mono text-[11px] text-[var(--color-subtle)]">
            {node.data.toolId}
          </p>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-subtle)]">
          Bound to {node.data.agentIds.length} agent
          {node.data.agentIds.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {node.data.agentIds.map((id) => (
            <Badge key={id}>{id}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-accent)]";

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

