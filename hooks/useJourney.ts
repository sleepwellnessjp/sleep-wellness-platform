"use client";

import { useEffect, useState } from "react";
import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import {
  generateSleepWellnessJourney,
  type SleepWellnessJourney,
} from "@/lib/sleep-wellness-journey";
import {
  errorState,
  idleState,
  loadingState,
  successState,
  type AsyncState,
} from "@/modules/_shared/async-state";

type Input = {
  analyses: StoredAnalysis[];
  streakDays?: number;
  homeworkRate?: number | null;
};

/**
 * Journey Module hook — derive Sleep Wellness Journey™ from analyses.
 */
export function useJourney(input: Input | null) {
  const [state, setState] = useState<AsyncState<SleepWellnessJourney>>(
    idleState(),
  );

  useEffect(() => {
    if (!input) {
      setState(idleState());
      return;
    }

    let cancelled = false;
    setState(loadingState());

    void (async () => {
      try {
        const journey = await generateSleepWellnessJourney({
          analyses: input.analyses,
          streakDays: input.streakDays ?? 0,
          homeworkRate: input.homeworkRate ?? null,
        });
        if (!cancelled) setState(successState(journey));
      } catch (e) {
        if (!cancelled) {
          setState(
            errorState(e instanceof Error ? e.message : "Journey の生成に失敗しました"),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [input]);

  return state;
}
