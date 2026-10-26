"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentView, MemoryFile, SharedFile, ActivityItem } from "./types";
import {
  fetchAgent,
  fetchAgentMemory,
  fetchAgents,
  fetchNetwork,
  fetchSharedFiles,
} from "./api";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fn()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, refetch };
}

/** Load all agents. */
export function useAgents() {
  return useAsync<AgentView[]>(() => fetchAgents(), []);
}

/** Load a single agent. */
export function useAgent(agentId: string | null | undefined) {
  return useAsync<AgentView>(
    () => {
      if (!agentId) return Promise.reject(new Error("Missing agent id"));
      return fetchAgent(agentId);
    },
    [agentId],
  );
}

/** Load an agent's git-backed memory files. */
export function useAgentMemory(agentId: string | null | undefined) {
  return useAsync<MemoryFile[]>(
    () => {
      if (!agentId) return Promise.reject(new Error("Missing agent id"));
      return fetchAgentMemory(agentId);
    },
    [agentId],
  );
}

/** Load all agents and their memory files in one request (for matrix/map). */
export function useNetwork() {
  return useAsync<{ agents: AgentView[]; memories: Record<string, MemoryFile[]> }>(
    () => fetchNetwork(),
    [],
  );
}

/** Load the shared knowledge files fanned out to all agents. */
export function useSharedFiles() {
  return useAsync<SharedFile[]>(
    async () => (await fetchSharedFiles()).files,
    [],
  );
}

/** Live activity stream (SSE) for a single agent. */
export function useActivity(agentId: string | null | undefined) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    const es = new EventSource(
      `/api/agents/${encodeURIComponent(agentId)}/activity`,
    );
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener("activity", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as {
          items?: ActivityItem[];
          error?: string;
        };
        if (data.error) {
          setError(data.error);
          return;
        }
        setItems((prev) => {
          const map = new Map(prev.map((i) => [i.id, i]));
          for (const item of data.items ?? []) map.set(item.id, item);
          return Array.from(map.values())
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .slice(0, 50);
        });
      } catch {
        // ignore malformed events
      }
    });
    return () => es.close();
  }, [agentId]);

  return { items, connected, error };
}
