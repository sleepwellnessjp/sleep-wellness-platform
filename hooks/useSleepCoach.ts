"use client";

import { useEffect, useState } from "react";
import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import {
  generateSleepCoach,
  type SleepCoachSuggestion,
} from "@/lib/sleep-coach";
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
 * Sleep Coach Module hook.
 */
export function useSleepCoach(input: Input | null) {
  const [state, setState] = useState<AsyncState<SleepCoachSuggestion>>(
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
        const latest = input.analyses[0] ?? null;
        const previous = input.analyses[1] ?? null;
        const suggestion = await generateSleepCoach({
          dateKey: new Date().toISOString().slice(0, 10),
          analyses: input.analyses,
          latest,
          previous,
          streakDays: input.streakDays ?? 0,
          homeworkRate: input.homeworkRate ?? null,
        });
        if (!cancelled) setState(successState(suggestion));
      } catch (e) {
        if (!cancelled) {
          setState(
            errorState(
              e instanceof Error ? e.message : "Sleep Coach の生成に失敗しました",
            ),
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
