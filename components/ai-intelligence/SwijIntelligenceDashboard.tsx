"use client";

import type { ReactNode } from "react";
import AiSourceBadge from "@/components/ai-intelligence/AiSourceBadge";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import type { SwijIntelligenceReport } from "@/lib/ai-intelligence";

export default function SwijIntelligenceDashboard({
  report,
}: {
  report: SwijIntelligenceReport;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-[#8a6a2d]/22 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-5 sm:px-6 sm:py-6">
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          SWIJ INTELLIGENCE
        </p>
        <h3
          className="mt-1.5 text-[1.15rem] font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          プラットフォーム横断 AI 分析
        </h3>
        <p className="mt-3 text-[14px] leading-7 text-slate-700">
          {report.summary}
        </p>
        <div className="mt-4">
          <AiSourceBadge source={report.source} />
        </div>
      </div>

      <Section title="全国平均">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {report.nationalAverages.map((row) => (
            <div
              key={row.metric}
              className="rounded-2xl border border-[#071426]/08 bg-[#fafaf8] px-4 py-4"
            >
              <p className="text-[11px] font-semibold tracking-[0.1em] text-slate-400">
                {row.metric}
              </p>
              <p
                className="mt-2 text-[1.45rem] font-semibold tabular-nums tracking-[-0.04em]"
                style={{ color: NAVY }}
              >
                {row.value}
                <span className="ml-0.5 text-[12px] font-medium text-slate-400">
                  {row.unit}
                </span>
              </p>
              <p
                className="mt-1 text-[12px] tabular-nums"
                style={{
                  color: row.deltaVsPrevMonth >= 0 ? TEAL : "#B45309",
                }}
              >
                前月比 {row.deltaVsPrevMonth >= 0 ? "+" : ""}
                {row.deltaVsPrevMonth}
                {row.unit}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="年代別比較">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="py-2 pr-4 font-semibold">年代</th>
                <th className="py-2 pr-4 font-semibold">スコア</th>
                <th className="py-2 pr-4 font-semibold">効率</th>
                <th className="py-2 font-semibold">ストレス</th>
              </tr>
            </thead>
            <tbody>
              {report.ageGroupComparisons.map((row) => (
                <tr
                  key={row.ageGroup}
                  className="border-b border-slate-100"
                  style={{ color: NAVY }}
                >
                  <td className="py-2.5 pr-4 font-medium">{row.ageGroup}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{row.sleepScore}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{row.efficiency}%</td>
                  <td className="py-2.5 tabular-nums">{row.stress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="改善率ランキング">
          <RankingList items={report.improvementRankings} />
        </Section>
        <Section title="認定講師ランキング">
          <RankingList items={report.instructorRankings} />
        </Section>
      </div>

      <Section title="イベント効果">
        <ul className="space-y-3">
          {report.eventEffects.map((ev) => (
            <li
              key={ev.eventName}
              className="rounded-2xl border border-[#071426]/06 bg-[#fafaf8] px-4 py-3.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold" style={{ color: NAVY }}>
                  {ev.eventName}
                </p>
                <p className="text-[13px] font-semibold tabular-nums" style={{ color: TEAL }}>
                  +{ev.deltaPercent}%
                </p>
              </div>
              <p className="mt-1 text-[12px] text-slate-400">{ev.periodLabel}</p>
              <p className="mt-1.5 text-[13px] leading-6 text-slate-600">
                {ev.effectSummary}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="季節変動">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {report.seasonalTrends.map((s) => (
            <div
              key={s.season}
              className="rounded-2xl border border-[#071426]/06 bg-white px-4 py-4"
            >
              <p
                className="text-[11px] font-semibold tracking-[0.14em]"
                style={{ color: GOLD }}
              >
                {s.season}
              </p>
              <p
                className="mt-2 text-[1.25rem] font-semibold tabular-nums"
                style={{ color: NAVY }}
              >
                {s.sleepScoreAvg}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-slate-600">
                {s.insight}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-[#071426]/08 bg-white px-5 py-5 sm:px-6">
      <h4
        className="text-[15px] font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        {title}
      </h4>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RankingList({
  items,
}: {
  items: SwijIntelligenceReport["improvementRankings"];
}) {
  return (
    <ol className="space-y-2.5">
      {items.map((item) => (
        <li
          key={`${item.rank}-${item.label}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-[#071426]/05 bg-[#fafaf8] px-3 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
              style={{ backgroundColor: item.rank <= 3 ? GOLD : NAVY }}
            >
              {item.rank}
            </span>
            <span className="truncate text-[14px] font-medium" style={{ color: NAVY }}>
              {item.label}
            </span>
          </div>
          <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: TEAL }}>
            {item.value}
            {item.unit}
          </span>
        </li>
      ))}
    </ol>
  );
}
