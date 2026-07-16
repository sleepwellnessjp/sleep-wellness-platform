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
  important?: boolean;
  breakdownKey?: keyof ScoreBreakdown;
};

const reportMetrics: MetricDef[] = [
  { key: "sleepScore", label: "睡眠スコア" },
  { key: "bedtime", label: "入眠時間" },
  { key: "wakeTime", label: "起床時間" },
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
  { key: "awakenings", label: "覚醒時間" },
  { key: "remSleep", label: "REM睡眠" },
  { key: "lightSleep", label: "浅い睡眠" },
  {
    key: "deepSleep",
    label: "深い睡眠",
    important: true,
    breakdownKey: "deepSleep",
  },
  { key: "sleepDebt", label: "睡眠負債" },
  { key: "sleepLatency", label: "入眠潜時" },
  { key: "circadianRhythm", label: "体内時計" },
  { key: "respiratoryRate", label: "呼吸数" },
  {
    key: "spo2",
    label: "平均SpO₂",
    important: true,
    breakdownKey: "spo2",
  },
  { key: "heartRate", label: "平均心拍数" },
  {
    key: "hrv",
    label: "HRV",
    important: true,
    breakdownKey: "hrv",
  },
  { key: "skinTemperature", label: "皮膚温度" },
  {
    key: "stress",
    label: "ストレス",
    important: true,
    breakdownKey: "stress",
  },
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

type VisualPanel = {
  id: string;
  title: string;
  subtitle: string;
  values: Array<{ label: string; value: string }>;
};

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

function displayValue(value: string | number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return "—";
}

function formatMetricValue(
  key: keyof AnalysisMetrics,
  metrics: AnalysisMetrics,
): string {
  return displayValue(metrics[key]);
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

function splitTomorrowPlan(plan: string[]): {
  primary: string | null;
  next: string[];
} {
  const limited = takeItems(plan, 3).map((item) => clampLine(item, 90));
  if (limited.length === 0) return { primary: null, next: [] };
  return { primary: limited[0], next: limited.slice(1) };
}

function renderStars(count: ScoreStars): string {
  return "★".repeat(count) + "☆".repeat(5 - count);
}

function buildVisualPanels(metrics: AnalysisMetrics): VisualPanel[] {
  return [
    {
      id: "stages",
      title: "睡眠ステージ",
      subtitle: "SLEEP STAGES",
      values: [
        { label: "REM", value: displayValue(metrics.remSleep) },
        { label: "浅い睡眠", value: displayValue(metrics.lightSleep) },
        { label: "深い睡眠", value: displayValue(metrics.deepSleep) },
      ],
    },
    {
      id: "stage-detail",
      title: "睡眠ステージ詳細",
      subtitle: "STAGE DETAIL",
      values: [
        { label: "睡眠時間", value: displayValue(metrics.sleepDuration) },
        { label: "睡眠効率", value: displayValue(metrics.sleepEfficiency) },
        { label: "覚醒時間", value: displayValue(metrics.awakenings) },
        { label: "入眠潜時", value: displayValue(metrics.sleepLatency) },
        { label: "睡眠負債", value: displayValue(metrics.sleepDebt) },
      ],
    },
    {
      id: "stress",
      title: "ストレス",
      subtitle: "STRESS",
      values: [{ label: "測定値", value: displayValue(metrics.stress) }],
    },
    {
      id: "circadian",
      title: "体内時計",
      subtitle: "CIRCADIAN",
      values: [
        { label: "体内時計", value: displayValue(metrics.circadianRhythm) },
        { label: "入眠", value: displayValue(metrics.bedtime) },
        { label: "起床", value: displayValue(metrics.wakeTime) },
      ],
    },
    {
      id: "respiration",
      title: "睡眠時呼吸",
      subtitle: "RESPIRATION",
      values: [
        { label: "呼吸数", value: displayValue(metrics.respiratoryRate) },
        { label: "平均SpO₂", value: displayValue(metrics.spo2) },
      ],
    },
    {
      id: "rhr",
      title: "安静時心拍数",
      subtitle: "RESTING HR",
      values: [{ label: "平均心拍数", value: displayValue(metrics.heartRate) }],
    },
    {
      id: "hrv",
      title: "心拍変動",
      subtitle: "HRV",
      values: [{ label: "HRV", value: displayValue(metrics.hrv) }],
    },
    {
      id: "skin-temp",
      title: "皮膚温度",
      subtitle: "SKIN TEMP",
      values: [
        { label: "皮膚温度", value: displayValue(metrics.skinTemperature) },
      ],
    },
  ];
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

function FormattedAiText({ text }: { text: string }) {
  const blocks = text
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) => (
        <p
          key={index}
          className="text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8"
        >
          {renderRichText(block)}
        </p>
      ))}
    </div>
  );
}

function SectionLabel({
  title,
  eyebrow,
}: {
  title: string;
  eyebrow: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2
        className="text-base font-semibold tracking-[-0.02em] sm:text-[1.05rem]"
        style={{ color: NAVY }}
      >
        {title}
      </h2>
      <p
        className="text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        {eyebrow}
      </p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-[15px] leading-7 text-slate-400">—</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
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
  const { primary: primaryPlan, next: nextPlans } = splitTomorrowPlan(
    result.tomorrowPlan,
  );
  const summaryText = clampLine(clampSentences(result.summary, 5), 360);
  const dataInsightText = clampLine(
    clampSentences(result.dataInsight, 5),
    340,
  );
  const lifestyleRelationText = clampLine(
    clampSentences(result.lifestyleRelation, 5),
    340,
  );
  const cautionText = clampLine(result.caution ?? "", 90);
  const disclaimerText = clampLine(
    clampSentences(result.disclaimer ?? "", 2),
    100,
  );
  const visualPanels = buildVisualPanels(result.metrics);
  const visualSlots = Math.max(images.length, 1);
  const visualCols =
    visualSlots === 1
      ? "grid-cols-1"
      : visualSlots === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-2";

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

        {/* ===== PAGE 1: Text Report ===== */}
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
            <SectionLabel title="Scoreの内訳" eyebrow="BREAKDOWN" />
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
                    <span
                      className="text-[15px] font-medium tracking-[-0.02em] sm:text-base"
                      style={{ color: NAVY }}
                    >
                      {label}
                    </span>
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
          </section>

          <section className="report-metrics mt-6 sm:mt-7">
            <SectionLabel title="睡眠サマリー" eyebrow="METRICS" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4">
              {reportMetrics.map(({ key, label, important, breakdownKey }) => {
                const status =
                  important && breakdownKey
                    ? starsToStatus(breakdown[breakdownKey])
                    : null;
                const style = status ? STATUS_STYLE[status] : null;

                return (
                  <div
                    key={key}
                    className="report-metric rounded-xl border px-3 py-3 sm:px-3.5 sm:py-3.5"
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
                    <p
                      className="text-[10px] font-medium tracking-[0.04em] sm:text-[11px]"
                      style={{ color: style?.color ?? "#94a3b8" }}
                    >
                      {label}
                    </p>
                    <p
                      className="mt-1 text-[0.95rem] font-semibold tracking-[-0.03em] sm:text-[1.02rem]"
                      style={{ color: style?.color ?? NAVY }}
                    >
                      {formatMetricValue(key, result.metrics)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="report-assessment mt-6 rounded-xl border border-[#071426]/10 bg-[#fafafa] px-4 py-5 sm:mt-7 sm:px-5 sm:py-5">
            <SectionLabel title="① 総合評価" eyebrow="OVERVIEW" />
            <div className="report-summary">
              <FormattedAiText text={summaryText} />
            </div>
          </section>

          <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <SectionLabel title="② 今回良かった点" eyebrow="STRENGTHS" />
            <BulletList items={goodPoints} />
          </section>

          <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <SectionLabel title="③ 改善点" eyebrow="IMPROVE" />
            <BulletList items={improvements} />
          </section>

          <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <SectionLabel title="④ 睡眠データ考察" eyebrow="DATA" />
            <FormattedAiText text={dataInsightText || "—"} />
          </section>

          <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <SectionLabel title="⑤ 生活習慣との関係" eyebrow="LIFESTYLE" />
            <FormattedAiText text={lifestyleRelationText || "—"} />
          </section>

          <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <SectionLabel title="⑥ Tomorrow Plan" eyebrow="PLAN" />
            {primaryPlan && (
              <div
                className="border-l-[3px] pl-4"
                style={{ borderColor: GOLD }}
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  最優先
                </p>
                <p className="mt-1.5 text-[15px] leading-7 text-slate-600 sm:text-[0.95rem]">
                  {renderRichText(primaryPlan)}
                </p>
              </div>
            )}
            {nextPlans.length > 0 && (
              <div className={primaryPlan ? "mt-3.5" : undefined}>
                <BulletList items={nextPlans} />
              </div>
            )}
            {!primaryPlan && nextPlans.length === 0 && (
              <p className="text-[15px] leading-7 text-slate-400">—</p>
            )}
          </section>

          {(cautionText || disclaimerText) && (
            <section className="report-disclaimer mt-5 border-t border-[#071426]/12 pt-4 sm:mt-6">
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

          <footer className="report-powered mt-6 border-t border-[#071426]/10 pt-4 text-center sm:mt-7">
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

        {/* ===== PAGE 2: SOXAI Visual Report ===== */}
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
                  睡眠ステージ・生体指標の可視化
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  VISUAL
                </p>
                {result.metrics.sleepScore != null && (
                  <p
                    className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
                    style={{ color: NAVY }}
                  >
                    {result.metrics.sleepScore}
                  </p>
                )}
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

          <section className="visual-panels mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:grid-cols-4 sm:gap-3">
            {visualPanels.map((panel) => (
              <div
                key={panel.id}
                className="visual-panel rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-3 py-3.5 sm:px-3.5 sm:py-4"
              >
                <p
                  className="text-[9px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  {panel.subtitle}
                </p>
                <h3
                  className="mt-1 text-[13px] font-semibold tracking-[-0.02em] sm:text-sm"
                  style={{ color: NAVY }}
                >
                  {panel.title}
                </h3>
                <dl className="mt-2.5 space-y-1.5">
                  {panel.values.map((row) => (
                    <div
                      key={`${panel.id}-${row.label}`}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <dt className="text-[10px] text-slate-400 sm:text-[11px]">
                        {row.label}
                      </dt>
                      <dd
                        className="text-right text-[12px] font-semibold tracking-[-0.02em] sm:text-[13px]"
                        style={{ color: NAVY }}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </section>

          {images.length > 0 ? (
            <div
              className={`visual-grid mt-5 grid gap-3 sm:mt-6 sm:gap-4 ${visualCols}`}
            >
              {images.map((src, index) => (
                <figure
                  key={`visual-${index}`}
                  className="visual-cell overflow-hidden rounded-xl border border-[#071426]/10 bg-[#f4f4f2]"
                >
                  <div className="relative aspect-[3/4] w-full min-h-[220px] sm:min-h-[280px]">
                    <Image
                      src={src}
                      alt={`SOXAI測定画面 ${index + 1}`}
                      fill
                      unoptimized
                      className="object-contain p-1.5 sm:p-2"
                    />
                  </div>
                  <figcaption className="border-t border-[#071426]/08 px-3 py-2 text-center text-[11px] font-medium tracking-[0.08em] text-slate-400">
                    SCREEN {String(index + 1).padStart(2, "0")}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-[#fafaf8] px-5 py-10 text-center sm:mt-6">
              <p className="text-sm leading-7 text-slate-500 sm:text-[15px]">
                測定画面のプレビューは保存されていません。
                <br />
                上記パネルに抽出データが表示されています。
              </p>
            </div>
          )}

          <footer className="report-powered mt-6 border-t border-[#071426]/10 pt-4 text-center sm:mt-7">
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
