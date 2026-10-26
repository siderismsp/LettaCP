"use client";

import { Loader2, AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export type LedStatus = "ok" | "warn" | "idle" | "error";

const ledColor: Record<LedStatus, string> = {
  ok: "var(--color-ok)",
  warn: "var(--color-warn)",
  idle: "var(--color-idle)",
  error: "#f85149",
};

/** Small solid status LED (6px square indicator). */
export function StatusDot({
  status = "idle",
  className,
}: {
  status?: LedStatus;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-1.5 w-1.5 shrink-0", className)}
      style={{ backgroundColor: ledColor[status] }}
    />
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 font-mono text-xs text-[var(--color-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <AlertTriangle className="h-7 w-7 text-red-400" />
      <p className="font-mono text-sm font-semibold text-[var(--color-foreground)]">
        ERR: App Server unreachable
      </p>
      <p className="max-w-md font-mono text-xs text-[var(--color-muted)]">
        {error?.message ?? "Unknown error"}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 font-mono text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox className="h-7 w-7 text-[var(--color-subtle)]" />
      <p className="font-mono text-sm font-semibold text-[var(--color-foreground)]">
        {title}
      </p>
      {description && (
        <p className="max-w-md font-mono text-xs text-[var(--color-muted)]">
          {description}
        </p>
      )}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--color-muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
      <div>
        <h1 className="font-mono text-lg font-semibold uppercase tracking-wide text-[var(--color-foreground)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 font-mono text-xs text-[var(--color-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
