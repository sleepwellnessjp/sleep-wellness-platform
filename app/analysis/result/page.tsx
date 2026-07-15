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

const metricLabels: Array<{ key: keyof AnalysisMetrics; label: string }> = [
  { key: "sleepScore", label: "睡眠スコア" },
  { key: "sleepDuration", label: "睡眠時間" },
  { key: "sleepEfficiency", label: "睡眠効率" },
  { key: "deepSleep", label: "深い睡眠" },
  { key: "awakenings", label: "途中覚醒" },
  { key: "heartRate", label: "心拍" },
  { key: "hrv", label: "HRV" },
  { key: "stress", label: "ストレス" },
  { key: "spo2", label: "SpO2" },
  { key: "skinTemperature", label: "皮膚温度" },
];

function formatMetricValue(
  key: keyof AnalysisMetrics,
  metrics: AnalysisMetrics,
): string {
  if (key === "sleepScore") {
    const score = metrics.sleepScore;
    return score === null || score === undefined ? "—" : `${score}`;
  }

  const value = metrics[key];
  return value.trim() ? value : "—";
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
      <main className="flex min-h-screen items-center justify-center bg-white px-6 py-20">
        <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-[0_24px_60px_-36px_rgba(7,20,38,.2)]">
          <p
            className="text-[11px] font-semibold tracking-[0.32em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS REPORT
          </p>

          <h1
            className="mt-6 text-3xl font-semibold tracking-[-0.04em]"
            style={{ color: NAVY }}
          >
            分析結果がありません
          </h1>

          <p className="mt-6 text-base leading-8 text-slate-500">
            新しい分析を開始してください。
          </p>

          <Link
            href="/analysis/new"
            className="mt-10 inline-flex rounded-full px-8 py-4 text-base font-semibold text-white transition hover:opacity-90"
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
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-slate-400">読み込み中...</p>
      </main>
    );
  }

  const visibleMetrics = metricLabels.filter(({ key }) => {
    const value = result.metrics[key];
    if (key === "sleepScore") return value !== null && value !== undefined;
    return typeof value === "string" && value.trim().length > 0;
  });

  const displayMetrics =
    visibleMetrics.length > 0
      ? visibleMetrics
      : [
          { key: "sleepScore" as const, label: "睡眠スコア" },
          { key: "stress" as const, label: "ストレス" },
          { key: "sleepDuration" as const, label: "睡眠時間" },
          { key: "sleepEfficiency" as const, label: "睡眠効率" },
        ];

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm 16mm;
          }

          html,
          body {
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .report-sheet {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          .report-card {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
          }

          .report-footer {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <main className="min-h-screen bg-[#f7f7f5] py-12 print:bg-white print:py-0 md:py-16">
        <div className="report-sheet mx-auto max-w-[820px] px-5 print:max-w-none print:px-0 sm:px-8">
          {/* A4 report canvas */}
          <article className="overflow-hidden rounded-[28px] border border-slate-100/80 bg-white px-8 py-12 shadow-[0_28px_80px_-48px_rgba(7,20,38,.22)] print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none sm:px-12 sm:py-14 md:px-16 md:py-16">
            {/* ① Sleep Wellness Report™ */}
            <header className="report-card text-center">
              <div
                className="mx-auto mb-8 h-px w-16"
                style={{ backgroundColor: GOLD }}
                aria-hidden
              />

              <p
                className="text-[11px] font-semibold tracking-[0.36em]"
                style={{ color: GOLD }}
              >
                SLEEP WELLNESS INSTITUTE JAPAN
              </p>

              <h1
                className="mt-5 text-[1.85rem] font-semibold tracking-[-0.045em] sm:text-[2.35rem] md:text-[2.75rem]"
                style={{ color: NAVY }}
              >
                Sleep Wellness Report
                <span style={{ color: GOLD }}>™</span>
              </h1>
            </header>

            {/* ② Sleep Wellness Score */}
            <section className="report-card mt-14 text-center sm:mt-16">
              <p
                className="text-[11px] font-semibold tracking-[0.28em]"
                style={{ color: GOLD }}
              >
                SLEEP WELLNESS SCORE
              </p>

              <div className="mt-6 flex items-end justify-center gap-2">
                <p
                  className="text-[5.5rem] leading-none font-semibold tracking-[-0.06em] sm:text-[6.5rem]"
                  style={{ color: NAVY }}
                >
                  {result.score}
                </p>
                <p className="mb-3 text-lg font-medium text-slate-400 sm:mb-4 sm:text-xl">
                  / 100
                </p>
              </div>
            </section>

            {/* ③ 総合評価 */}
            <section className="report-card mt-12 rounded-2xl border border-slate-100 bg-[#fafafa] px-8 py-9 sm:mt-14 sm:px-10 sm:py-10">
              <p
                className="text-[11px] font-semibold tracking-[0.28em]"
                style={{ color: GOLD }}
              >
                OVERALL ASSESSMENT
              </p>

              <h2
                className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
                style={{ color: NAVY }}
              >
                総合評価
              </h2>

              <p className="mt-6 text-[1.05rem] leading-9 text-slate-600 sm:text-lg sm:leading-9">
                {result.summary}
              </p>
            </section>

            {/* ④ 今日のコンディション */}
            <section className="report-card mt-12 sm:mt-14">
              <p
                className="text-[11px] font-semibold tracking-[0.28em]"
                style={{ color: GOLD }}
              >
                TODAY&apos;S CONDITION
              </p>

              <h2
                className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
                style={{ color: NAVY }}
              >
                今日のコンディション
              </h2>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-5">
                {displayMetrics.map(({ key, label }) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-slate-100 bg-white px-5 py-6 shadow-[0_12px_32px_-24px_rgba(7,20,38,.18)]"
                  >
                    <p className="text-xs tracking-wide text-slate-400">
                      {label}
                    </p>

                    <p
                      className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
                      style={{ color: NAVY }}
                    >
                      {key === "sleepScore" &&
                      (result.metrics.sleepScore === null ||
                        result.metrics.sleepScore === undefined)
                        ? result.score
                        : formatMetricValue(key, result.metrics)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ⑤ 良かった点 / ⑥ 改善ポイント */}
            <div className="mt-12 grid gap-6 sm:mt-14 sm:gap-7 md:grid-cols-2">
              <section className="report-card rounded-2xl border border-slate-100 bg-white px-7 py-8 shadow-[0_12px_32px_-24px_rgba(7,20,38,.18)] sm:px-8 sm:py-9">
                <p
                  className="text-[11px] font-semibold tracking-[0.28em]"
                  style={{ color: GOLD }}
                >
                  STRENGTHS
                </p>

                <h2
                  className="mt-3 text-xl font-semibold tracking-[-0.03em]"
                  style={{ color: NAVY }}
                >
                  良かった点
                </h2>

                <ul className="mt-7 space-y-5">
                  {result.goodPoints.map((item) => (
                    <li key={item} className="flex gap-3.5">
                      <span
                        className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: NAVY }}
                        aria-hidden
                      />
                      <span className="text-[0.95rem] leading-7 text-slate-600">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="report-card rounded-2xl border border-slate-100 bg-white px-7 py-8 shadow-[0_12px_32px_-24px_rgba(7,20,38,.18)] sm:px-8 sm:py-9">
                <p
                  className="text-[11px] font-semibold tracking-[0.28em]"
                  style={{ color: GOLD }}
                >
                  IMPROVEMENTS
                </p>

                <h2
                  className="mt-3 text-xl font-semibold tracking-[-0.03em]"
                  style={{ color: NAVY }}
                >
                  改善ポイント
                </h2>

                <ul className="mt-7 space-y-5">
                  {result.improvements.map((item) => (
                    <li key={item} className="flex gap-3.5">
                      <span
                        className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: GOLD }}
                        aria-hidden
                      />
                      <span className="text-[0.95rem] leading-7 text-slate-600">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* ⑦ 今日の優先アクション */}
            <section className="report-card mt-12 sm:mt-14">
              <p
                className="text-[11px] font-semibold tracking-[0.28em]"
                style={{ color: GOLD }}
              >
                PRIORITY ACTIONS
              </p>

              <h2
                className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
                style={{ color: NAVY }}
              >
                今日の優先アクション
              </h2>

              <div className="mt-8 grid gap-4 sm:gap-5">
                {result.actions.map((item, index) => (
                  <div
                    key={item}
                    className="flex gap-5 rounded-2xl border border-slate-100 bg-[#fafafa] px-6 py-6 sm:px-7 sm:py-7"
                  >
                    <p
                      className="shrink-0 text-sm font-semibold tracking-[0.18em]"
                      style={{ color: GOLD }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </p>

                    <p className="text-[0.95rem] leading-7 text-slate-600 sm:text-base sm:leading-8">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ⑧ メラトニンヨガ™提案 */}
            <section
              className="report-card mt-12 rounded-2xl px-8 py-10 text-white sm:mt-14 sm:px-10 sm:py-11"
              style={{ backgroundColor: NAVY }}
            >
              <p
                className="text-[11px] font-semibold tracking-[0.28em]"
                style={{ color: "#d4b56a" }}
              >
                MELATONIN YOGA™
              </p>

              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                メラトニンヨガ™提案
              </h2>

              <p className="mt-6 text-[1.05rem] leading-9 text-white/80 sm:text-lg sm:leading-9">
                {result.yoga}
              </p>
            </section>

            {/* ⑨ 免責事項 */}
            {(result.caution || result.disclaimer) && (
              <section className="report-card mt-12 border-t border-slate-100 pt-10 sm:mt-14">
                <p
                  className="text-[11px] font-semibold tracking-[0.28em]"
                  style={{ color: GOLD }}
                >
                  DISCLAIMER
                </p>

                <h2
                  className="mt-3 text-lg font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  免責事項
                </h2>

                {result.caution && (
                  <p className="mt-5 text-sm leading-7 text-slate-500">
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
            <footer className="report-footer mt-14 flex flex-col items-center border-t border-slate-100 pt-10 text-center sm:mt-16">
              <Image
                src="/swij-logo-horizontal.png"
                alt="Sleep Wellness Institute Japan"
                width={280}
                height={70}
                className="h-auto w-[180px] object-contain opacity-90 sm:w-[220px]"
              />

              <p className="mt-5 text-xs tracking-[0.12em] text-slate-400">
                Powered by Sleep Wellness Institute Japan
              </p>
            </footer>
          </article>

          {/* Actions — screen only */}
          <div className="mt-10 flex flex-col gap-3 print:hidden sm:flex-row sm:justify-center">
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
    </>
  );
}
