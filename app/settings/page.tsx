"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, PlugZap, Loader2, Download, LogOut, Server, Database } from "lucide-react";
import {
  getOllamaUrl,
  saveOllamaUrl,
  getEmbeddingConfig,
  saveEmbeddingConfig,
} from "@/lib/settings";
import { fetchConfig, saveConfig } from "@/lib/api";
import { PageHeader, Card, StatusDot } from "@/components/ui";

type T = { status: "idle" } | { status: "testing" } | { status: "success"; count: number; url: string } | { status: "error"; message: string };
type LT = { status: "idle" } | { status: "testing" } | { status: "success" } | { status: "error"; message: string };

const input =
  "w-full rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-sm text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-accent)]";
const btn =
  "inline-flex items-center gap-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 font-mono text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]";

function parseLettaUrl(url: string): { host: string; port: string } {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: u.port || "8283" };
  } catch {
    return { host: url.replace(/^https?:\/\//, ""), port: "8283" };
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [lettaHost, setLettaHost] = useState("");
  const [lettaPort, setLettaPort] = useState("8283");
  const [lettaSaved, setLettaSaved] = useState(false);
  const [lettaTest, setLettaTest] = useState<LT>({ status: "idle" });
  const [url, setUrl] = useState(getOllamaUrl());
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<T>({ status: "idle" });
  const [embModel, setEmbModel] = useState(() => getEmbeddingConfig().model);
  const [embEndpoint, setEmbEndpoint] = useState(() => getEmbeddingConfig().endpoint);
  const [embSaved, setEmbSaved] = useState(false);

  async function saveEmbedding() {
    try {
      await saveConfig(undefined, { model: embModel, endpoint: embEndpoint });
    } catch {
      // fall back to local-only persistence
    }
    saveEmbeddingConfig({ model: embModel, endpoint: embEndpoint });
    setEmbSaved(true);
    setTimeout(() => setEmbSaved(false), 2000);
  }

  useEffect(() => {
    fetchConfig()
      .then((cfg) => {
        const p = parseLettaUrl(cfg.lettaUrl);
        setLettaHost(p.host);
        setLettaPort(p.port);
        setEmbModel(cfg.embedding?.model ?? "nomic-embed-text");
        setEmbEndpoint(cfg.embedding?.endpoint ?? "");
      })
      .catch(() => {});
  }, []);

  async function saveLetta() {
    setLettaTest({ status: "idle" });
    await saveConfig(`http://${lettaHost}:${lettaPort}`);
    setLettaSaved(true);
    setTimeout(() => setLettaSaved(false), 2000);
  }

  async function testLetta() {
    setLettaTest({ status: "testing" });
    try {
      await saveConfig(`http://${lettaHost}:${lettaPort}`);
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error(`App Server responded ${res.status}`);
      setLettaTest({ status: "success" });
    } catch (err) {
      setLettaTest({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  async function saveOllama() {
    saveOllamaUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testOllama() {
    setTest({ status: "testing" });
    try {
      const res = await fetch(`/api/models?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
      const count = (data.models ?? []).length;
      setTest({ status: "success", count, url: data.url ?? url });
    } catch (err) {
      setTest({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Settings"
        description="Endpoint configuration and connection settings."
        actions={
          <button onClick={logout} className={btn}>
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        }
      />
      <Card className="max-w-xl">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-[var(--color-accent)]" />
          <h2 className="font-mono text-sm font-semibold text-[var(--color-foreground)]">
            Letta App Server
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="letta-host" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Host / IP</label>
            <input id="letta-host" value={lettaHost} onChange={(e) => setLettaHost(e.target.value)}
              placeholder="localhost" className={input} />
          </div>
          <div>
            <label htmlFor="letta-port" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Port</label>
            <input id="letta-port" value={lettaPort} onChange={(e) => setLettaPort(e.target.value)}
              placeholder="8283" className={input} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button onClick={saveLetta}
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--color-accent)] px-4 py-2 font-mono text-sm text-[var(--color-bg)] transition-opacity hover:opacity-90">
            {lettaSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {lettaSaved ? "Saved" : "Save"}
          </button>
          <button onClick={testLetta} disabled={lettaTest.status === "testing" || !lettaHost.trim()} className={btn}>
            {lettaTest.status === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
            Test
          </button>
        </div>

        {lettaTest.status === "success" && (
          <div className="mt-4 flex items-center gap-2 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-xs text-[var(--color-ok)]">
            <StatusDot status="ok" /> Connected to {lettaHost}:{lettaPort}
          </div>
        )}
        {lettaTest.status === "error" && (
          <div className="mt-4 rounded-sm border border-red-600/40 bg-red-600/10 px-3 py-2 font-mono text-xs text-red-400">
            ERR: {lettaTest.message}
          </div>
        )}
      </Card>

      <Card className="mt-6 max-w-xl">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-[var(--color-accent)]" />
          <h2 className="font-mono text-sm font-semibold text-[var(--color-foreground)]">
            Ollama Connection
          </h2>
        </div>

        <div className="mt-5">
          <label htmlFor="ollama-url" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Ollama Base URL</label>
          <input id="ollama-url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:11434" className={input} />
          <p className="mt-1.5 font-mono text-xs text-[var(--color-subtle)]">
            Used to fetch models from /api/tags. Stored in your browser.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button onClick={saveOllama}
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--color-accent)] px-4 py-2 font-mono text-sm text-[var(--color-bg)] transition-opacity hover:opacity-90">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved" : "Save"}
          </button>
          <button onClick={testOllama} disabled={test.status === "testing" || !url.trim()} className={btn}>
            {test.status === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
            Test Connection
          </button>
          <a href="/api/snapshot" download className={btn}>
            <Download className="h-4 w-4" /> Backup Snapshots
          </a>
        </div>

        {test.status === "success" && (
          <div className="mt-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-xs text-[var(--color-ok)]">
            Connected to {test.url} — found {test.count} model{test.count === 1 ? "" : "s"}.
          </div>
        )}
        {test.status === "error" && (
          <div className="mt-4 rounded-sm border border-red-600/40 bg-red-600/10 px-3 py-2 font-mono text-xs text-red-400">
            ERR: {test.message}
          </div>
        )}
      </Card>

      <Card className="mt-6 max-w-xl">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-[var(--color-accent)]" />
          <h2 className="font-mono text-sm font-semibold text-[var(--color-foreground)]">
            Default Embedding Provider
          </h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="emb-model" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Model</label>
            <input id="emb-model" value={embModel} onChange={(e) => setEmbModel(e.target.value)}
              placeholder="nomic-embed-text" className={input} />
          </div>
          <div>
            <label htmlFor="emb-endpoint" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Endpoint</label>
            <input id="emb-endpoint" value={embEndpoint} onChange={(e) => setEmbEndpoint(e.target.value)}
              placeholder="http://localhost:11434" className={input} />
          </div>
        </div>
        <p className="mt-1.5 font-mono text-xs text-[var(--color-subtle)]">
          Default embedding model + endpoint used by agents. Stored in your
          browser.
        </p>

        <div className="mt-5">
          <button onClick={saveEmbedding}
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--color-accent)] px-4 py-2 font-mono text-sm text-[var(--color-bg)] transition-opacity hover:opacity-90">
            {embSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {embSaved ? "Saved" : "Save"}
          </button>
        </div>
      </Card>
    </div>
  );
}
