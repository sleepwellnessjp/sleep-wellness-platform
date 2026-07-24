"use client";

import { WeeklyScoreTrendChart } from "@/components/client-portal/PortalCharts";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type {
  JourneyScoreTrendPoint,
  JourneyStageView,
} from "@/lib/journey";

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#071426]/06 bg-[#fafaf8] px-4 py-4">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p
        className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] tabular-nums sm:text-[1.5rem]"
        style={{ color: NAVY }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[12px] leading-5 text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export default function JourneyProgressPanel({
  currentStage,
  achievementRate,
  improvementRate,
  streakDays,
  nextGoal,
  scoreTrend,
}: {
  currentStage: JourneyStageView;
  achievementRate: number;
  improvementRate: number | null;
  streakDays: number;
  nextGoal: string;
  scoreTrend: JourneyScoreTrendPoint[];
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricTile
          label="現在のステージ"
          value={`Stage ${currentStage.stageNumber}`}
          hint={currentStage.title}
        />
        <MetricTile
          label="達成率"
          value={`${achievementRate}%`}
          hint={currentStage.subtitle}
        />
        <MetricTile
          label="改善率"
          value={improvementRate == null ? "—" : `${improvementRate}%`}
          hint="初回分析からの変化"
        />
        <MetricTile
          label="連続記録日数"
          value={`${streakDays}日`}
          hint="宿題・実践の継続"
        />
        <div className="rounded-2xl border border-[#071426]/06 bg-[#fafaf8] px-4 py-4 sm:col-span-2">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
            次の目標
          </p>
          <p
            className="mt-2 text-[14px] leading-7 sm:text-[15px]"
            style={{ color: NAVY }}
          >
            {nextGoal}
          </p>
          <p
            className="mt-2 text-[10px] font-semibold tracking-[0.16em]"
            style={{ color: GOLD }}
          >
            NEXT GOAL
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#071426]/06 bg-white px-4 py-4 sm:px-5">
        <p
          className="text-[10px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          SLEEP SCORE TREND
        </p>
        <p className="mt-1 text-[14px] font-semibold" style={{ color: NAVY }}>
          睡眠スコア推移
        </p>
        <div className="mt-3">
          <WeeklyScoreTrendChart points={scoreTrend} />
        </div>
      </div>
    </div>
  );
}
