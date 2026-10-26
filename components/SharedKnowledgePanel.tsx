"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Users, FileText, X, Save, Check } from "lucide-react";
import { useSharedFiles } from "@/lib/hooks";
import { removeSharedFile, saveSharedFile } from "@/lib/api";
import type { SharedFile } from "@/lib/types";
import { Spinner, EmptyState, Badge } from "@/components/ui";

export function SharedKnowledgePanel() {
  const { data: files, loading, error, refetch } = useSharedFiles();
  const [modal, setModal] = useState<null | SharedFile | "new">(null);

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            Shared Knowledge
          </h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            One file, written to every agent&apos;s memory so they all share the
            same context.
          </p>
        </div>
        <button
          onClick={() => setModal("new")}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90"
        >
          <Plus className="h-3.5 w-3.5" /> New Shared File
        </button>
      </div>

      <div className="mt-4">
        {loading && <Spinner label="Loading shared files…" />}
        {!loading && error && (
          <p className="text-xs text-red-400">{error.message}</p>
        )}
        {!loading && !error && (files?.length ?? 0) === 0 && (
          <EmptyState
            title="No shared files yet"
            description="Create one to push shared knowledge to every agent."
          />
        )}
        {!loading && !error && (files?.length ?? 0) > 0 && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {files!.map((file) => (
              <SharedFileCard
                key={file.name}
                file={file}
                onEdit={() => setModal(file)}
                onDelete={async () => {
                  await removeSharedFile(file.name);
                  refetch();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <SharedFileModal
          file={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refetch();
          }}
        />
      )}
    </section>
  );
}

function SharedFileCard({
  file,
  onEdit,
  onDelete,
}: {
  file: SharedFile;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-block-shared)]/20 text-[var(--color-block-shared)]">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-[var(--color-foreground)]">
              shared/{file.name}.md
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              {file.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="rounded-md p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-md p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--color-bg)] p-3 text-xs leading-relaxed text-[var(--color-muted)]">
        {file.content || "(empty)"}
      </pre>

      <div className="mt-3 flex items-center gap-2">
        <Badge className="gap-1">
          <Users className="h-3 w-3" />
          {file.agentIds.length} agent{file.agentIds.length === 1 ? "" : "s"}
        </Badge>
      </div>
    </div>
  );
}

function SharedFileModal({
  file,
  onClose,
  onSaved,
}: {
  file: SharedFile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(file?.name ?? "");
  const [description, setDescription] = useState(file?.description ?? "");
  const [content, setContent] = useState(file?.content ?? "");
  const [addToPrompts, setAddToPrompts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await saveSharedFile(name, description, content, addToPrompts);
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-2xl rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            {file ? "Edit Shared File" : "New Shared File"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name (file name)">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="project-knowledge"
                disabled={!!file}
                className={inputClass}
              />
            </Field>
            <Field label="Description">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this shared file contains"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Content (Markdown)">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Shared knowledge\n\n- key facts agents should know…"
              className={`${inputClass} min-h-[200px] resize-y font-mono text-xs leading-relaxed`}
              spellCheck={false}
            />
          </Field>

          <label className="flex items-start gap-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <input
              type="checkbox"
              checked={addToPrompts}
              onChange={(e) => setAddToPrompts(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
            />
            <span className="text-xs leading-relaxed">
              <span className="font-medium text-[var(--color-foreground)]">
                Append a reference to each agent&apos;s system prompt
              </span>
              <span className="mt-0.5 block text-[var(--color-muted)]">
                Adds &ldquo;Refer to shared/&lt;name&gt;.md for shared project
                knowledge before answering.&rdquo; to every agent so they know to
                read it.
              </span>
            </span>
          </label>

          {error && <p className="text-xs text-red-400">{error.message}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span className="text-xs">Saving…</span>
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Saved" : "Save & Push to Agents"}
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
            >
              Cancel
            </button>
          </div>
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

