"use client";

import AiSourceBadge from "@/components/ai-intelligence/AiSourceBadge";
import { GOLD, GOLD_LIGHT, NAVY, TEAL } from "@/components/ui/tokens";
import type { SleepCoachBriefing } from "@/lib/ai-intelligence";

export default function SleepCoachCard({
  briefing,
}: {
  briefing: SleepCoachBriefing;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#8a6a2d]/25 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            SLEEP COACH
          </p>
          <h3
            className="mt-1.5 text-[1.15rem] font-semibold tracking-[-0.03em]"
            style={{ color: NAVY }}
          >
            今朝の Sleep Coach
          </h3>
        </div>
        <p className="text-[12px] tabular-nums text-slate-400">
          {briefing.dateLabel}
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <CoachBlock label="睡眠状態" body={briefing.sleepStatus} />
        <CoachBlock label="今日のコンディション" body={briefing.todayCondition} />

        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
            今日おすすめの行動
          </p>
          <ul className="mt-2 space-y-2">
            {briefing.recommendedActions.map((action) => (
              <li key={action} className="flex items-start gap-2.5">
                <span
                  className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: TEAL }}
                  aria-hidden
                />
                <span className="text-[14px] leading-7 text-slate-700">
                  {action}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#8a6a2d]/18 bg-white/80 px-4 py-4">
          <p
            className="text-[10px] font-semibold tracking-[0.16em]"
            style={{ color: GOLD }}
          >
            今日のメラトニンヨガ™
          </p>
          <p
            className="mt-2 text-[15px] font-semibold tracking-[-0.02em]"
            style={{ color: NAVY }}
          >
            {briefing.melatoninYoga.title}
          </p>
          <p className="mt-1.5 text-[13px] leading-6 text-slate-600">
            {briefing.melatoninYoga.description}
          </p>
          <p className="mt-2 text-[12px] text-slate-400">
            {briefing.melatoninYoga.durationMin}分 ·{" "}
            {briefing.melatoninYoga.focus}
          </p>
        </div>

        <div
          className="rounded-2xl px-4 py-4 text-[14px] leading-7 text-white"
          style={{
            background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`,
          }}
        >
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/80">
            励ましメッセージ
          </p>
          <p className="mt-1.5">{briefing.encouragement}</p>
        </div>
      </div>

      <div className="mt-5">
        <AiSourceBadge source={briefing.source} />
      </div>
    </div>
  );
}

function CoachBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-[14px] leading-7 text-slate-700">{body}</p>
    </div>
  );
}
