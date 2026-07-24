"use client";

import { useEffect, useState } from "react";
import SleepCoachCard from "@/components/ai-intelligence/SleepCoachCard";
import PredictiveAnalysisCard from "@/components/ai-intelligence/PredictiveAnalysisCard";
import ClientPortalShell, {
  ClientPortalError,
  ClientPortalLoading,
  ClientPortalLoginGate,
  ClientPortalUnlinked,
  useClientPortalBundle,
} from "@/components/client-portal/ClientPortalShell";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import {
  AI_INTELLIGENCE_ROUTES,
  type PredictiveAnalysis,
  type SleepCoachBriefing,
} from "@/lib/ai-intelligence";
import {
  clientWellnessScoreOf,
  computeImprovementRate,
} from "@/lib/client-portal/helpers";

function parseMetric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export default function ClientCoachPage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();
  const [coach, setCoach] = useState<SleepCoachBriefing | null>(null);
  const [predictive, setPredictive] = useState<PredictiveAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    const client = bundle.data.client;
    const latest = client.analyses[0] ?? null;
    const score = clientWellnessScoreOf(latest);
    const metrics = latest?.metrics;
    const improvementRate = computeImprovementRate(client.analyses);

    setAiLoading(true);
    setAiError(null);

    void (async () => {
      try {
        const [coachRes, predRes] = await Promise.all([
          fetch(AI_INTELLIGENCE_ROUTES.api.sleepCoach, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: client.id,
              clientName: client.name,
              sleepScore: score,
              sleepEfficiency: parseMetric(metrics?.sleepEfficiency),
              stress: parseMetric(metrics?.stress),
              hrv: parseMetric(metrics?.hrv),
              streakDays: Math.min(client.analyses.length, 30),
            }),
          }),
          fetch(AI_INTELLIGENCE_ROUTES.api.predictive, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: client.id,
              clientName: client.name,
              sleepEfficiency: parseMetric(metrics?.sleepEfficiency),
              stress: parseMetric(metrics?.stress),
              hrv: parseMetric(metrics?.hrv),
              deepSleepPercent: parseMetric(
                metrics?.deepSleepRate ?? metrics?.deepSleep,
              ),
              wellnessScore: score,
              improvementRate,
              streakDays: Math.min(client.analyses.length, 30),
              horizonDays: 14,
            }),
          }),
        ]);
        const coachJson = (await coachRes.json()) as {
          briefing?: SleepCoachBriefing;
          error?: string;
        };
        const predJson = (await predRes.json()) as {
          analysis?: PredictiveAnalysis;
          error?: string;
        };
        if (!coachRes.ok) throw new Error(coachJson.error ?? "Coach 取得失敗");
        if (!predRes.ok) throw new Error(predJson.error ?? "予測取得失敗");
        if (!cancelled) {
          setCoach(coachJson.briefing ?? null);
          setPredictive(predJson.analysis ?? null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setAiError(
            err instanceof Error ? err.message : "AI の取得に失敗しました",
          );
        }
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bundle]);

  if (loading) return <ClientPortalLoading />;
  if (needsLogin) return <ClientPortalLoginGate />;
  if (error) return <ClientPortalError message={error} onRetry={reload} />;
  if (!bundle) return <ClientPortalUnlinked />;

  return (
    <ClientPortalShell eyebrow="SLEEP COACH" title="Sleep Coach">
      {aiError ? (
        <p className="mb-4 text-[14px] text-[#a33a3a]" role="alert">
          {aiError}
        </p>
      ) : null}
      {aiLoading ? (
        <div className="space-y-4">
          <SoftSkeleton variant="coach" />
          <SoftSkeleton variant="card" />
        </div>
      ) : null}
      {!aiLoading && coach ? <SleepCoachCard briefing={coach} /> : null}
      {!aiLoading && predictive ? (
        <div className="mt-5">
          <PredictiveAnalysisCard analysis={predictive} />
        </div>
      ) : null}
    </ClientPortalShell>
  );
}
