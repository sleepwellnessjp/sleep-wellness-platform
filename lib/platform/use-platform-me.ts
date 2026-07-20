"use client";

import { useEffect, useState } from "react";
import type { PlatformMeResponse } from "@/lib/platform/types";

export function usePlatformMe() {
  const [data, setData] = useState<PlatformMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/me", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("プラットフォーム情報の取得に失敗しました。");
      }
      const json = (await response.json()) as PlatformMeResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました。");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { data, loading, error, refresh };
}
