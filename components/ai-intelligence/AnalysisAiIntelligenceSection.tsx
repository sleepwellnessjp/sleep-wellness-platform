"use client";

import { useEffect, useState } from "react";
import InstructorAssistantPanel from "@/components/ai-intelligence/InstructorAssistantPanel";
import PredictiveAnalysisCard from "@/components/ai-intelligence/PredictiveAnalysisCard";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import {
  AI_INTELLIGENCE_ROUTES,
  type InstructorAssistantBriefing,
  type PredictiveAnalysis,
} from "@/lib/ai-intelligence";
import type { AnalysisResult } from "@/lib/analysis-session";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";

function parseMetric(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function pickMetrics(metrics: AnalysisMetrics | undefined) {
  if (!metrics) return null;
  return {
    deepSleep: metrics.deepSleep || null,
    remSleep: metrics.remSleep || null,
    sleepEfficiency: metrics.sleepEfficiency || null,
    sleepLatency: metrics.sleepLatency || null,
    sleepDebt: metrics.sleepDebt || null,
    awakenings: metrics.awakenings || null,
    hrv: metrics.hrv || null,
    restingHeartRate: metrics.restingHeartRate || null,
    sleepDuration: metrics.sleepDuration || null,
    stress: metrics.stress || null,
  };
}

/**
 * 分析結果画面向け Instructor Assistant + Predictive Analysis。
 * ロジックは lib/ai-intelligence（ルールベース / 将来 GPT 差し替え可）。
 */
export default function AnalysisAiIntelligenceSection({
  result,
  previousSleepScore = null,
  previousMetrics = null,
}: {
  result: AnalysisResult;
  previousSleepScore?: number | null;
  previousMetrics?: AnalysisMetrics | null;
}) {
  const [assistant, setAssistant] = useState<InstructorAssistantBriefing | null>(
    null,
  );
  const [predictive, setPredictive] = useState<PredictiveAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const clientId = result.clientId?.trim() || "analysis-session";
    const clientName = result.clientName?.trim() || "クライアント";
    const metrics = result.metrics;
    const sleepScore =
      typeof result.score === "number" && Number.isFinite(result.score)
        ? result.score
        : parseMetric(metrics?.sleepScore);

    // 分析時に生成済みのカウンセリング支援があれば画面でも同一内容を優先
    if (result.instructorCounseling) {
      const plan = result.instructorCounseling;
      const fromPlan: InstructorAssistantBriefing = {
        featureId: "instructor_assistant",
        clientId,
        clientName,
        goodPoints: plan.goodPoints ?? [],
        needsImprovement: plan.needsImprovement ?? [],
        possibleFactors: plan.possibleFactors ?? [],
        questionCandidates: plan.questionCandidates ?? [],
        counselingAgenda: [],
        homeworkSuggestions: [],
        generatedAt: new Date().toISOString(),
        source: "rules",
      };
      setAssistant(fromPlan);
    }

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [assistRes, predRes] = await Promise.all([
          fetch(AI_INTELLIGENCE_ROUTES.api.instructorAssistant, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId,
              clientName,
              sleepScore,
              previousSleepScore,
              sleepEfficiency: parseMetric(metrics?.sleepEfficiency),
              stress: parseMetric(metrics?.stress),
              hrv: parseMetric(metrics?.hrv),
              metrics: pickMetrics(metrics),
              previousMetrics: pickMetrics(previousMetrics ?? undefined),
              lifestyle: {
                alcohol: result.drinkingHabit || null,
                stress: result.snoringNasal || null,
                notes: result.medicalHistory || null,
              },
              previousHrvValues: previousMetrics?.hrv
                ? [parseMetric(previousMetrics.hrv)].filter(
                    (n): n is number => n != null,
                  )
                : [],
              previousRhrValues: previousMetrics?.restingHeartRate
                ? [parseMetric(previousMetrics.restingHeartRate)].filter(
                    (n): n is number => n != null,
                  )
                : [],
            }),
          }),
          fetch(AI_INTELLIGENCE_ROUTES.api.predictive, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId,
              clientName,
              sleepEfficiency: parseMetric(metrics?.sleepEfficiency),
              stress: parseMetric(metrics?.stress),
              hrv: parseMetric(metrics?.hrv),
              deepSleepPercent: parseMetric(
                metrics?.deepSleepRate || metrics?.deepSleep,
              ),
              wellnessScore: sleepScore,
              improvementRate:
                sleepScore != null && previousSleepScore != null
                  ? sleepScore - previousSleepScore
                  : null,
              streakDays: 7,
              horizonDays: 14,
            }),
          }),
        ]);

        const assistJson = (await assistRes.json()) as {
          briefing?: InstructorAssistantBriefing;
          error?: string;
        };
        const predJson = (await predRes.json()) as {
          analysis?: PredictiveAnalysis;
          error?: string;
        };
        if (!assistRes.ok) {
          throw new Error(assistJson.error ?? "Assistant 取得に失敗");
        }
        if (!predRes.ok) {
          throw new Error(predJson.error ?? "予測取得に失敗");
        }
        if (!cancelled) {
          // instructorCounseling がある場合は分析結果側を優先（PDFと一致）
          if (!result.instructorCounseling) {
            setAssistant(assistJson.briefing ?? null);
          }
          setPredictive(predJson.analysis ?? null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "AI Intelligence の取得に失敗",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [result, previousSleepScore, previousMetrics]);

  if (loading && !assistant) {
    return (
      <div className="mt-5 space-y-3 sm:mt-6">
        <SoftSkeleton variant="coach" />
      </div>
    );
  }

  if (error && !assistant) {
    return (
      <p className="mt-5 text-[13px] text-[#a33a3a] sm:mt-6" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-5 sm:mt-6">
      {assistant ? <InstructorAssistantPanel briefing={assistant} /> : null}
      {predictive ? <PredictiveAnalysisCard analysis={predictive} compact /> : null}
    </div>
  );
}
