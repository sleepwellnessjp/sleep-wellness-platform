"use client";

import Image from "next/image";
import { GOLD, GOLD_MID, NAVY, SUCCESS } from "@/components/ui/tokens";
import {
  formatDeviceName,
  formatGeneratedAt,
} from "@/components/sleep-wellness-report/report-ui";
import type { CounselingPriorityCard } from "@/lib/sleep-analysis/counseling-view-model";
import type { CounselingMetricCard } from "@/lib/sleep-analysis/counseling-view-model";
import type { CounselingTodaySummary } from "@/lib/sleep-analysis/counseling-view-model";
import type { TodayTheme } from "@/lib/sleep-analysis/session-guide";

function MiniScore({
  score,
  grade,
}: {
  score: number | null;
  grade: string | null;
}) {
  return (
    <div className="flex items-end gap-4">
      <div>
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Sleep Wellness Score
        </p>
        <p
          className="mt-1 text-[3rem] font-semibold leading-none tracking-[-0.05em]"
          style={{ color: NAVY }}
        >
          {score ?? "—"}
        </p>
      </div>
      <p className="mb-2 text-[12px] tracking-[0.12em] text-slate-400">
        {grade ? `GRADE ${grade}` : ""}
      </p>
    </div>
  );
}

export type DemoPageSummaryProps = {
  clientName?: string | null;
  measurementDate?: string | null;
  device: string;
  generatedAt: string;
  totalScore: number | null;
  grade: string | null;
  headline: string;
  summary: CounselingTodaySummary;
  theme: TodayTheme;
  priorities: CounselingPriorityCard[];
  metrics: CounselingMetricCard[];
  conclusion: string;
};

export default function DemoPageSummary({
  clientName,
  measurementDate,
  device,
  generatedAt,
  totalScore,
  grade,
  headline,
  summary,
  theme,
  priorities,
  metrics,
  conclusion,
}: DemoPageSummaryProps) {
  const topMetrics = metrics.filter((m) => m.available).slice(0, 6);

  return (
    <section className="swr-print-page swr-print-page-1 space-y-5">
      <header className="swr-print-avoid rounded-[24px] border border-[rgba(138,106,45,0.25)] bg-white px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={180}
              height={45}
              className="h-auto w-[110px] object-contain sm:w-[130px]"
              priority
            />
            <p
              className="mt-3 text-[10px] font-semibold tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              PAGE 1 · SUMMARY
            </p>
            <h1
              className="mt-1 text-[1.45rem] font-semibold tracking-[-0.03em] sm:text-[1.65rem]"
              style={{ color: NAVY }}
            >
              Sleep Wellness Summary
            </h1>
          </div>
          <MiniScore score={totalScore} grade={grade} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[rgba(7,20,38,0.06)] pt-3 text-[12px] text-slate-500">
          {clientName ? (
            <span className="font-medium" style={{ color: NAVY }}>
              {clientName} 様
            </span>
          ) : null}
          {measurementDate ? <span>測定日 {measurementDate}</span> : null}
          <span>{formatDeviceName(device)}</span>
          <span>{formatGeneratedAt(generatedAt)}</span>
        </div>
      </header>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Today&apos;s Goal
        </p>
        <p
          className="mt-2 text-[1.2rem] font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          {theme.sentence}
        </p>
        <p className="mt-3 text-[14px] leading-7 text-slate-600">{headline}</p>
      </div>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Today&apos;s Summary
        </p>
        <p className="mt-3 text-[15px] leading-8" style={{ color: NAVY }}>
          {summary.currentState}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#f7f8f7] px-4 py-3">
            <p className="text-[11px] font-semibold" style={{ color: SUCCESS }}>
              良い点
            </p>
            <ul className="mt-1.5 space-y-1">
              {summary.goodPoints.slice(0, 2).map((p) => (
                <li key={p} className="text-[13px] leading-6 text-slate-600">
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-[#f8f7f5] px-4 py-3">
            <p className="text-[11px] font-semibold" style={{ color: GOLD }}>
              注意点
            </p>
            <ul className="mt-1.5 space-y-1">
              {summary.cautionPoints.slice(0, 2).map((p) => (
                <li key={p} className="text-[13px] leading-6 text-slate-600">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Priority Top 3
        </p>
        <ol className="mt-4 space-y-3">
          {priorities.slice(0, 3).map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-3 rounded-2xl bg-[#fafafa] px-4 py-3"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{
                  background:
                    item.rank === 1
                      ? GOLD_MID
                      : item.rank === 2
                        ? "#315f68"
                        : "rgba(7,20,38,0.45)",
                }}
              >
                {item.rank}
              </span>
              <div className="min-w-0">
                <p
                  className="text-[15px] font-semibold"
                  style={{ color: NAVY }}
                >
                  {item.label}
                  <span className="ml-2 text-[11px] font-medium text-slate-400">
                    優先度 {item.level}
                  </span>
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  {item.relatedValue}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Key Metrics
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {topMetrics.map((m) => (
            <div
              key={m.key}
              className="rounded-2xl bg-[#f8f8f7] px-3 py-3"
            >
              <p className="text-[11px] text-slate-500">{m.label}</p>
              <p
                className="mt-1 text-[1.05rem] font-semibold tabular-nums"
                style={{ color: NAVY }}
              >
                {m.displayValue}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {m.evaluation ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(138,106,45,0.28)] bg-[#fffdf8] px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Today&apos;s Conclusion
        </p>
        <p
          className="mt-3 text-[15px] font-medium leading-8"
          style={{ color: NAVY }}
        >
          {conclusion}
        </p>
      </div>
    </section>
  );
}
