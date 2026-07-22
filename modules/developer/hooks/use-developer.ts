"use client";

import { useEffect, useState } from "react";
import type { DeveloperDashboardStats, ApiKeyDashboardRow } from "@/lib/api-platform/types";

type DashboardState = {
  stats: DeveloperDashboardStats | null;
  keys: ApiKeyDashboardRow[];
  loading: boolean;
  error: string | null;
};

/** Developer module hook — thin client over /api/developer. */
export function useDeveloperDashboard(): DashboardState & { reload: () => void } {
  const [stats, setStats] = useState<DeveloperDashboardStats | null>(null);
  const [keys, setKeys] = useState<ApiKeyDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch("/api/developer/keys", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          stats?: DeveloperDashboardStats;
          keys?: ApiKeyDashboardRow[];
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        if (cancelled) return;
        setStats(json.stats ?? null);
        setKeys(json.keys ?? []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    stats,
    keys,
    loading,
    error,
    reload: () => setTick((n) => n + 1),
  };
}
