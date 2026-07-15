"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AnalysisMetrics,
  AnalysisResult,
  loadAnalysisResult,
} from "@/lib/analysis-session";

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
      <main className="flex min-h-screen items-center justify-center bg-[#fafaf8] px-6 py-16">
        <div className="w-full max-w-xl rounded-[36px] bg-white p-10 text-center shadow-[0_30px_80px_-40px_rgba(15,23,42,.18)]">
          <p className="text-xs font-semibold tracking-[0.35em] text-[#9d7a2d]">
            AI ANALYSIS RESULT
          </p>

          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#071426]">
            分析結果がありません
          </h1>

          <p className="mt-6 text-base leading-8 text-slate-600">
            新しい分析を開始してください。
          </p>

          <Link
            href="/analysis/new"
            className="mt-10 inline-flex rounded-full bg-[#071426] px-8 py-4 text-lg font-semibold text-white transition hover:-translate-y-1 hover:bg-[#10233c]"
          >
            新しい分析を作成
          </Link>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fafaf8]">
        <p className="text-slate-500">読み込み中...</p>
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
      ? visibleMetrics.slice(0, 4)
      : [
          { key: "sleepScore" as const, label: "総合スコア" },
          { key: "stress" as const, label: "ストレス" },
          { key: "sleepDuration" as const, label: "睡眠時間" },
          { key: "sleepEfficiency" as const, label: "睡眠効率" },
        ];

  return (
    <main className="min-h-screen bg-[#fafaf8] py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold tracking-[0.35em] text-[#9d7a2d]">
            AI ANALYSIS RESULT
          </p>

          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-[#071426] md:text-6xl">
            Sleep Wellness Report
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            AIによる睡眠ウェルネス分析結果
          </p>
        </div>

        <section className="rounded-[36px] bg-white p-10 shadow-[0_30px_80px_-40px_rgba(15,23,42,.18)]">
          <p className="text-xs font-semibold tracking-[0.3em] text-[#9d7a2d]">
            OVERALL
          </p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-4xl font-semibold tracking-[-0.04em] text-[#071426]">
              総合評価
            </h2>

            <p className="text-5xl font-semibold tracking-[-0.05em] text-[#315f68]">
              {result.score}
              <span className="ml-2 text-lg font-medium text-slate-400">
                / 100
              </span>
            </p>
          </div>

          <p className="mt-8 text-xl leading-9 text-slate-700">
            {result.summary}
          </p>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {displayMetrics.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-[28px] bg-white p-8 shadow-[0_25px_70px_-40px_rgba(15,23,42,.18)]"
            >
              <p className="text-sm text-slate-500">{label}</p>

              <p className="mt-5 text-3xl font-semibold text-[#071426]">
                {key === "sleepScore" &&
                (result.metrics.sleepScore === null ||
                  result.metrics.sleepScore === undefined)
                  ? result.score
                  : formatMetricValue(key, result.metrics)}
              </p>
            </div>
          ))}
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-[32px] bg-white p-10 shadow-[0_25px_70px_-40px_rgba(15,23,42,.18)]">
            <h3 className="text-2xl font-semibold text-[#071426]">
              良かった点
            </h3>

            <ul className="mt-8 space-y-5">
              {result.goodPoints.map((item) => (
                <li key={item} className="flex gap-4">
                  <span className="text-[#315f68]">●</span>
                  <span className="leading-8 text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[32px] bg-white p-10 shadow-[0_25px_70px_-40px_rgba(15,23,42,.18)]">
            <h3 className="text-2xl font-semibold text-[#071426]">
              改善ポイント
            </h3>

            <ul className="mt-8 space-y-5">
              {result.improvements.map((item) => (
                <li key={item} className="flex gap-4">
                  <span className="text-[#9d7a2d]">●</span>
                  <span className="leading-8 text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {result.possibleFactors.length > 0 && (
          <section className="mt-10 rounded-[32px] bg-white p-10 shadow-[0_25px_70px_-40px_rgba(15,23,42,.18)]">
            <h3 className="text-2xl font-semibold text-[#071426]">
              考えられる要因
            </h3>

            <ul className="mt-8 space-y-5">
              {result.possibleFactors.map((item) => (
                <li key={item} className="flex gap-4">
                  <span className="text-slate-400">●</span>
                  <span className="leading-8 text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10 rounded-[36px] bg-white p-10 shadow-[0_30px_80px_-40px_rgba(15,23,42,.18)]">
          <h3 className="text-3xl font-semibold text-[#071426]">
            今日の優先アクション
          </h3>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {result.actions.map((item, index) => (
              <div
                key={item}
                className="rounded-[24px] bg-[#fafaf8] p-7"
              >
                <p className="text-sm font-semibold tracking-[0.2em] text-[#9d7a2d]">
                  {String(index + 1).padStart(2, "0")}
                </p>

                <p className="mt-5 leading-8 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[36px] bg-[#071426] p-10 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,.4)]">
          <p className="text-xs tracking-[0.3em] text-amber-200">
            MELATONIN YOGA™
          </p>

          <h3 className="mt-5 text-3xl font-semibold">
            おすすめメラトニンヨガ
          </h3>

          <p className="mt-6 max-w-3xl text-lg leading-9 text-white/80">
            {result.yoga}
          </p>
        </section>

        {(result.caution || result.disclaimer) && (
          <section className="mt-10 rounded-[28px] border border-slate-200 bg-white p-8">
            {result.caution && (
              <p className="leading-8 text-slate-600">{result.caution}</p>
            )}
            {result.disclaimer && (
              <p className="mt-4 text-sm leading-7 text-slate-500">
                {result.disclaimer}
              </p>
            )}
          </section>
        )}

        <div className="mt-12 flex flex-col gap-4 print:hidden sm:flex-row">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[#071426] px-8 py-5 text-lg font-semibold text-white transition hover:-translate-y-1 hover:bg-[#10233c]"
          >
            PDFダウンロード
          </button>

          <Link
            href="/analysis/new"
            className="rounded-full border border-slate-300 bg-white px-8 py-5 text-center text-lg font-semibold text-[#071426] transition hover:-translate-y-1"
          >
            新しい分析を作成
          </Link>
        </div>
      </div>
    </main>
  );
}
