"use client";

import type { ReactNode } from "react";
import type { SleepWellnessReport } from "@/lib/sleep-analysis/sleep-wellness-report";
import type { InsightSeverity } from "@/lib/sleep-analysis/sleep-wellness-insight-rules";
import {
  CARD_CLASS,
  GOLD,
  GOLD_LIGHT,
  GOLD_MID,
  NAVY,
  SUCCESS,
  TEAL,
} from "@/components/ui/tokens";

const DEVICE_LABEL: Record<string, string> = {
  soxai: "SOXAI",
  oura: "Oura Ring",
  apple_watch: "Apple Watch",
  garmin: "Garmin",
  fitbit: "Fitbit",
  other: "Wearable",
  manual: "手動入力",
};

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-[0.2em]"
      style={{ color: GOLD }}
    >
      {children}
    </p>
  );
}

function ReportCard({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "hero" | "warm" | "teal" | "memo";
}) {
  const toneClass =
    tone === "hero"
      ? "border-[color:rgba(138,106,45,0.28)] bg-gradient-to-br from-[#fffdf8] via-white to-[#f4f7f8]"
      : tone === "warm"
        ? "border-[color:rgba(138,106,45,0.22)] bg-[#fffdf9]"
        : tone === "teal"
          ? "border-[color:rgba(49,95,104,0.2)] bg-gradient-to-br from-white to-[#f3f7f8]"
          : tone === "memo"
            ? "border-[color:rgba(7,20,38,0.12)] bg-[#f8fafb]"
            : "";
  return (
    <section
      className={`${CARD_CLASS} overflow-hidden p-5 sm:p-6 ${toneClass} ${className}`}
    >
      {children}
    </section>
  );
}

function ScoreRing({
  score,
  grade,
}: {
  score: number | null;
  grade: string | null;
}) {
  const value = score ?? 0;
  const pct = Math.max(0, Math.min(100, value));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative mx-auto h-[148px] w-[148px] sm:h-[168px] sm:w-[168px]">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="rgba(7,20,38,0.08)"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={GOLD_MID}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="text-[2.6rem] font-semibold leading-none tracking-[-0.04em] sm:text-[3rem]"
          style={{ color: NAVY }}
        >
          {score != null ? score : "—"}
        </p>
        <p className="mt-1 text-[11px] font-medium tracking-[0.16em]" style={{ color: GOLD }}>
          {grade ? `GRADE ${grade}` : "SCORE"}
        </p>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: 1 | 2 | 3 }) {
  const bg =
    rank === 1 ? GOLD_MID : rank === 2 ? TEAL : "rgba(7,20,38,0.55)";
  return (
    <span
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-[12px] font-semibold text-white"
      style={{ backgroundColor: bg }}
    >
      {rank}
    </span>
  );
}

function SeverityPill({ severity }: { severity: InsightSeverity }) {
  const map = {
    high: { label: "重要", color: "#a33a3a", bg: "rgba(163,58,58,0.1)" },
    medium: { label: "注意", color: GOLD, bg: "rgba(138,106,45,0.12)" },
    low: { label: "観察", color: TEAL, bg: "rgba(49,95,104,0.1)" },
  } as const;
  const s = map[severity];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.06em]"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {s.label}
    </span>
  );
}

function FactorBar({
  label,
  score,
  status,
}: {
  label: string;
  score: number;
  status: "strong" | "fair" | "weak";
}) {
  const color =
    status === "strong" ? SUCCESS : status === "fair" ? GOLD_MID : "#a33a3a";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium" style={{ color: NAVY }}>
          {label}
        </span>
        <span className="text-[13px] tabular-nums" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[rgba(7,20,38,0.06)]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function formatDevice(device: string): string {
  return DEVICE_LABEL[device] ?? device;
}

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

export type SleepWellnessReportViewProps = {
  report: SleepWellnessReport;
  clientName?: string | null;
  measurementDate?: string | null;
  /** クライアント提示時はインストラクターメモを折りたたみ開始 */
  instructorMemoDefaultOpen?: boolean;
  className?: string;
};

export default function SleepWellnessReportView({
  report,
  clientName,
  measurementDate,
  instructorMemoDefaultOpen = false,
  className = "",
}: SleepWellnessReportViewProps) {
  const { overallEvaluation, priorityImprovements, analysis, todaysActions, instructorMemo } =
    report;

  return (
    <div className={`mx-auto w-full max-w-lg space-y-4 sm:space-y-5 ${className}`}>
      {/* Brand header */}
      <header className="px-1 pt-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          Sleep Wellness Platform
        </p>
        <h1
          className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-[-0.035em] sm:text-[1.85rem]"
          style={{ color: NAVY }}
        >
          Sleep Wellness Report
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
          {clientName ? <span>{clientName} 様</span> : null}
          {measurementDate ? <span>計測日 {measurementDate}</span> : null}
          <span>{formatDevice(overallEvaluation.device)}</span>
          <span>{formatGeneratedAt(report.meta.generatedAt)}</span>
        </div>
      </header>

      {/* 1. Overall */}
      <ReportCard tone="hero" className="animate-[fade-up_0.7s_var(--sw-ease-out)_both]">
        <SectionEyebrow>01 · 総合評価</SectionEyebrow>
        <div className="mt-4 flex flex-col items-center gap-4 sm:mt-5">
          <ScoreRing
            score={overallEvaluation.totalScore}
            grade={overallEvaluation.grade}
          />
          <div className="w-full text-center">
            <h2
              className="text-[1.15rem] font-semibold leading-snug tracking-[-0.02em] sm:text-[1.25rem]"
              style={{ color: NAVY }}
            >
              {overallEvaluation.headline}
            </h2>
            <p className="mt-3 text-left text-[14px] leading-7 text-slate-600 sm:text-[15px]">
              {overallEvaluation.summary}
            </p>
            <p className="mt-3 text-[11px] tracking-[0.04em] text-slate-400">
              {overallEvaluation.coverageLabel}
            </p>
          </div>
        </div>
      </ReportCard>

      {/* 2. Priority */}
      <ReportCard
        tone="warm"
        className="animate-[fade-up_0.7s_var(--sw-ease-out)_both] [animation-delay:60ms]"
      >
        <SectionEyebrow>02 · 優先改善項目</SectionEyebrow>
        <h2
          className="mt-2 text-[1.2rem] font-semibold tracking-[-0.02em]"
          style={{ color: NAVY }}
        >
          いま整える順番
        </h2>
        {priorityImprovements.length === 0 ? (
          <p className="mt-4 text-[14px] leading-7 text-slate-500">
            明確な優先改善項目は検出されませんでした。現状のリズムを維持しましょう。
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {priorityImprovements.map((item) => (
              <li
                key={item.key}
                className="rounded-2xl border border-[rgba(7,20,38,0.08)] bg-white/90 p-4"
              >
                <div className="flex items-start gap-3">
                  <RankBadge rank={item.rank} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p
                        className="text-[16px] font-semibold tracking-[-0.02em]"
                        style={{ color: NAVY }}
                      >
                        {item.rankLabel}：{item.label}
                      </p>
                      {item.metricScore != null ? (
                        <span className="text-[12px] tabular-nums text-slate-400">
                          {item.metricScore}点
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-slate-600">
                      {item.reason}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </ReportCard>

      {/* 3. Analysis */}
      <ReportCard className="animate-[fade-up_0.7s_var(--sw-ease-out)_both] [animation-delay:120ms]">
        <SectionEyebrow>03 · 分析内容</SectionEyebrow>
        <h2
          className="mt-2 text-[1.2rem] font-semibold tracking-[-0.02em]"
          style={{ color: NAVY }}
        >
          複数指標から見た読み解き
        </h2>
        <p className="mt-3 text-[14px] leading-7 text-slate-600">
          {analysis.overview}
        </p>

        {analysis.causes.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {analysis.causes.map((cause) => (
              <li
                key={cause.title}
                className="rounded-2xl border border-[rgba(7,20,38,0.08)] bg-[var(--sw-surface-warm)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityPill severity={cause.severity} />
                  <p
                    className="text-[15px] font-semibold tracking-[-0.02em]"
                    style={{ color: NAVY }}
                  >
                    {cause.title}
                  </p>
                </div>
                <p className="mt-2 text-[13px] leading-6 text-slate-600">
                  {cause.description}
                </p>
                {cause.evidenceLabels.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cause.evidenceLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-[rgba(7,20,38,0.08)] bg-white px-2.5 py-1 text-[11px] text-slate-500"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[13px] leading-6 text-slate-500">
            複合的な悪化パターンは検出されませんでした。
          </p>
        )}

        {analysis.factorHighlights.length > 0 ? (
          <div className="mt-6 space-y-3 border-t border-[rgba(7,20,38,0.06)] pt-5">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-slate-400">
              指標バランス
            </p>
            {analysis.factorHighlights.slice(0, 8).map((f) => (
              <FactorBar
                key={f.label}
                label={f.label}
                score={f.score}
                status={f.status}
              />
            ))}
          </div>
        ) : null}
      </ReportCard>

      {/* 4. Today's actions */}
      <ReportCard
        tone="teal"
        className="animate-[fade-up_0.7s_var(--sw-ease-out)_both] [animation-delay:180ms]"
      >
        <SectionEyebrow>04 · Today&apos;s Actions</SectionEyebrow>
        <h2
          className="mt-2 text-[1.2rem] font-semibold tracking-[-0.02em]"
          style={{ color: NAVY }}
        >
          今日の改善アクション
        </h2>
        <ol className="mt-4 space-y-3">
          {todaysActions.map((action) => (
            <li
              key={`${action.order}-${action.title}`}
              className="rounded-2xl border border-[rgba(49,95,104,0.14)] bg-white/95 p-4"
            >
              <div className="flex gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                  style={{ backgroundColor: TEAL }}
                >
                  {action.order}
                </span>
                <div className="min-w-0">
                  <p
                    className="text-[15px] font-semibold leading-snug tracking-[-0.02em]"
                    style={{ color: NAVY }}
                  >
                    {action.title}
                  </p>
                  {action.relatedPriorityLabel ? (
                    <p className="mt-1 text-[11px]" style={{ color: GOLD }}>
                      {action.relatedPriorityLabel} に対応
                    </p>
                  ) : null}
                  <p className="mt-2 text-[13px] leading-6 text-slate-600">
                    {action.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </ReportCard>

      {/* 5. Instructor memo */}
      <ReportCard
        tone="memo"
        className="animate-[fade-up_0.7s_var(--sw-ease-out)_both] [animation-delay:240ms]"
      >
        <details open={instructorMemoDefaultOpen} className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionEyebrow>05 · Instructor Memo</SectionEyebrow>
                <h2
                  className="mt-2 text-[1.15rem] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  インストラクター向けメモ
                </h2>
                <p className="mt-1 text-[12px] text-slate-400">
                  クライアント提示時は閉じたまま使えます
                </p>
              </div>
              <span
                className="mt-1 text-[12px] font-medium group-open:hidden"
                style={{ color: GOLD }}
              >
                開く
              </span>
              <span
                className="mt-1 hidden text-[12px] font-medium group-open:inline"
                style={{ color: GOLD }}
              >
                閉じる
              </span>
            </div>
          </summary>

          <div className="mt-4 space-y-3 border-t border-[rgba(7,20,38,0.06)] pt-4">
            {instructorMemo.caution ? (
              <div className="rounded-2xl border border-[rgba(163,58,58,0.2)] bg-[rgba(163,58,58,0.06)] px-4 py-3">
                <p className="text-[12px] font-semibold" style={{ color: "#a33a3a" }}>
                  注意
                </p>
                <p className="mt-1 text-[13px] leading-6 text-slate-700">
                  {instructorMemo.caution}
                </p>
              </div>
            ) : null}

            <ul className="space-y-2.5">
              {instructorMemo.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex gap-2 text-[13px] leading-6 text-slate-600"
                >
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: GOLD_LIGHT }}
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            {instructorMemo.dataGaps.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
                  未取得指標
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {instructorMemo.dataGaps.map((gap) => (
                    <span
                      key={gap}
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-[rgba(7,20,38,0.08)]"
                    >
                      {gap}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </details>
      </ReportCard>

      <p className="px-1 pb-6 text-center text-[11px] leading-5 text-slate-400">
        Sleep Wellness Score / Insight / Priority によるルールベースレポートです。
        医療診断ではありません。
      </p>
    </div>
  );
}
