"use client";

import SectionCard from "@/components/ui/SectionCard";
import EmptyState from "@/components/ui/EmptyState";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  ProgressMeter,
  WeeklyScoreTrendChart,
} from "@/components/client-portal/PortalCharts";
import ClientPortalShell, {
  ClientPortalError,
  ClientPortalLoading,
  ClientPortalLoginGate,
  ClientPortalUnlinked,
  useClientPortalBundle,
} from "@/components/client-portal/ClientPortalShell";
import {
  buildSleepRecordMetrics,
  buildWeeklyScoreTrend,
  clientWellnessScoreOf,
} from "@/lib/client-portal/helpers";
import { formatDisplayDate } from "@/lib/repositories/client-repository";

export default function ClientSleepRecordPage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();

  if (loading) return <ClientPortalLoading />;
  if (needsLogin) return <ClientPortalLoginGate />;
  if (error) return <ClientPortalError message={error} onRetry={reload} />;
  if (!bundle) return <ClientPortalUnlinked />;

  const latest = bundle.data.client.analyses[0] ?? null;
  const metrics = buildSleepRecordMetrics(latest?.metrics ?? latest?.result?.metrics);
  const weekly = buildWeeklyScoreTrend(bundle.data.client.analyses);
  const score = clientWellnessScoreOf(latest);

  return (
    <ClientPortalShell eyebrow="SLEEP RECORD" title="Sleep Record">
      <SectionCard eyebrow="SCORE" title="最新スコア">
        {score == null ? (
          <EmptyState
            compact
            illustration="score"
            title="スコアがありません"
            description="認定講師による睡眠分析が完了すると表示されます。"
          />
        ) : (
          <div>
            <p
              className="text-[3rem] font-semibold tracking-[-0.06em] tabular-nums"
              style={{ color: NAVY }}
            >
              {Math.round(score)}
            </p>
            {latest?.analysisDate ? (
              <p className="mt-1 text-[13px] text-slate-400">
                {formatDisplayDate(latest.analysisDate)}
              </p>
            ) : null}
          </div>
        )}
      </SectionCard>

      <SectionCard eyebrow="METRICS" title="睡眠指標">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((item) => (
            <div
              key={item.key}
              className="rounded-2xl border border-[#071426]/06 bg-[#fafaf8] px-4 py-4"
            >
              <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
                {item.label}
              </p>
              <p
                className="mt-2 text-[1.25rem] font-semibold tracking-[-0.03em] tabular-nums"
                style={{ color: NAVY }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="GRAPH" title="スコア推移グラフ">
        <WeeklyScoreTrendChart points={weekly} />
        {score != null ? (
          <div className="mt-6">
            <ProgressMeter label="Sleep Wellness Score" percent={Math.round(score)} />
            <p className="mt-2 text-[12px]" style={{ color: GOLD }}>
              指標カードとグラフで、今週の変化を振り返れます。
            </p>
          </div>
        ) : null}
      </SectionCard>
    </ClientPortalShell>
  );
}
