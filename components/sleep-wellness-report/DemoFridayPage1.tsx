"use client";

import Image from "next/image";
import { GOLD, GOLD_MID, NAVY, SUCCESS } from "@/components/ui/tokens";
import MethodStoryRail, {
  MethodStoryPrintLine,
} from "@/components/sleep-wellness-report/MethodStoryRail";
import {
  formatDeviceName,
  formatGeneratedAt,
} from "@/components/sleep-wellness-report/report-ui";
import type { CounselingTodaySummary } from "@/lib/sleep-analysis/counseling-view-model";
import {
  buildFactorInsightRows,
  type FactorInsightRow,
} from "@/lib/sleep-analysis/demo-report-copy";
import type { SleepWellnessScoreFactor } from "@/lib/sleep-analysis/sleep-wellness-score";

function scoreColor(score: number): string {
  if (score >= 75) return SUCCESS;
  if (score >= 55) return GOLD_MID;
  return "#a33a3a";
}

function evalBadgeStyle(label: string): { color: string; bg: string } {
  if (label === "良好") {
    return { color: SUCCESS, bg: "rgba(46,125,90,0.12)" };
  }
  if (label === "平均") {
    return { color: GOLD_MID, bg: "rgba(138,106,45,0.12)" };
  }
  return { color: "#a33a3a", bg: "rgba(163,58,58,0.1)" };
}

function MetricEvidenceRow({ row }: { row: FactorInsightRow }) {
  const color = scoreColor(row.score);
  const badge = evalBadgeStyle(row.evalLabel);
  return (
    <li className="swr-metric-ev rounded-lg border border-[rgba(7,20,38,0.06)] bg-[#f7f8f8] px-2.5 py-2.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold" style={{ color: NAVY }}>
            {row.label}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgba(7,20,38,0.08)]">
            <div
              className="h-full rounded-full"
              style={{ width: `${row.score}%`, backgroundColor: color }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[11px] leading-4 text-slate-600">
              <span className="text-slate-400">実測：</span>
              {row.measured}
            </p>
            <p className="text-[11px] leading-4 text-slate-400">
              {row.reference}
            </p>
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
              style={{ color: badge.color, backgroundColor: badge.bg }}
            >
              {row.evalLabel}
            </span>
          </div>
          <p className="swr-metric-reason mt-1.5 text-[12px] leading-5 text-slate-600">
            {row.reason}
          </p>
        </div>
        <p
          className="swr-metric-score shrink-0 pt-0.5 text-[22px] font-semibold leading-none tabular-nums tracking-[-0.03em] sm:text-[24px]"
          style={{ color }}
        >
          {row.score}
          <span className="ml-0.5 text-[11px] font-semibold tracking-normal">
            点
          </span>
        </p>
      </div>
    </li>
  );
}

export type DemoPage1Props = {
  clientName?: string | null;
  measurementDate?: string | null;
  device: string;
  generatedAt: string;
  totalScore: number | null;
  grade: string | null;
  headline: string;
  coverageLabel: string;
  summary: CounselingTodaySummary;
  factors: SleepWellnessScoreFactor[];
  clientAge?: number | null;
  clientGender?: "female" | "male" | "other" | null;
};

/** PAGE 1 — Assessment（Score / Summary / 実測） Ver.1.0 */
export default function DemoFridayPage1({
  clientName,
  measurementDate,
  device,
  generatedAt,
  totalScore,
  grade,
  headline,
  coverageLabel,
  summary,
  factors,
  clientAge = null,
  clientGender = null,
}: DemoPage1Props) {
  const insightRows = buildFactorInsightRows({
    factors,
    age: clientAge,
    gender: clientGender,
  });

  return (
    <section className="swr-print-page swr-print-page-1 space-y-3">
      <MethodStoryRail active={["score", "summary", "reason"]} />
      <MethodStoryPrintLine />

      <header className="rounded-[16px] border border-[rgba(138,106,45,0.22)] bg-white px-3.5 py-3 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={180}
              height={45}
              className="h-auto w-[88px] object-contain"
              priority
            />
            <p
              className="mt-1.5 text-[10px] font-semibold tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              PAGE 1 · Assessment · Ver.1.0
            </p>
            <h1
              className="mt-0.5 text-[1.15rem] font-semibold tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              Sleep Wellness Score
            </h1>
          </div>
          <div className="text-right text-[11px] leading-4 text-slate-500">
            {clientName ? (
              <p className="font-medium" style={{ color: NAVY }}>
                {clientName} 様
              </p>
            ) : null}
            {measurementDate ? <p>測定日 {measurementDate}</p> : null}
            <p>{formatDeviceName(device)}</p>
            <p>{formatGeneratedAt(generatedAt)}</p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-end gap-3">
          <p
            className="text-[2.75rem] font-semibold leading-none tracking-[-0.06em]"
            style={{ color: NAVY }}
          >
            {totalScore ?? "—"}
          </p>
          <div className="space-y-0.5 pb-0.5">
            <span
              className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
              style={{ background: GOLD_MID }}
            >
              {grade ? `Grade ${grade}` : "Grade —"}
            </span>
            <p className="text-[11px] text-slate-400">100点満点</p>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-5" style={{ color: NAVY }}>
          {headline}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">{coverageLabel}</p>
      </header>

      <div
        className="swr-summary rounded-[16px] border border-[rgba(7,20,38,0.06)] bg-[#f4f5f5] px-3.5 py-3 sm:px-4"
      >
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Today&apos;s Summary
        </p>
        <p className="mt-1.5 text-[13px] leading-5" style={{ color: NAVY }}>
          {summary.currentState}
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          <div className="rounded-lg bg-white/80 px-2.5 py-1.5">
            <p
              className="swr-summary-point-label text-[10.5px] font-semibold"
              style={{ color: SUCCESS }}
            >
              良い点
            </p>
            <ul className="mt-0.5 space-y-0">
              {summary.goodPoints.slice(0, 3).map((p) => (
                <li
                  key={p}
                  className="swr-summary-point-item text-[12.5px] leading-4 text-slate-600"
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-white/80 px-2.5 py-1.5">
            <p
              className="swr-summary-point-label text-[10.5px] font-semibold"
              style={{ color: GOLD }}
            >
              注意点
            </p>
            <ul className="mt-0.5 space-y-0">
              {summary.cautionPoints.slice(0, 3).map((p) => (
                <li
                  key={p}
                  className="swr-summary-point-item text-[12.5px] leading-4 text-slate-600"
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-1.5 text-[12px] leading-4" style={{ color: NAVY }}>
          {summary.weeklyTheme}
        </p>
      </div>

      <div className="swr-metrics !mt-5 rounded-[16px] border border-[rgba(7,20,38,0.07)] bg-white px-3.5 py-3.5 sm:px-4">
        <p
          className="swr-metrics-title py-0.5 text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          実測データ（Assessment）
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          実測 · Reference · 評価 · 理由
        </p>
        {insightRows.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {insightRows.map((row) => (
              <MetricEvidenceRow key={row.key} row={row} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-slate-500">
            表示可能な実測データがありません。
          </p>
        )}
      </div>
    </section>
  );
}
