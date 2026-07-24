"use client";

import { useEffect, useState } from "react";
import {
  buildAiFollowAlerts,
  type AiFollowAlert,
  type BuildAiFollowAlertsInput,
} from "@/lib/ai-follow-alerts";
import {
  generateAiCounselingAssistant,
  type AiCounselingAssistant,
  type AiCounselingAssistantContext,
} from "@/lib/ai-counseling-assistant";
import {
  generateInstructorInsight,
  type InstructorInsight,
  type InstructorInsightContext,
} from "@/lib/instructor-insight";
import {
  errorState,
  idleState,
  loadingState,
  successState,
  type AsyncState,
} from "@/modules/_shared/async-state";

type AiBundle = {
  insight: InstructorInsight | null;
  counselingAssistant: AiCounselingAssistant | null;
  alerts: AiFollowAlert[];
};

/**
 * AI Module hook — instructor insight + counseling assistant + follow alerts.
 */
export function useAI(input: {
  insightContext?: InstructorInsightContext | null;
  counselingContext?: AiCounselingAssistantContext | null;
  alertsInput?: BuildAiFollowAlertsInput | null;
} | null) {
  const [state, setState] = useState<AsyncState<AiBundle>>(idleState());

  useEffect(() => {
    if (!input) {
      setState(idleState());
      return;
    }

    let cancelled = false;
    setState(loadingState());

    void (async () => {
      try {
        const insight = input.insightContext
          ? await generateInstructorInsight(input.insightContext)
          : null;
        const counselingAssistant = input.counselingContext
          ? await generateAiCounselingAssistant(input.counselingContext)
          : null;
        const alerts = input.alertsInput
          ? buildAiFollowAlerts(input.alertsInput)
          : [];
        if (!cancelled) {
          setState(successState({ insight, counselingAssistant, alerts }));
        }
      } catch (e) {
        if (!cancelled) {
          setState(
            errorState(e instanceof Error ? e.message : "AI の生成に失敗しました"),
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
