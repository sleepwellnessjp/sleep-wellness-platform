"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, ReactNode, useSyncExternalStore } from "react";
import AnalysisFlow from "@/components/AnalysisFlow";
import {
  AnalysisMetrics,
  AnalysisResult,
  ScoreBreakdown,
  ScoreStars,
  loadAnalysisImages,
  loadAnalysisResult,
} from "@/lib/analysis-session";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

type MetricStatus = "good" | "caution" | "improve" | "check";

type MetricDef = {
  key: keyof AnalysisMetrics;
  label: string;
  /** 色分け対象の重要指標 */
  important?: boolean;
  breakdownKey?: keyof ScoreBreakdown;
};

const reportMetrics: MetricDef[] = [
  { key: "bedtime", label: "入眠" },
  { key: "wakeTime", label: "起床" },
  {
    key: "sleepDuration",
    label: "睡眠時間",
    important: true,
    breakdownKey: "sleepDuration",
  },
  {
    key: "sleepEfficiency",
    label: "睡眠効率",
    important: true,
    breakdownKey: "sleepEfficiency",
  },
  {
    key: "deepSleep",
    label: "深い睡眠",
    important: true,
    breakdownKey: "deepSleep",
  },
  { key: "hrv", label: "HRV", important: true, breakdownKey: "hrv" },
  { key: "stress", label: "ストレス", important: true, breakdownKey: "stress" },
  { key: "spo2", label: "SpO₂", important: true, breakdownKey: "spo2" },
];

const scoreBreakdownItems: Array<{
  key: keyof ScoreBreakdown;
  label: string;
}> = [
  { key: "sleepDuration", label: "睡眠時間" },
  { key: "sleepEfficiency", label: "睡眠効率" },
  { key: "deepSleep", label: "深い睡眠" },
  { key: "hrv", label: "HRV" },
  { key: "stress", label: "ストレス" },
  { key: "spo2", label: "SpO₂" },
  { key: "recovery", label: "回復力" },
];

const STATUS_STYLE: Record<
  MetricStatus,
  { color: string; bg: string; border: string; label: string }
> = {
  good: {
    color: "#0f6b5c",
    bg: "rgba(15, 107, 92, 0.06)",
    border: "rgba(15, 107, 92, 0.22)",
    label: "良好",
  },
  caution: {
    color: "#9a7b12",
    bg: "rgba(154, 123, 18, 0.08)",
    border: "rgba(154, 123, 18, 0.28)",
    label: "注意",
  },
  improve: {
    color: "#b45a1a",
    bg: "rgba(180, 90, 26, 0.08)",
    border: "rgba(180, 90, 26, 0.28)",
    label: "改善余地",
  },
  check: {
    color: "#a33a3a",
    bg: "rgba(163, 58, 58, 0.07)",
    border: "rgba(163, 58, 58, 0.26)",
    label: "要確認",
  },
};

function starsToStatus(stars: ScoreStars): MetricStatus {
  if (stars >= 4) return "good";
  if (stars === 3) return "caution";
  if (stars === 2) return "improve";
  return "check";
}

function formatMetricValue(
  key: keyof AnalysisMetrics,
  metrics: AnalysisMetrics,
): string {
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

function renderStars(count: ScoreStars): string {
  return "★".repeat(count) + "☆".repeat(5 - count);
}

/** Markdown風 **太字** を描画 */
function renderRichText(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={index} className="font-semibold" style={{ color: NAVY }}>
          {bold[1]}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** AIコメントを短い段落と箇条書きで整形 */
function FormattedAiText({ text }: { text: string }) {
  const blocks = text
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const lines = block
          .split(/(?=[・•●\-]\s)/)
          .map((line) => line.trim())
          .filter(Boolean);
        const isList =
          lines.length > 1 &&
          lines.every((line) => /^[・•●\-]\s?/.test(line));

        if (isList) {
          return (
            <ul key={index} className="space-y-2">
              {lines.map((line) => {
                const content = line.replace(/^[・•●\-]\s?/, "");
                return (
                  <li
                    key={line}
                    className="flex gap-2.5 text-[15px] leading-7 text-slate-600 sm:text-[0.95rem]"
                  >
                    <span
                      className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: GOLD }}
                      aria-hidden
                    />
                    <span>{renderRichText(content)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p
            key={index}
            className="text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8"
          >
            {renderRichText(block)}
          </p>
        );
      })}
    </div>
  );
}

function subscribeNoop() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

export default function AnalysisResultPage() {
  const isClient = useIsClient();
  const result = isClient ? loadAnalysisResult() : null;
  const images = isClient ? loadAnalysisImages() : [];

  if (!isClient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-base text-slate-400">読み込み中...</p>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5 py-20">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.18)] sm:max-w-lg sm:p-12">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
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

          <p className="mt-5 text-[15px] leading-7 text-slate-500 sm:text-base sm:leading-8">
            新しい分析を開始してください。
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold transition hover:bg-slate-50"
              style={{ color: NAVY }}
            >
              トップページへ戻る
            </Link>
            <Link
              href="/analysis/new"
              className="inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: NAVY }}
            >
              新しい分析を作成
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <ResultContent result={result} images={images} />;
}

function ResultContent({
  result,
  images,
}: {
  result: AnalysisResult;
  images: string[];
}) {
  const score = Math.max(0, Math.min(100, Math.round(result.score)));
  const breakdown = result.scoreBreakdown;
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
  const summaryText = clampLine(clampSentences(result.summary, 6), 420);
  const yogaText = clampLine(result.yoga ?? "", 110);
  const cautionText = clampLine(result.caution ?? "", 90);
  const disclaimerText = clampLine(
    clampSentences(result.disclaimer ?? "", 2),
    100,
  );
  const closingSummary =
    result.closingSummary?.trim() ||
    clampLine(clampSentences(result.summary, 2), 150);
  const nextCheckPoints = takeItems(
    result.nextCheckPoints?.length
      ? result.nextCheckPoints
      : [...improvements, ...possibleFactors],
    4,
  ).map((item) => clampLine(item, 48));

  const visualSlots = Math.max(images.length, 1);
  const visualCols =
    visualSlots === 1
      ? "grid-cols-1"
      : visualSlots === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : visualSlots <= 4
          ? "grid-cols-2"
          : "grid-cols-2 sm:grid-cols-3";

  return (
    <main className="report-print-root min-h-screen bg-[#f7f7f5] py-8 print:bg-white print:py-0 sm:py-12 md:py-16">
      <div className="report-sheet mx-auto max-w-[820px] px-4 print:max-w-none print:px-0 sm:px-6">
        <div className="no-print mb-8 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="shrink-0">
              <Image
                src="/swij-logo-horizontal.png"
                alt="Sleep Wellness Institute Japan"
                width={160}
                height={40}
                className="h-auto w-[120px] sm:w-[140px]"
              />
            </Link>
            <p
              className="text-[10px] font-semibold tracking-[0.22em] sm:text-xs sm:tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              AI ANALYSIS
            </p>
          </div>
          <AnalysisFlow current={3} />
        </div>

        <article className="report-page report-page-text overflow-hidden rounded-[28px] border border-slate-200/80 bg-white px-5 py-8 shadow-[0_24px_70px_-48px_rgba(7,20,38,.22)] print:overflow-visible print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none sm:px-9 sm:py-10 md:px-11 md:py-11">
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
                  className="report-title mt-4 text-[1.5rem] font-semibold tracking-[-0.04em] sm:mt-5 sm:text-[1.9rem]"
                  style={{ color: NAVY }}
                >
                  Sleep Wellness Report
                  <span style={{ color: GOLD }}>™</span>
                </h1>
              </div>

              <div className="report-score-block shrink-0 text-right">
                <p
                  className="text-[10px] font-semibold tracking-[0.22em] sm:text-[11px]"
                  style={{ color: GOLD }}
                >
                  WELLNESS SCORE
                </p>
                <p
                  className="report-score mt-1 text-[2.8rem] leading-none font-semibold tracking-[-0.06em] sm:text-[3.25rem]"
                  style={{ color: NAVY }}
                >
                  {score}
                </p>
                <p className="mt-1 text-[11px] tracking-[0.12em] text-slate-400">
                  / 100
                </p>
              </div>
            </div>

            <div className="report-meta mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-slate-600 sm:mt-5 sm:text-base">
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

          <section className="report-score-breakdown mt-6 sm:mt-7">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2
                className="text-base font-semibold tracking-[-0.02em] sm:text-[1.05rem]"
                style={{ color: NAVY }}
              >
                Scoreの内訳
              </h2>
              <p
                className="text-[10px] font-semibold tracking-[0.22em]"
                style={{ color: GOLD }}
              >
                BREAKDOWN
              </p>
            </div>

            <div className="report-breakdown-list rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-4 py-3.5 sm:px-5 sm:py-4">
              {scoreBreakdownItems.map(({ key, label }) => {
                const stars = breakdown[key];
                const status = starsToStatus(stars);
                const style = STATUS_STYLE[status];
                return (
                  <div
                    key={key}
                    className="report-breakdown-row flex items-center justify-between gap-3 border-b border-[#071426]/06 py-2.5 last:border-b-0 last:pb-0 first:pt-0"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="text-[15px] font-medium tracking-[-0.02em] sm:text-base"
                        style={{ color: NAVY }}
                      >
                        {label}
                      </span>
                      <span
                        className="report-status-chip hidden shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.06em] sm:inline-block"
                        style={{
                          color: style.color,
                          backgroundColor: style.bg,
                          border: `1px solid ${style.border}`,
                        }}
                      >
                        {style.label}
                      </span>
                    </div>
                    <span
                      className="report-stars shrink-0 text-[15px] tracking-[0.12em] sm:text-base"
                      style={{ color: style.color }}
                      aria-label={`${stars} / 5`}
                    >
                      {renderStars(stars)}
                    </span>
                  </div>
                );
              })}

              <div className="report-breakdown-total mt-1 flex items-center justify-between gap-3 border-t border-[#071426]/12 pt-3">
                <span
                  className="text-[15px] font-semibold tracking-[-0.02em] sm:text-base"
                  style={{ color: NAVY }}
                >
                  総合
                </span>
                <span
                  className="text-[1.15rem] font-semibold tracking-[-0.03em] sm:text-[1.25rem]"
                  style={{ color: NAVY }}
                >
                  {score}
                  <span className="ml-1 text-[13px] font-medium text-slate-400">
                    点
                  </span>
                </span>
              </div>
            </div>

            <div className="report-status-legend mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
              {(
                Object.entries(STATUS_STYLE) as Array<
                  [MetricStatus, (typeof STATUS_STYLE)[MetricStatus]]
                >
              ).map(([key, style]) => (
                <span key={key} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: style.color }}
                    aria-hidden
                  />
                  {style.label}
                </span>
              ))}
            </div>
          </section>

          <section className="report-metrics mt-7 sm:mt-8">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2
                className="text-base font-semibold tracking-[-0.02em] sm:text-[1.05rem]"
                style={{ color: NAVY }}
              >
                睡眠サマリー
              </h2>
              <p
                className="text-[10px] font-semibold tracking-[0.22em]"
                style={{ color: GOLD }}
              >
                SUMMARY
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {reportMetrics.map(({ key, label, important, breakdownKey }) => {
                const status =
                  important && breakdownKey
                    ? starsToStatus(breakdown[breakdownKey])
                    : null;
                const style = status ? STATUS_STYLE[status] : null;

                return (
                  <div
                    key={key}
                    className="report-metric rounded-xl border px-3.5 py-3.5 sm:px-4 sm:py-4"
                    style={
                      style
                        ? {
                            borderColor: style.border,
                            backgroundColor: style.bg,
                          }
                        : {
                            borderColor: "rgba(7, 20, 38, 0.1)",
                            backgroundColor: "#fafaf8",
                          }
                    }
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className="text-[11px] font-medium tracking-[0.04em]"
                        style={{ color: style?.color ?? "#94a3b8" }}
                      >
                        {label}
                      </p>
                      {style && (
                        <span
                          className="text-[9px] font-semibold tracking-[0.04em]"
                          style={{ color: style.color }}
                        >
                          {style.label}
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-1.5 text-[1.02rem] font-semibold tracking-[-0.03em] sm:text-[1.08rem]"
                      style={{ color: style?.color ?? NAVY }}
                    >
                      {formatMetricValue(key, result.metrics)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="report-assessment mt-7 rounded-xl border border-[#071426]/10 bg-[#fafafa] px-4 py-5 sm:mt-8 sm:px-5 sm:py-6">
            <div className="flex items-baseline justify-between gap-3 border-b border-[#071426]/10 pb-3">
              <h2
                className="text-base font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                AI総合分析
              </h2>
              <p
                className="text-[10px] font-semibold tracking-[0.22em]"
                style={{ color: GOLD }}
              >
                OVERVIEW
              </p>
            </div>

            <div className="mt-4">
              <p
                className="mb-2 text-[11px] font-semibold tracking-[0.14em]"
                style={{ color: GOLD }}
              >
                今回の見立て
              </p>
              <div className="report-summary">
                <FormattedAiText text={summaryText} />
              </div>
            </div>

            {goodPoints.length > 0 && (
              <div className="mt-5 border-t border-[#071426]/08 pt-4">
                <p
                  className="text-[11px] font-semibold tracking-[0.14em]"
                  style={{ color: GOLD }}
                >
                  良かった点
                </p>
                <ul className="mt-2.5 space-y-2">
                  {goodPoints.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-[15px] leading-7 text-slate-600 sm:text-[0.95rem]"
                    >
                      <span
                        className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: GOLD }}
                        aria-hidden
                      />
                      <span>{renderRichText(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="report-split mt-6 grid gap-3 sm:mt-7 sm:grid-cols-2 sm:gap-4">
            <div className="report-panel rounded-xl border border-[#071426]/10 px-4 py-5 sm:px-5">
              <h2
                className="text-base font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                改善ポイント
              </h2>
              <ul className="mt-3.5 space-y-2.5">
                {improvements.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[15px] leading-7 text-slate-600 sm:text-[0.95rem]"
                  >
                    <span
                      className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                      aria-hidden
                    />
                    <span>{renderRichText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="report-panel rounded-xl border border-[#071426]/10 px-4 py-5 sm:px-5">
              <h2
                className="text-base font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                考えられる要因
              </h2>
              <ul className="mt-3.5 space-y-2.5">
                {possibleFactors.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[15px] leading-7 text-slate-600 sm:text-[0.95rem]"
                  >
                    <span
                      className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                      aria-hidden
                    />
                    <span>{renderRichText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="report-panel mt-6 rounded-xl border border-[#071426]/10 px-4 py-5 sm:mt-7 sm:px-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                className="text-base font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                実践アクション
              </h2>
              <p
                className="text-[10px] font-semibold tracking-[0.18em]"
                style={{ color: GOLD }}
              >
                ACTIONS
              </p>
            </div>

            {primaryAction && (
              <div
                className="mt-4 border-l-[3px] pl-4"
                style={{ borderColor: GOLD }}
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  最優先
                </p>
                <p className="mt-1.5 text-[15px] leading-7 text-slate-600 sm:text-[0.95rem]">
                  {renderRichText(primaryAction)}
                </p>
              </div>
            )}

            {nextActions.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">
                  次のアクション
                </p>
                <ul className="mt-2 space-y-2">
                  {nextActions.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-[15px] leading-7 text-slate-600 sm:text-[0.95rem]"
                    >
                      <span
                        className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                        aria-hidden
                      />
                      <span>{renderRichText(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="report-yoga mt-6 rounded-xl border border-[#071426]/10 px-4 py-5 sm:mt-7 sm:px-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                className="text-base font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                メラトニンヨガ™ / 呼吸・休養
              </h2>
              <p
                className="text-[10px] font-semibold tracking-[0.18em]"
                style={{ color: GOLD }}
              >
                PRACTICE
              </p>
            </div>
            <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:text-[0.95rem]">
              {yogaText ? renderRichText(yogaText) : "—"}
            </p>
          </section>

          <section className="report-closing mt-6 rounded-xl border border-[#071426]/10 bg-[#f7f9fb] px-4 py-5 sm:mt-7 sm:px-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                className="text-base font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                今回の総括
              </h2>
              <p
                className="text-[10px] font-semibold tracking-[0.18em]"
                style={{ color: GOLD }}
              >
                CLOSING
              </p>
            </div>
            <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8">
              {renderRichText(closingSummary)}
            </p>
          </section>

          {nextCheckPoints.length > 0 && (
            <section className="report-next-checks mt-6 rounded-xl border border-[#071426]/10 px-4 py-5 sm:mt-7 sm:px-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  className="text-base font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  次回確認したいポイント
                </h2>
                <p
                  className="text-[10px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  NEXT
                </p>
              </div>
              <ul className="mt-3.5 space-y-2.5">
                {nextCheckPoints.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[15px] leading-7 text-slate-600 sm:text-[0.95rem]"
                  >
                    <span
                      className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: GOLD }}
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(cautionText || disclaimerText) && (
            <section className="report-disclaimer mt-6 border-t border-[#071426]/12 pt-4 sm:mt-7">
              <h2
                className="text-sm font-semibold tracking-[-0.01em]"
                style={{ color: NAVY }}
              >
                注意事項／免責
              </h2>
              {cautionText && (
                <p className="mt-2 text-[13px] leading-6 text-slate-500">
                  {cautionText}
                </p>
              )}
              {disclaimerText && (
                <p className="mt-1.5 text-[12px] leading-5 text-slate-400">
                  {disclaimerText}
                </p>
              )}
            </section>
          )}

          <footer className="report-powered mt-8 border-t border-[#071426]/10 pt-5 text-center sm:mt-9">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-slate-400">
              Powered by
            </p>
            <p
              className="mt-1.5 text-[13px] font-semibold tracking-[0.04em] sm:text-sm"
              style={{ color: NAVY }}
            >
              Sleep Wellness Institute Japan
            </p>
          </footer>
        </article>

        <article className="report-page report-page-visual mt-8 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white px-5 py-8 shadow-[0_24px_70px_-48px_rgba(7,20,38,.22)] print:mt-0 print:overflow-visible print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none sm:mt-10 sm:px-9 sm:py-10 md:px-11 md:py-11">
          <header className="visual-header">
            <div className="flex items-start justify-between gap-4 border-b border-[#071426]/12 pb-5">
              <div className="min-w-0">
                <Image
                  src="/swij-logo-horizontal.png"
                  alt="Sleep Wellness Institute Japan"
                  width={220}
                  height={55}
                  className="report-logo h-auto w-[118px] object-contain sm:w-[148px]"
                />
                <h2
                  className="visual-title mt-4 text-[1.35rem] font-semibold tracking-[-0.04em] sm:text-[1.65rem]"
                  style={{ color: NAVY }}
                >
                  SOXAI Visual Report
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-[15px]">
                  今回の分析に使用した測定画面
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  SOURCE DATA
                </p>
                <p className="mt-2 text-sm font-medium" style={{ color: NAVY }}>
                  {images.length > 0 ? `${images.length} 枚` : "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
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

          {images.length > 0 ? (
            <div
              className={`visual-grid mt-6 grid gap-3 sm:mt-7 sm:gap-4 ${visualCols}`}
            >
              {images.map((src, index) => (
                <figure
                  key={`visual-${index}`}
                  className="visual-cell overflow-hidden rounded-xl border border-[#071426]/10 bg-[#fafaf8]"
                >
                  <div className="relative aspect-[3/4] w-full">
                    <Image
                      src={src}
                      alt={`SOXAI測定画面 ${index + 1}`}
                      fill
                      unoptimized
                      className="object-contain p-2"
                    />
                  </div>
                  <figcaption className="border-t border-[#071426]/08 px-3 py-2 text-center text-[11px] font-medium tracking-[0.08em] text-slate-400">
                    SCREEN {String(index + 1).padStart(2, "0")}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-[#fafaf8] px-5 py-12 text-center sm:mt-7">
              <p className="text-sm leading-7 text-slate-500 sm:text-[15px]">
                測定画面のプレビューは保存されていません。
                <br />
                次回の分析では、アップロード画像がここに表示されます。
              </p>
            </div>
          )}

          <footer className="report-powered mt-8 border-t border-[#071426]/10 pt-5 text-center sm:mt-9">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-slate-400">
              Powered by
            </p>
            <p
              className="mt-1.5 text-[13px] font-semibold tracking-[0.04em] sm:text-sm"
              style={{ color: NAVY }}
            >
              Sleep Wellness Institute Japan
            </p>
          </footer>
        </article>

        <div className="no-print mt-8 flex flex-col gap-3 pb-6 sm:mt-10 sm:flex-row sm:flex-wrap sm:justify-center sm:pb-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            PDFダウンロード
          </button>

          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-center text-base font-semibold transition hover:bg-slate-50"
            style={{ color: NAVY }}
          >
            トップページへ戻る
          </Link>

          <Link
            href="/analysis/new"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-center text-base font-semibold transition hover:bg-slate-50"
            style={{ color: NAVY }}
          >
            新しい分析を作成
          </Link>
        </div>
      </div>
    </main>
  );
}
