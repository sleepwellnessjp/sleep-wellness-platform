"use client";

import { GOLD, NAVY, SUCCESS } from "@/components/ui/tokens";
import {
  SwrCard,
  SwrEyebrow,
  SwrTitle,
} from "@/components/sleep-wellness-report/report-ui";
import ConversationGuide from "@/components/sleep-wellness-report/ConversationGuide";
import { guideForSection } from "@/lib/sleep-analysis/session-guide";
import type { CounselingTodaySummary } from "@/lib/sleep-analysis/counseling-view-model";

export default function TodaySummary({
  summary,
}: {
  summary: CounselingTodaySummary;
}) {
  return (
    <SwrCard>
      <SwrEyebrow>Assessment</SwrEyebrow>
      <SwrTitle>今日の総合所見</SwrTitle>
      <p className="mt-5 text-[15px] leading-8" style={{ color: NAVY }}>
        {summary.currentState}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#f7f8f7] px-4 py-4">
          <p
            className="text-[11px] font-semibold tracking-[0.12em]"
            style={{ color: SUCCESS }}
          >
            良い点
          </p>
          <ul className="mt-2 space-y-1.5">
            {summary.goodPoints.slice(0, 2).map((p) => (
              <li key={p} className="text-[13px] leading-6 text-slate-600">
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-[#f7f7f5] px-4 py-4">
          <p
            className="text-[11px] font-semibold tracking-[0.12em]"
            style={{ color: GOLD }}
          >
            注意点
          </p>
          <ul className="mt-2 space-y-1.5">
            {summary.cautionPoints.slice(0, 2).map((p) => (
              <li key={p} className="text-[13px] leading-6 text-slate-600">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ConversationGuide guide={guideForSection("summary")} />
    </SwrCard>
  );
}
