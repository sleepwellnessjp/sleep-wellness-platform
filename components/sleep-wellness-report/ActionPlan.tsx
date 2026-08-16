"use client";

import { NAVY, TEAL } from "@/components/ui/tokens";
import {
  SwrCard,
  SwrEyebrow,
  SwrTitle,
} from "@/components/sleep-wellness-report/report-ui";
import ConversationGuide from "@/components/sleep-wellness-report/ConversationGuide";
import { guideForSection } from "@/lib/sleep-analysis/session-guide";
import type { CounselingActionItem } from "@/lib/sleep-analysis/counseling-view-model";

export default function ActionPlan({
  actions,
}: {
  actions: CounselingActionItem[];
}) {
  return (
    <SwrCard>
      <SwrEyebrow>Action Plan</SwrEyebrow>
      <SwrTitle>今週の行動プラン</SwrTitle>
      <ol className="mt-6 space-y-3">
        {actions.slice(0, 5).map((action, index) => (
          <li
            key={action.id}
            className="swr-print-avoid rounded-2xl bg-[#f7f8f8] px-4 py-4"
          >
            <div className="flex gap-3">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{ backgroundColor: TEAL }}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p
                  className="text-[15px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {action.name}
                </p>
                <p className="mt-1.5 text-[13px] leading-6 text-slate-600">
                  {action.purpose}
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  {action.timing} ／ {action.guide}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <ConversationGuide guide={guideForSection("actions")} />
    </SwrCard>
  );
}
