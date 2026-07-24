"use client";

import AiSourceBadge from "@/components/ai-intelligence/AiSourceBadge";
import { GOLD, NAVY, SUCCESS, TEAL } from "@/components/ui/tokens";
import type { PredictiveAnalysis } from "@/lib/ai-intelligence";

const CONFIDENCE_LABEL = {
  low: "低",
  medium: "中",
  high: "高",
} as const;

export default function PredictiveAnalysisCard({
  analysis,
  compact = false,
}: {
  analysis: PredictiveAnalysis;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border border-[#071426]/08 bg-white px-5 py-5 sm:px-6 ${
        compact ? "sm:py-5" : "sm:py-6"
      }`}
    >
      <p
        className="text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        PREDICTIVE ANALYSIS
      </p>
      <h3
        className="mt-1.5 text-[1.05rem] font-semibold tracking-[-0.03em]"
        style={{ color: NAVY }}
      >
        {analysis.horizonDays}日後の改善予測
      </h3>
      <p className="mt-2 text-[14px] leading-7 text-slate-600">
        {analysis.narrative}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {analysis.predictions.map((p) => {
          const positive =
            p.key === "stress" ? p.delta <= 0 : p.delta >= 0;
          return (
            <div
              key={p.key}
              className="rounded-2xl border border-[#071426]/06 bg-[#fafaf8] px-4 py-3.5"
            >
              <p className="text-[11px] font-semibold tracking-[0.1em] text-slate-400">
                {p.label}
              </p>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <p
                  className="text-[1.35rem] font-semibold tabular-nums tracking-[-0.04em]"
                  style={{ color: NAVY }}
                >
                  {p.predicted}
                  <span className="ml-0.5 text-[12px] font-medium text-slate-400">
                    {p.unit}
                  </span>
                </p>
                <p
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: positive ? SUCCESS : "#B45309" }}
                >
                  {p.delta > 0 ? "+" : ""}
                  {p.delta}
                  {p.unit}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                現在 {p.current}
                {p.unit}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{ backgroundColor: `${TEAL}18`, color: TEAL }}
        >
          信頼度 {CONFIDENCE_LABEL[analysis.confidence]}
        </span>
        <p className="text-[12px] leading-5 text-slate-400">{analysis.caveat}</p>
      </div>

      <div className="mt-4">
        <AiSourceBadge source={analysis.source} />
      </div>
    </div>
  );
}
