"use client";

import { useCallback, useEffect, useState } from "react";
import { getOllamaUrl } from "@/lib/settings";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ModelOption {
  name: string;
  size: number;
}

interface ModelDropdownProps {
  onSelectModel: (modelName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable model selector that fetches the local Ollama model list from
 * `/api/models` (which reads the stored Ollama URL) and emits the selected
 * model name via `onSelectModel`.
 */
export function ModelDropdown({
  onSelectModel,
  placeholder = "Select a model…",
  disabled = false,
  className,
}: ModelDropdownProps) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refetch helper (called from the settings-changed event handler).
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = getOllamaUrl();
      const res = await fetch(`/api/models?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setModels(data.models ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: setState only in async promise callbacks.
  useEffect(() => {
    let cancelled = false;
    const url = getOllamaUrl();
    fetch(`/api/models?url=${encodeURIComponent(url)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || `Request failed (${res.status})`);
        }
        return data as { models?: ModelOption[] };
      })
      .then((data) => {
        if (!cancelled) {
          setModels(data.models ?? []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setModels([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Refetch when the Ollama URL changes in Settings.
  useEffect(() => {
    const handler = () => void refetch();
    window.addEventListener("letta-cp:settings-changed", handler);
    return () => window.removeEventListener("letta-cp:settings-changed", handler);
  }, [refetch]);

  return (
    <select
      value=""
      onChange={(e) => {
        const name = e.target.value;
        if (name) onSelectModel(name);
      }}
      disabled={disabled || loading}
      className={cn(
        "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <option value="" disabled>
        {loading
          ? "Loading Ollama models…"
          : error
            ? "Ollama unavailable"
            : placeholder}
      </option>
      {error ? (
        <option value="" disabled>
          {error}
        </option>
      ) : (
        models.map((model) => (
          <option key={model.name} value={model.name}>
            {model.name} ({formatBytes(model.size)})
          </option>
        ))
      )}
    </select>
  );
}
