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
const TEAL = "#315f68";

type MetricDef = {
  key: keyof AnalysisMetrics;
  label: string;
  unit?: string;
};

const primaryMetrics: MetricDef[] = [
  { key: "sleepDuration", label: "睡眠時間" },
  { key: "deepSleep", label: "深い睡眠" },
  { key: "hrv", label: "HRV" },
  { key: "stress", label: "ストレス" },
  { key: "spo2", label: "SpO₂" },
  { key: "sleepEfficiency", label: "睡眠効率" },
];

const secondaryMetrics: MetricDef[] = [
  { key: "sleepScore", label: "睡眠スコア" },
  { key: "awakenings", label: "途中覚醒" },
  { key: "heartRate", label: "心拍" },
  { key: "skinTemperature", label: "皮膚温度" },
];

function formatMetricValue(
  key: keyof AnalysisMetrics,
  metrics: AnalysisMetrics,
  fallbackScore?: number,
): string {
  if (key === "sleepScore") {
    const score = metrics.sleepScore;
    if (score === null || score === undefined) {
      return fallbackScore !== undefined ? `${fallbackScore}` : "—";
    }
    return `${score}`;
  }

  const value = metrics[key];
  return value.trim() ? value : "—";
}

function hasMetricValue(
  key: keyof AnalysisMetrics,
  metrics: AnalysisMetrics,
): boolean {
  if (key === "sleepScore") {
    return metrics.sleepScore !== null && metrics.sleepScore !== undefined;
  }
  return typeof metrics[key] === "string" && metrics[key].trim().length > 0;
}

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative mx-auto flex h-[148px] w-[148px] items-center justify-center sm:h-[168px] sm:w-[168px]">
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#eef1f3"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={GOLD}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>

      <div className="relative text-center">
        <p
          className="text-[3.25rem] leading-none font-semibold tracking-[-0.06em] sm:text-[3.75rem]"
          style={{ color: NAVY }}
        >
          {clamped}
        </p>
        <p className="mt-1 text-[11px] font-medium tracking-[0.16em] text-slate-400">
          / 100
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`report-card rounded-[20px] border px-4 py-5 sm:rounded-[22px] sm:px-5 sm:py-6 ${
        emphasize
          ? "border-slate-200/90 bg-[#fafaf8]"
          : "border-slate-100 bg-white"
      }`}
    >
      <p className="text-[11px] font-medium tracking-[0.04em] text-slate-400 sm:text-xs">
        {label}
      </p>
      <p
        className="mt-2.5 text-[1.35rem] font-semibold tracking-[-0.04em] sm:mt-3 sm:text-[1.55rem]"
        style={{ color: NAVY }}
      >
        {value}
      </p>
    </div>
  );
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
        <div className="w-full max-w-md rounded-[28px] border border-slate-100 bg-white p-10 text-center shadow-[0_24px_60px_-36px_rgba(7,20,38,.18)] sm:max-w-lg sm:p-12">
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

  const shownPrimary = primaryMetrics.filter(({ key }) =>
    hasMetricValue(key, result.metrics),
  );
  const shownSecondary = secondaryMetrics.filter(({ key }) =>
    hasMetricValue(key, result.metrics),
  );

  const displayPrimary =
    shownPrimary.length > 0
      ? shownPrimary
      : primaryMetrics.slice(0, 4);

  const displaySecondary =
    shownSecondary.length > 0
      ? shownSecondary
      : [{ key: "sleepScore" as const, label: "睡眠スコア" }];

  return (
    <main className="report-print-root min-h-screen bg-[#f5f5f3] py-8 print:bg-white print:py-0 sm:py-12 md:py-16">
      <div className="report-sheet mx-auto max-w-[780px] px-4 print:max-w-none print:px-0 sm:px-6">
        <article className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white px-5 py-10 shadow-[0_28px_80px_-48px_rgba(7,20,38,.2)] print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none sm:rounded-[32px] sm:px-10 sm:py-12 md:px-14 md:py-14">
          {/* Header */}
          <header className="report-card text-center">
            <div
              className="mx-auto mb-6 h-px w-12 sm:mb-8 sm:w-14"
              style={{ backgroundColor: GOLD }}
              aria-hidden
            />

            <p
              className="text-[10px] font-semibold tracking-[0.34em] sm:text-[11px] sm:tracking-[0.36em]"
              style={{ color: GOLD }}
            >
              SLEEP WELLNESS INSTITUTE JAPAN
            </p>

            <h1
              className="mt-4 text-[1.65rem] font-semibold tracking-[-0.045em] sm:mt-5 sm:text-[2.2rem] md:text-[2.55rem]"
              style={{ color: NAVY }}
            >
              Sleep Wellness Report
              <span style={{ color: GOLD }}>™</span>
            </h1>
          </header>

          {/* Score */}
          <section className="report-card mt-10 sm:mt-12">
            <p
              className="text-center text-[10px] font-semibold tracking-[0.28em] sm:text-[11px]"
              style={{ color: GOLD }}
            >
              SLEEP WELLNESS SCORE
            </p>
            <div className="mt-5 sm:mt-6">
              <ScoreRing score={result.score} />
            </div>
          </section>

          {/* Summary */}
          <section className="report-card mt-10 rounded-[22px] border border-slate-100 bg-[#fafafa] px-5 py-7 sm:mt-12 sm:rounded-[24px] sm:px-8 sm:py-9">
            <p
              className="text-[10px] font-semibold tracking-[0.28em] sm:text-[11px]"
              style={{ color: GOLD }}
            >
              OVERALL ASSESSMENT
            </p>

            <h2
              className="mt-2.5 text-lg font-semibold tracking-[-0.03em] sm:mt-3 sm:text-xl"
              style={{ color: NAVY }}
            >
              総合評価
            </h2>

            <p className="mt-4 text-[0.95rem] leading-8 text-slate-600 sm:mt-5 sm:text-[1.05rem] sm:leading-9">
              {result.summary}
            </p>
          </section>

          {/* Condition cards */}
          <section className="report-card mt-10 sm:mt-12">
            <p
              className="text-[10px] font-semibold tracking-[0.28em] sm:text-[11px]"
              style={{ color: GOLD }}
            >
              TODAY&apos;S CONDITION
            </p>

            <h2
              className="mt-2.5 text-lg font-semibold tracking-[-0.03em] sm:mt-3 sm:text-xl"
              style={{ color: NAVY }}
            >
              今日のコンディション
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-7 sm:grid-cols-3 sm:gap-4">
              {displayPrimary.map(({ key, label }) => (
                <MetricCard
                  key={key}
                  label={label}
                  value={formatMetricValue(key, result.metrics, result.score)}
                  emphasize
                />
              ))}
            </div>

            {displaySecondary.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:grid-cols-4 sm:gap-4">
                {displaySecondary.map(({ key, label }) => (
                  <MetricCard
                    key={key}
                    label={label}
                    value={formatMetricValue(key, result.metrics, result.score)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Strengths / Improvements */}
          <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-2">
            <section className="report-card rounded-[22px] border border-slate-100 bg-white px-5 py-7 sm:rounded-[24px] sm:px-7 sm:py-8">
              <p
                className="text-[10px] font-semibold tracking-[0.28em] sm:text-[11px]"
                style={{ color: GOLD }}
              >
                STRENGTHS
              </p>

              <h2
                className="mt-2.5 text-lg font-semibold tracking-[-0.03em]"
                style={{ color: NAVY }}
              >
                良かった点
              </h2>

              <ul className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
                {result.goodPoints.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: TEAL }}
                      aria-hidden
                    />
                    <span className="text-[0.92rem] leading-7 text-slate-600">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="report-card rounded-[22px] border border-slate-100 bg-white px-5 py-7 sm:rounded-[24px] sm:px-7 sm:py-8">
              <p
                className="text-[10px] font-semibold tracking-[0.28em] sm:text-[11px]"
                style={{ color: GOLD }}
              >
                IMPROVEMENTS
              </p>

              <h2
                className="mt-2.5 text-lg font-semibold tracking-[-0.03em]"
                style={{ color: NAVY }}
              >
                改善ポイント
              </h2>

              <ul className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
                {result.improvements.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: GOLD }}
                      aria-hidden
                    />
                    <span className="text-[0.92rem] leading-7 text-slate-600">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Factors */}
          {result.possibleFactors?.length > 0 && (
            <section className="report-card mt-10 sm:mt-12">
              <p
                className="text-[10px] font-semibold tracking-[0.28em] sm:text-[11px]"
                style={{ color: GOLD }}
              >
                POSSIBLE FACTORS
              </p>

              <h2
                className="mt-2.5 text-lg font-semibold tracking-[-0.03em] sm:mt-3 sm:text-xl"
                style={{ color: NAVY }}
              >
                考えられる要因
              </h2>

              <ul className="mt-5 space-y-3 sm:mt-6">
                {result.possibleFactors.map((item) => (
                  <li
                    key={item}
                    className="rounded-[18px] border border-slate-100 bg-[#fafafa] px-4 py-4 text-[0.92rem] leading-7 text-slate-600 sm:px-5"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Actions */}
          <section className="report-card mt-10 sm:mt-12">
            <p
              className="text-[10px] font-semibold tracking-[0.28em] sm:text-[11px]"
              style={{ color: GOLD }}
            >
              PRIORITY ACTIONS
            </p>

            <h2
              className="mt-2.5 text-lg font-semibold tracking-[-0.03em] sm:mt-3 sm:text-xl"
              style={{ color: NAVY }}
            >
              今日の優先アクション
            </h2>

            <div className="mt-6 space-y-3 sm:mt-7 sm:space-y-4">
              {result.actions.map((item, index) => (
                <div
                  key={item}
                  className="flex gap-4 rounded-[20px] border border-slate-100 bg-[#fafafa] px-4 py-5 sm:gap-5 sm:px-6 sm:py-6"
                >
                  <p
                    className="shrink-0 pt-0.5 text-xs font-semibold tracking-[0.16em]"
                    style={{ color: GOLD }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="text-[0.92rem] leading-7 text-slate-600 sm:text-[0.98rem] sm:leading-8">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Yoga */}
          <section
            className="report-card mt-10 rounded-[22px] px-5 py-8 text-white sm:mt-12 sm:rounded-[24px] sm:px-8 sm:py-10"
            style={{ backgroundColor: NAVY }}
          >
            <p
              className="text-[10px] font-semibold tracking-[0.28em] sm:text-[11px]"
              style={{ color: "#d4b56a" }}
            >
              MELATONIN YOGA™
            </p>

            <h2 className="mt-2.5 text-lg font-semibold tracking-[-0.03em] sm:mt-3 sm:text-xl">
              メラトニンヨガ™提案
            </h2>

            <p className="mt-4 text-[0.95rem] leading-8 text-white/78 sm:mt-5 sm:text-[1.05rem] sm:leading-9">
              {result.yoga}
            </p>
          </section>

          {/* Disclaimer */}
          {(result.caution || result.disclaimer) && (
            <section className="report-card mt-10 border-t border-slate-100 pt-8 sm:mt-12 sm:pt-10">
              <p
                className="text-[10px] font-semibold tracking-[0.28em] sm:text-[11px]"
                style={{ color: GOLD }}
              >
                DISCLAIMER
              </p>

              <h2
                className="mt-2.5 text-base font-semibold tracking-[-0.02em] sm:text-lg"
                style={{ color: NAVY }}
              >
                免責事項
              </h2>

              {result.caution && (
                <p className="mt-4 text-sm leading-7 text-slate-500">
                  {result.caution}
                </p>
              )}

              {result.disclaimer && (
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {result.disclaimer}
                </p>
              )}
            </section>
          )}

          {/* Footer */}
          <footer className="report-footer mt-10 flex flex-col items-center border-t border-slate-100 pt-8 text-center sm:mt-12 sm:pt-10">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={280}
              height={70}
              className="h-auto w-[150px] object-contain opacity-90 sm:w-[200px]"
            />

            <p className="mt-4 text-[11px] tracking-[0.12em] text-slate-400 sm:mt-5 sm:text-xs">
              Powered by Sleep Wellness Institute Japan
            </p>
          </footer>
        </article>

        {/* Screen-only actions */}
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
