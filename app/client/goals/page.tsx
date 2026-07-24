"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { ProgressMeter } from "@/components/client-portal/PortalCharts";
import ClientPortalShell, {
  ClientPortalError,
  ClientPortalLoading,
  ClientPortalLoginGate,
  ClientPortalUnlinked,
  useClientPortalBundle,
} from "@/components/client-portal/ClientPortalShell";
import {
  GOAL_CATEGORY_LABELS,
  GOAL_STATUS_LABELS,
} from "@/lib/client-portal/constants";
import {
  clientWellnessScoreOf,
  computeGoalAchievementRate,
  computeImprovementRate,
} from "@/lib/client-portal/helpers";
import type { ClientGoalProgress } from "@/lib/client-portal/types";
import { ClientHomeGoals } from "@/components/ClientHomeStatusPanels";
import type { AnalysisResult } from "@/lib/analysis-session";

export default function ClientGoalsPage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();
  const [goals, setGoals] = useState<ClientGoalProgress[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    void (async () => {
      setReady(false);
      try {
        const res = await fetch("/api/client-portal/goals");
        const json = (await res.json()) as { goals?: ClientGoalProgress[] };
        if (!cancelled) setGoals(Array.isArray(json.goals) ? json.goals : []);
      } catch {
        if (!cancelled) setGoals([]);
      } finally {
        if (!cancelled) setReady(true);
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

  const analyses = bundle.data.client.analyses;
  const latest = analyses[0] ?? null;
  const first = analyses[analyses.length - 1] ?? null;
  const latestScore = clientWellnessScoreOf(latest);
  const baseline = clientWellnessScoreOf(first);
  const activeGoals = goals.filter((g) => g.status === "active");
  const overallFromGoals =
    activeGoals.length > 0
      ? Math.round(
          activeGoals.reduce((sum, g) => sum + g.progressPercent, 0) /
            activeGoals.length,
        )
      : null;
  const scoreAchievement = computeGoalAchievementRate(
    latestScore,
    85,
    baseline,
  );
  const improvementRate = computeImprovementRate(analyses);
  const overall =
    overallFromGoals ?? scoreAchievement ?? improvementRate;

  const result: AnalysisResult | null = latest?.result
    ? {
        ...latest.result,
        analysisId: latest.result.analysisId?.trim() || latest.id,
      }
    : null;

  return (
    <ClientPortalShell eyebrow="GOALS" title="Goals">
      <SectionCard eyebrow="ACHIEVEMENT" title="達成率">
        <ProgressMeter label="総合達成率" percent={overall} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#fafaf8] px-4 py-3">
            <p className="text-[12px] text-slate-400">改善率</p>
            <p
              className="mt-1 text-[1.35rem] font-semibold tabular-nums"
              style={{ color: NAVY }}
            >
              {improvementRate == null ? "—" : `${improvementRate}%`}
            </p>
          </div>
          <div className="rounded-2xl bg-[#fafaf8] px-4 py-3">
            <p className="text-[12px] text-slate-400">スコア達成（目標85）</p>
            <p
              className="mt-1 text-[1.35rem] font-semibold tabular-nums"
              style={{ color: NAVY }}
            >
              {scoreAchievement == null ? "—" : `${scoreAchievement}%`}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="SLEEP GOALS" title="睡眠改善目標">
        {!ready ? (
          <SoftSkeleton variant="card" />
        ) : goals.length === 0 ? (
          <EmptyState
            compact
            illustration="generic"
            title="目標はまだありません"
            description="認定講師が目標を設定すると、ここに進捗が表示されます。"
          />
        ) : (
          <ul className="space-y-3">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="rounded-2xl border border-slate-200/90 bg-[#fafaf8] px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className="text-[10px] font-semibold tracking-[0.14em]"
                      style={{ color: GOLD }}
                    >
                      {GOAL_CATEGORY_LABELS[goal.category]} ·{" "}
                      {GOAL_STATUS_LABELS[goal.status]}
                    </p>
                    <p
                      className="mt-1 text-[15px] font-semibold tracking-[-0.02em]"
                      style={{ color: NAVY }}
                    >
                      {goal.title}
                    </p>
                    {goal.description ? (
                      <p className="mt-2 text-[13px] leading-6 text-slate-600">
                        {goal.description}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className="text-[1.25rem] font-semibold tabular-nums"
                    style={{ color: NAVY }}
                  >
                    {goal.progressPercent}%
                  </p>
                </div>
                <div className="mt-3">
                  <ProgressMeter label="進捗" percent={goal.progressPercent} />
                </div>
                {(goal.currentValue != null || goal.targetValue != null) && (
                  <p className="mt-2 text-[12px] text-slate-400">
                    現在 {goal.currentValue ?? "—"}
                    {goal.unit} / 目標 {goal.targetValue ?? "—"}
                    {goal.unit}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {result ? (
        <SectionCard eyebrow="AI GOALS" title="分析からの次回までの目標">
          <ClientHomeGoals result={result} allowEdit />
        </SectionCard>
      ) : null}
    </ClientPortalShell>
  );
}
