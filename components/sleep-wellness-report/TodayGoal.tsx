"use client";

import { GOLD, NAVY } from "@/components/ui/tokens";
import { SwrCard, SwrEyebrow } from "@/components/sleep-wellness-report/report-ui";
import type { TodayTheme } from "@/lib/sleep-analysis/session-guide";

export default function TodayGoal({ theme }: { theme: TodayTheme }) {
  return (
    <SwrCard tone="hero" className="!py-7">
      <SwrEyebrow>Today&apos;s Goal</SwrEyebrow>
      <p className="mt-3 text-[14px] text-slate-500">今日のテーマ</p>
      <p
        className="mt-2 text-[1.55rem] font-semibold leading-snug tracking-[-0.035em] sm:text-[1.75rem]"
        style={{ color: NAVY }}
      >
        {theme.sentence}
      </p>
      <p className="mt-4 text-[12px]" style={{ color: GOLD }}>
        Priority Engine より自動決定
      </p>
    </SwrCard>
  );
}
