"use client";

import { useEffect, useState } from "react";
import {
  getAnalysisById,
  type StoredAnalysis,
  type StoredClient,
} from "@/lib/repositories/client-repository";
import {
  errorState,
  idleState,
  loadingState,
  successState,
  type AsyncState,
} from "@/modules/_shared/async-state";

export type AnalysisBundle = {
  client: StoredClient;
  analysis: StoredAnalysis;
};

/**
 * Analysis Module hook — load a stored analysis by id.
 */
export function useAnalysis(analysisId?: string | null) {
  const [state, setState] = useState<AsyncState<AnalysisBundle>>(idleState());

  useEffect(() => {
    if (!analysisId) {
      setState(idleState());
      return;
    }

    let cancelled = false;
    setState(loadingState());

    void (async () => {
      try {
        const bundle = await getAnalysisById(analysisId);
        if (!cancelled) {
          setState(
            bundle
              ? successState(bundle)
              : errorState("分析結果が見つかりません"),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setState(
            errorState(e instanceof Error ? e.message : "読み込みに失敗しました"),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  return state;
}
