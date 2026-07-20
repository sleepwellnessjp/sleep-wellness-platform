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
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch (parseError) {
        console.error("[usePlatformMe] JSON parse failed", {
          status: response.status,
          parseError,
        });
      }

      if (!response.ok) {
        const body =
          payload && typeof payload === "object"
            ? (payload as {
                error?: unknown;
                errorType?: unknown;
                details?: unknown;
              })
            : {};

        console.error("[usePlatformMe] request failed", {
          status: response.status,
          error: body.error,
          errorType: body.errorType,
          details: body.details,
          payload,
        });

        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "プラットフォーム情報の取得に失敗しました。",
        );
      }

      setData(payload as PlatformMeResponse);
    } catch (err) {
      console.error("[usePlatformMe] failed", err);
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
