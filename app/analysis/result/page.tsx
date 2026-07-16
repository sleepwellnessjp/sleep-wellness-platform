"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AnalysisMetrics,
  AnalysisResult,
  loadAnalysisResult,
} from "@/lib/analysis-session";

const NAVY = "#071426";
const GOLD = "#9d7a2d";

type MetricDef = {
  key: keyof AnalysisMetrics;
  label: string;
};

const reportMetrics: MetricDef[] = [
  { key: "bedtime", label: "入眠" },
  { key: "wakeTime", label: "起床" },
  { key: "sleepDuration", label: "睡眠時間" },
  { key: "sleepEfficiency", label: "睡眠効率" },
  { key: "deepSleep", label: "深い睡眠" },
  { key: "hrv", label: "HRV" },
  { key: "stress", label: "ストレス" },
  { key: "spo2", label: "SpO₂" },
];

function formatMetricValue(
  key: keyof AnalysisMetrics,
  metrics: AnalysisMetrics,
): string {
  if (key === "sleepScore") {
    const score = metrics.sleepScore;
    if (score === null || score === undefined) return "—";
    return `${score}`;
  }

  const value = metrics[key];
  return typeof value === "string" && value.trim() ? value : "—";
}

function takeItems(items: string[] | undefined, max: number): string[] {
  if (!items?.length) return [];
  return items.slice(0, max);
}

function clampSentences(text: string, maxSentences: number): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const parts = trimmed.match(/[^.!?。！？]+[.!?。！？]?/g);
  if (!parts) return trimmed;

  const sentences = parts.map((part) => part.trim()).filter(Boolean);
  if (sentences.length <= maxSentences) return trimmed;
  return sentences.slice(0, maxSentences).join("");
}

function clampLine(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars - 1).trimEnd()}…`;
}

function formatDateLabel(value?: string): string {
  if (!value?.trim()) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function splitActions(actions: string[]): {
  primary: string | null;
  next: string[];
} {
  const limited = takeItems(actions, 3).map((item) => clampLine(item, 90));
  if (limited.length === 0) return { primary: null, next: [] };
  return { primary: limited[0], next: limited.slice(1) };
}

export default function AnalysisResultPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const stored = loadAnalysisResult();

    if (!stored) {
      setMissing(true);
      return;
    }

    setResult(stored);
  }, []);

  if (missing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5 py-20">
        <div className="w-full max-w-md rounded-[20px] border border-slate-200 bg-white p-10 text-center sm:max-w-lg sm:p-12">
          <p
            className="text-[11px] font-semibold tracking-[0.32em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS REPORT
          </p>

          <h1
            className="mt-5 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            分析結果がありません
          </h1>

          <p className="mt-5 text-sm leading-7 text-slate-500 sm:text-base sm:leading-8">
            新しい分析を開始してください。
          </p>

          <Link
            href="/analysis/new"
            className="mt-8 inline-flex rounded-full px-8 py-4 text-base font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            新しい分析を作成
          </Link>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-slate-400">読み込み中...</p>
      </main>
    );
  }

  const score = Math.max(0, Math.min(100, Math.round(result.score)));
  const goodPoints = takeItems(result.goodPoints, 3).map((item) =>
    clampLine(item, 88),
  );
  const improvements = takeItems(result.improvements, 2).map((item) =>
    clampLine(item, 88),
  );
  const possibleFactors = takeItems(result.possibleFactors, 3).map((item) =>
    clampLine(item, 88),
  );
  const { primary: primaryAction, next: nextActions } = splitActions(
    result.actions,
  );
  const summaryText = clampSentences(result.summary, 4);
  const yogaText = clampLine(result.yoga ?? "", 160);
  const cautionText = clampLine(result.caution ?? "", 120);
  const disclaimerText = clampLine(result.disclaimer ?? "", 120);

  return (
    <main className="report-print-root min-h-screen bg-[#f5f5f3] py-8 print:bg-white print:py-0 sm:py-12 md:py-16">
      <div className="report-sheet mx-auto max-w-[820px] px-4 print:max-w-none print:px-0 sm:px-6">
        <article className="report-article overflow-hidden rounded-[22px] border border-slate-200/80 bg-white px-5 py-8 shadow-[0_24px_70px_-48px_rgba(7,20,38,.22)] print:overflow-visible print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none sm:rounded-[24px] sm:px-9 sm:py-10 md:px-11 md:py-11">
          {/* Header */}
          <header className="report-header">
            <div className="flex items-start justify-between gap-4 border-b border-[#071426]/12 pb-5 sm:pb-6">
              <div className="min-w-0">
                <Image
                  src="/swij-logo-horizontal.png"
                  alt="Sleep Wellness Institute Japan"
                  width={220}
                  height={55}
                  className="report-logo h-auto w-[118px] object-contain sm:w-[148px]"
                  priority
                />
                <h1
                  className="report-title mt-4 text-[1.45rem] font-semibold tracking-[-0.04em] sm:mt-5 sm:text-[1.85rem]"
                  style={{ color: NAVY }}
                >
                  Sleep Wellness Report
                  <span style={{ color: GOLD }}>™</span>
                </h1>
              </div>

              <div className="report-score-block shrink-0 text-right">
                <p
                  className="text-[9px] font-semibold tracking-[0.22em] sm:text-[10px]"
                  style={{ color: GOLD }}
                >
                  WELLNESS SCORE
                </p>
                <p
                  className="report-score mt-1 text-[2.6rem] leading-none font-semibold tracking-[-0.06em] sm:text-[3.1rem]"
                  style={{ color: NAVY }}
                >
                  {score}
                </p>
                <p className="mt-1 text-[10px] tracking-[0.12em] text-slate-400">
                  / 100
                </p>
              </div>
            </div>

            <div className="report-meta mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 sm:mt-5">
              <p>
                <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                  NAME
                </span>
                <span className="font-medium" style={{ color: NAVY }}>
                  {result.clientName?.trim() || "—"}
                </span>
              </p>
              <p>
                <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                  DATE
                </span>
                <span className="font-medium" style={{ color: NAVY }}>
                  {formatDateLabel(result.measurementDate)}
                </span>
              </p>
            </div>
          </header>

          {/* Metrics grid */}
          <section className="report-metrics mt-6 sm:mt-7">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
              {reportMetrics.map(({ key, label }) => (
                <div
                  key={key}
                  className="report-metric rounded-[8px] border border-[#071426]/10 bg-[#fafaf8] px-3 py-3 sm:px-3.5 sm:py-3.5"
                >
                  <p className="text-[10px] font-medium tracking-[0.04em] text-slate-400">
                    {label}
                  </p>
                  <p
                    className="mt-1.5 text-[0.98rem] font-semibold tracking-[-0.03em] sm:text-[1.05rem]"
                    style={{ color: NAVY }}
                  >
                    {formatMetricValue(key, result.metrics)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Assessment */}
          <section className="report-assessment mt-6 border border-[#071426]/10 bg-[#fafafa] px-4 py-5 sm:mt-7 sm:px-5 sm:py-5">
            <div className="flex items-baseline justify-between gap-3 border-b border-[#071426]/10 pb-2.5">
              <h2
                className="text-[0.95rem] font-semibold tracking-[-0.02em] sm:text-base"
                style={{ color: NAVY }}
              >
                総合評価
              </h2>
              <p
                className="text-[9px] font-semibold tracking-[0.22em]"
                style={{ color: GOLD }}
              >
                OVERVIEW
              </p>
            </div>
            <p className="report-summary mt-3 text-[0.88rem] leading-7 text-slate-600 sm:text-[0.92rem] sm:leading-7">
              {summaryText}
            </p>
          </section>

          {/* Good / Improve */}
          <section className="report-split mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
            <div className="report-panel rounded-[8px] border border-[#071426]/10 px-4 py-4 sm:px-5">
              <h2
                className="text-[0.92rem] font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                良かった点
              </h2>
              <ul className="mt-3 space-y-2">
                {goodPoints.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[0.84rem] leading-6 text-slate-600"
                  >
                    <span
                      className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: GOLD }}
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="report-panel rounded-[8px] border border-[#071426]/10 px-4 py-4 sm:px-5">
              <h2
                className="text-[0.92rem] font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                改善余地
              </h2>
              <ul className="mt-3 space-y-2">
                {improvements.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[0.84rem] leading-6 text-slate-600"
                  >
                    <span
                      className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-slate-300"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Factors & Actions */}
          <section className="report-split mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
            <div className="report-panel rounded-[8px] border border-[#071426]/10 px-4 py-4 sm:px-5">
              <h2
                className="text-[0.92rem] font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                考えられる要因
              </h2>
              <ul className="mt-3 space-y-2">
                {possibleFactors.map((item) => (
                  <li
                    key={item}
                    className="text-[0.84rem] leading-6 text-slate-600"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="report-panel rounded-[8px] border border-[#071426]/10 px-4 py-4 sm:px-5">
              <h2
                className="text-[0.92rem] font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                アクション
              </h2>

              {primaryAction && (
                <div className="mt-3 border-l-2 pl-3" style={{ borderColor: GOLD }}>
                  <p
                    className="text-[9px] font-semibold tracking-[0.18em]"
                    style={{ color: GOLD }}
                  >
                    最優先
                  </p>
                  <p className="mt-1 text-[0.84rem] leading-6 text-slate-600">
                    {primaryAction}
                  </p>
                </div>
              )}

              {nextActions.length > 0 && (
                <div className="mt-3">
                  <p className="text-[9px] font-semibold tracking-[0.18em] text-slate-400">
                    次のアクション
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {nextActions.map((item) => (
                      <li
                        key={item}
                        className="text-[0.84rem] leading-6 text-slate-600"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Yoga */}
          <section className="report-yoga mt-5 rounded-[8px] border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                className="text-[0.92rem] font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                メラトニンヨガ™ / 呼吸・休養
              </h2>
              <p
                className="text-[9px] font-semibold tracking-[0.18em]"
                style={{ color: GOLD }}
              >
                PRACTICE
              </p>
            </div>
            <p className="mt-2.5 text-[0.84rem] leading-6 text-slate-600">
              {yogaText || "—"}
            </p>
          </section>

          {/* Caution / Disclaimer */}
          {(cautionText || disclaimerText) && (
            <section className="report-disclaimer mt-5 border-t border-[#071426]/12 pt-4 sm:mt-6">
              <h2
                className="text-[0.8rem] font-semibold tracking-[-0.01em]"
                style={{ color: NAVY }}
              >
                注意事項／免責
              </h2>
              {cautionText && (
                <p className="mt-2 text-[0.75rem] leading-5 text-slate-500">
                  {cautionText}
                </p>
              )}
              {disclaimerText && (
                <p className="mt-1.5 text-[0.72rem] leading-5 text-slate-400">
                  {disclaimerText}
                </p>
              )}
            </section>
          )}
        </article>

        <div className="no-print mt-8 flex flex-col gap-3 pb-6 sm:mt-10 sm:flex-row sm:justify-center sm:pb-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full px-8 py-4 text-base font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            PDFダウンロード
          </button>

          <Link
            href="/analysis/new"
            className="rounded-full border border-slate-200 bg-white px-8 py-4 text-center text-base font-semibold transition hover:bg-slate-50"
            style={{ color: NAVY }}
          >
            新しい分析を作成
          </Link>
        </div>
      </div>
    </main>
  );
}
