"use client";

import { useEffect, useState } from "react";
import type { SwiInsightsOverview } from "@/lib/swi/types";
import {
  errorState,
  idleState,
  loadingState,
  successState,
  type AsyncState,
} from "@/modules/_shared/async-state";

/**
 * Insights Module hook — fetch SWI overview via API.
 */
export function useInsights() {
  const [state, setState] = useState<AsyncState<SwiInsightsOverview>>(
    idleState(),
  );

  useEffect(() => {
    let cancelled = false;
    setState(loadingState());

    void (async () => {
      try {
        const res = await fetch("/api/insights");
        if (!res.ok) {
          throw new Error(`Insights API error (${res.status})`);
        }
        const json = (await res.json()) as { insights?: SwiInsightsOverview };
        if (!json.insights) {
          throw new Error("Insights payload missing");
        }
        if (!cancelled) setState(successState(json.insights));
      } catch (e) {
        if (!cancelled) {
          setState(
            errorState(
              e instanceof Error ? e.message : "Insights の取得に失敗しました",
            ),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
