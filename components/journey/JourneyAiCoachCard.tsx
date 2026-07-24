"use client";

import { GOLD, NAVY } from "@/components/ui/tokens";
import type { JourneyAiCoach } from "@/lib/journey";

export default function JourneyAiCoachCard({
  coach,
  stageTitle,
}: {
  coach: JourneyAiCoach;
  stageTitle: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#8a6a2d]/22 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-5 sm:px-6 sm:py-6">
      <p
        className="text-[10px] font-semibold tracking-[0.2em]"
        style={{ color: GOLD }}
      >
        AI COACH · {stageTitle.toUpperCase()}
      </p>
      <h3
        className="mt-2 text-[1.05rem] font-semibold tracking-[-0.03em]"
        style={{ color: NAVY }}
      >
        いまのステージに合わせたメッセージ
      </h3>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
            励まし
          </p>
          <p className="mt-1.5 text-[14px] leading-7 text-slate-700">
            {coach.encouragement}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
            改善提案
          </p>
          <p className="mt-1.5 text-[14px] leading-7 text-slate-700">
            {coach.suggestion}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
            次の目標
          </p>
          <p className="mt-1.5 text-[14px] leading-7 text-slate-700">
            {coach.nextGoal}
          </p>
        </div>
      </div>

      <p className="mt-5 text-[11px] text-slate-400">
        {coach.source === "rules"
          ? "ルールベースのコーチング提案です"
          : "AI によるコーチング提案です"}
      </p>
    </div>
  );
}
