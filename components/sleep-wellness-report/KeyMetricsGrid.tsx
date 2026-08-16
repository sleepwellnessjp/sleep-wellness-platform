"use client";

import { GOLD_MID, NAVY, SUCCESS } from "@/components/ui/tokens";
import {
  SwrCard,
  SwrEyebrow,
  SwrTitle,
} from "@/components/sleep-wellness-report/report-ui";
import ConversationGuide from "@/components/sleep-wellness-report/ConversationGuide";
import { guideForSection } from "@/lib/sleep-analysis/session-guide";
import type { CounselingMetricCard } from "@/lib/sleep-analysis/counseling-view-model";

function evalColor(label: string | null): string {
  if (!label) return "#94a3b8";
  if (label.includes("良好")) return SUCCESS;
  if (label.includes("優先")) return "#a33a3a";
  return GOLD_MID;
}

export default function KeyMetricsGrid({
  metrics,
}: {
  metrics: CounselingMetricCard[];
}) {
  return (
    <SwrCard>
      <SwrEyebrow>Data</SwrEyebrow>
      <SwrTitle>根拠となる主要データ</SwrTitle>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {metrics.map((m) => (
          <article
            key={m.key}
            className="swr-print-avoid rounded-2xl bg-[#f8f8f7] px-4 py-4"
          >
            <p className="text-[12px] text-slate-500">{m.label}</p>
            <p
              className="mt-1 text-[1.2rem] font-semibold tracking-[-0.03em] tabular-nums"
              style={{ color: m.available ? NAVY : "#94a3b8" }}
            >
              {m.displayValue}
            </p>
            <p
              className="mt-1 text-[12px] font-medium"
              style={{ color: evalColor(m.evaluation) }}
            >
              {m.evaluation ?? "—"}
            </p>
          </article>
        ))}
      </div>
      <ConversationGuide guide={guideForSection("metrics")} />
    </SwrCard>
  );
}
