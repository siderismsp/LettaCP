"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Authentication failed");
        setLoading(false);
        return;
      }
      router.replace(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <Lock className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          </span>
          <span className="font-mono text-sm font-semibold uppercase tracking-widest text-[var(--color-foreground)]">
            LettaCP · Auth
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <p className="font-mono text-xs text-[var(--color-muted)]">
              &gt; AUTHENTICATION REQUIRED
            </p>
          </div>

          <div className="space-y-4 p-4">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-subtle)]">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-accent)]"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="font-mono text-xs text-red-400">&gt; ERROR: {error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-sm border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 font-mono text-sm font-semibold uppercase tracking-widest text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Authenticating…
                </span>
              ) : (
                "Authenticate"
              )}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center font-mono text-[10px] text-[var(--color-subtle)]">
          Protected by DASHBOARD_PASSWORD
        </p>
      </div>
    </div>
  );
}
