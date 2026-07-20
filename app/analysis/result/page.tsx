"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, ReactNode, useSyncExternalStore } from "react";
import AnalysisFlow from "@/components/AnalysisFlow";
import {
  AnalysisMetrics,
  AnalysisResult,
  loadAnalysisImages,
  loadAnalysisResult,
} from "@/lib/analysis-session";
import { loadLastSavedAnalysisRef } from "@/lib/client-store";
import { recordPdfDownload } from "@/lib/repositories/client-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

type VisualPanel = {
  id: string;
  title: string;
  subtitle: string;
  graph?: ReactNode;
  values?: Array<{ label: string; value: string }>;
};


function displayValue(value: string | number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return "—";
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parsePercent(text: string): number | null {
  if (!text.trim()) return null;
  const normalized = text.replace(/,/g, "").replace(/％/g, "%").trim();
  const withPct = normalized.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (withPct) {
    const n = Number(withPct[1]);
    return Number.isFinite(n) ? n : null;
  }
  // OCR が "22" のように % なしで返す場合も割合として扱う
  const bare = normalized.match(/^(-?\d+(?:\.\d+)?)$/);
  if (bare) {
    const n = Number(bare[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseLeadingNumber(text: string): number | null {
  if (!text.trim()) return null;
  const normalized = text.replace(/,/g, "");
  const match = normalized.match(/(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function parseDurationMinutes(text: string): number | null {
  const t = text.trim();
  if (!t) return null;

  const hMatch = t.match(/(-?\d+(?:\.\d+)?)\s*時間/);
  const mMatch = t.match(/(-?\d+(?:\.\d+)?)\s*分/);

  if (hMatch || mMatch) {
    const hours = hMatch ? Number(hMatch[1]) : 0;
    const minutes = mMatch ? Number(mMatch[1]) : 0;
    const total = hours * 60 + minutes;
    return Number.isFinite(total) ? total : null;
  }

  // fallback: "42分 / 3回" etc
  const fallbackMinutes = t.match(/(-?\d+(?:\.\d+)?)\s*min/i);
  if (fallbackMinutes) {
    const total = Number(fallbackMinutes[1]);
    return Number.isFinite(total) ? total : null;
  }

  return null;
}

function parseHHMM(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const match = t.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function StageSegmentBar({
  remRatio,
  lightRatio,
  deepRatio,
}: {
  remRatio: number;
  lightRatio: number;
  deepRatio: number;
}) {
  const total = remRatio + lightRatio + deepRatio;
  const remW = total > 0 ? (remRatio / total) * 100 : 33.33;
  const lightW = total > 0 ? (lightRatio / total) * 100 : 33.33;
  const deepW = total > 0 ? (deepRatio / total) * 100 : 33.34;

  return (
    <div className="mt-2">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(7,20,38,0.06)" }}
        aria-hidden
      >
        <div style={{ width: `${remW}%`, backgroundColor: "#0f6b5c" }} />
        <div style={{ width: `${lightW}%`, backgroundColor: "#b89242" }} />
        <div style={{ width: `${deepW}%`, backgroundColor: "#315f68" }} />
      </div>
      <div className="mt-2 flex justify-between">
        <p className="text-[11px] font-semibold text-slate-500">REM</p>
        <p className="text-[11px] font-semibold text-slate-500">浅い</p>
        <p className="text-[11px] font-semibold text-slate-500">深い</p>
      </div>
    </div>
  );
}

function SimpleMeterBar({
  label,
  valueText,
  ratio01,
  color,
}: {
  label: string;
  valueText: string;
  ratio01: number | null;
  color: string;
}) {
  const safeRatio = ratio01 == null ? null : clamp(ratio01, 0, 1);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
        <p className="text-[11px] font-semibold" style={{ color: NAVY }}>
          {valueText}
        </p>
      </div>
      <div
        className="mt-1 h-2 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(7,20,38,0.06)" }}
        aria-hidden
      >
        <div
          className="h-full"
          style={{
            width: safeRatio == null ? "0%" : `${safeRatio * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function StressGauge({ stressText }: { stressText: string }) {
  const stress = parseLeadingNumber(stressText);
  const ratio01 = stress == null ? null : clamp(stress / 100, 0, 1);
  return (
    <div className="mt-2">
      <SimpleMeterBar
        label="測定ストレス"
        valueText={displayValue(stressText)}
        ratio01={ratio01}
        color="#a33a3a"
      />
    </div>
  );
}

function CircadianTimeline({
  bedtime,
  wakeTime,
  phaseText,
}: {
  bedtime: string;
  wakeTime: string;
  phaseText: string;
}) {
  const bed = parseHHMM(bedtime);
  const wake = parseHHMM(wakeTime);

  if (bed == null || wake == null) {
    return (
      <div className="mt-2">
        <p className="text-[11px] font-semibold text-slate-500">体内時計</p>
        <p className="mt-1 text-[13px] font-semibold" style={{ color: NAVY }}>
          {phaseText || "—"}
        </p>
      </div>
    );
  }

  const start = bed;
  let end = wake;
  let crosses = false;
  if (end <= start) {
    crosses = true;
    end += 1440;
  }

  const startPct = (start / 1440) * 100;
  const endPctRaw = (end % 1440) / 1440;
  const endPct = crosses ? endPctRaw * 100 : (end / 1440) * 100;

  const widthPct = crosses ? 100 - startPct : endPct - startPct;
  const widthPct2 = crosses ? endPct : 0;

  return (
    <div className="mt-2">
      <div
        className="relative h-3 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(7,20,38,0.06)" }}
        aria-hidden
      >
        <div
          className="absolute h-full"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(0, widthPct)}%`,
            backgroundColor: "#d8b36a",
          }}
        />
        {crosses && (
          <div
            className="absolute h-full"
            style={{
              left: "0%",
              width: `${Math.max(0, widthPct2)}%`,
              backgroundColor: "#d8b36a",
            }}
          />
        )}
      </div>
      <div className="mt-2 flex justify-between">
        <p className="text-[11px] font-semibold text-slate-500">
          入眠 {bedtime || "—"}
        </p>
        <p className="text-[11px] font-semibold text-slate-500">
          起床 {wakeTime || "—"}
        </p>
      </div>
      <p className="mt-2 text-[11px] font-semibold" style={{ color: NAVY }}>
        {phaseText || "—"}
      </p>
    </div>
  );
}

/** confirmedMetrics（最終採用値）から Visual パネルを構築 */
function buildVisualPanels(confirmedMetrics: AnalysisMetrics): VisualPanel[] {
  const m = confirmedMetrics;
  return [
    {
      id: "stages",
      title: "睡眠ステージ",
      subtitle: "SLEEP STAGES",
      graph: (() => {
        const remP = parsePercent(m.remSleepRate);
        const lightP = parsePercent(m.lightSleepRate);
        const deepP = parsePercent(m.deepSleepRate);

        if (remP != null || lightP != null || deepP != null) {
          return (
            <StageSegmentBar
              remRatio={remP ?? 0}
              lightRatio={lightP ?? 0}
              deepRatio={deepP ?? 0}
            />
          );
        }

        const remM = parseDurationMinutes(m.remSleep);
        const lightM = parseDurationMinutes(m.lightSleep);
        const deepM = parseDurationMinutes(m.deepSleep);
        return (
          <StageSegmentBar
            remRatio={remM ?? 0}
            lightRatio={lightM ?? 0}
            deepRatio={deepM ?? 0}
          />
        );
      })(),
      values: [
        { label: "REM（時間）", value: displayValue(m.remSleep) },
        { label: "REM睡眠率", value: displayValue(m.remSleepRate) },
        { label: "浅い睡眠（時間）", value: displayValue(m.lightSleep) },
        { label: "浅い睡眠率", value: displayValue(m.lightSleepRate) },
        { label: "深い睡眠（時間）", value: displayValue(m.deepSleep) },
        { label: "深い睡眠率", value: displayValue(m.deepSleepRate) },
      ],
    },
    {
      id: "stage-detail",
      title: "睡眠ステージ詳細",
      subtitle: "STAGE DETAIL",
      graph: (() => {
        const eff = parsePercent(m.sleepEfficiency);
        const awake = parsePercent(m.awakeningRate);
        const effRatio01 = eff == null ? null : clamp(eff / 100, 0, 1);
        const awakeRatio01 = awake == null ? null : clamp(awake / 100, 0, 1);
        return (
          <div className="mt-2 space-y-1">
            <SimpleMeterBar
              label="睡眠効率"
              valueText={displayValue(m.sleepEfficiency)}
              ratio01={effRatio01}
              color="#315f68"
            />
            <SimpleMeterBar
              label="覚醒率"
              valueText={displayValue(m.awakeningRate)}
              ratio01={awakeRatio01}
              color="#8a6a2d"
            />
          </div>
        );
      })(),
      values: [
        { label: "睡眠時間", value: displayValue(m.sleepDuration) },
        { label: "睡眠効率", value: displayValue(m.sleepEfficiency) },
        { label: "覚醒時間", value: displayValue(m.awakenings) },
        { label: "覚醒率", value: displayValue(m.awakeningRate) },
        { label: "入眠潜時", value: displayValue(m.sleepLatency) },
        { label: "睡眠負債", value: displayValue(m.sleepDebt) },
        { label: "REM睡眠率", value: displayValue(m.remSleepRate) },
        { label: "浅い睡眠率", value: displayValue(m.lightSleepRate) },
        { label: "深い睡眠率", value: displayValue(m.deepSleepRate) },
      ],
    },
    {
      id: "stress",
      title: "ストレスモニター",
      subtitle: "STRESS MONITOR",
      graph: <StressGauge stressText={m.stress} />,
      values: [{ label: "ストレス（測定）", value: displayValue(m.stress) }],
    },
    {
      id: "circadian",
      title: "体内時計",
      subtitle: "CIRCADIAN",
      graph: (
        <CircadianTimeline
          bedtime={m.bedtime}
          wakeTime={m.wakeTime}
          phaseText={m.circadianRhythm}
        />
      ),
      values: [
        { label: "位相", value: displayValue(m.circadianRhythm) },
      ],
    },
    {
      id: "respiration",
      title: "睡眠時呼吸",
      subtitle: "SLEEP RESPIRATION",
      graph: (() => {
        const rr = parseLeadingNumber(m.respiratoryRate);
        const spo2 = parsePercent(m.spo2) ?? parseLeadingNumber(m.spo2);
        const rrRatio01 = rr == null ? null : clamp(rr / 30, 0, 1);
        const spo2Ratio01 = spo2 == null ? null : clamp(Number(spo2) / 100, 0, 1);
        return (
          <div className="mt-2 space-y-1">
            <SimpleMeterBar
              label="呼吸速度"
              valueText={displayValue(m.respiratoryRate)}
              ratio01={rrRatio01}
              color="#315f68"
            />
            <SimpleMeterBar
              label="SpO₂"
              valueText={displayValue(m.spo2)}
              ratio01={spo2Ratio01}
              color="#d8b36a"
            />
          </div>
        );
      })(),
      values: [
        { label: "呼吸速度", value: displayValue(m.respiratoryRate) },
        { label: "平均SpO₂", value: displayValue(m.spo2) },
      ],
    },
    {
      id: "rhr",
      title: "安静時心拍数",
      subtitle: "RESTING HR",
      values: [
        { label: "安静時心拍数", value: displayValue(m.restingHeartRate) },
      ],
      graph: (() => {
        const rhr = parseLeadingNumber(m.restingHeartRate);
        const ratio01 = rhr == null ? null : clamp((rhr - 40) / 50, 0, 1);
        return (
          <div className="mt-2">
            <SimpleMeterBar
              label="RHR"
              valueText={displayValue(m.restingHeartRate)}
              ratio01={ratio01}
              color="#0f6b5c"
            />
          </div>
        );
      })(),
    },
    {
      id: "hrv",
      title: "HRV",
      subtitle: "HRV",
      values: [{ label: "HRV", value: displayValue(m.hrv) }],
      graph: (() => {
        const hrv = parseLeadingNumber(m.hrv);
        const ratio01 = hrv == null ? null : clamp((hrv - 10) / 90, 0, 1);
        return (
          <div className="mt-2">
            <SimpleMeterBar
              label="HRV"
              valueText={displayValue(m.hrv)}
              ratio01={ratio01}
              color="#8a6a2d"
            />
          </div>
        );
      })(),
    },
    {
      id: "skin-temp",
      title: "皮膚温度",
      subtitle: "SKIN TEMP",
      values: [
        { label: "皮膚温度", value: displayValue(m.skinTemperature) },
      ],
      graph: (() => {
        const t = parseLeadingNumber(m.skinTemperature);
        const ratio01 = t == null ? null : clamp((t + 1) / 2, 0, 1);
        return (
          <div className="mt-2">
            <SimpleMeterBar
              label="Skin Temp"
              valueText={displayValue(m.skinTemperature)}
              ratio01={ratio01}
              color="#b89242"
            />
          </div>
        );
      })(),
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
      {items.map((item, index) => (
        <li
          key={`${index}-${item.slice(0, 24)}`}
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
              href="/clients"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold transition hover:bg-slate-50"
              style={{ color: NAVY }}
            >
              クライアント一覧
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
  // OCR→統合→確認で確定した単一ソース（Medical / Visual 共通）
  const confirmedMetrics = result.metrics;
  const score = Math.max(0, Math.min(100, Math.round(result.score)));
  const improvements = takeItems(result.improvements, 3).map((item) =>
    clampLine(item, 140),
  );
  const actionPlan = takeItems(
    result.actionPlan?.length ? result.actionPlan : result.tomorrowPlan,
    3,
  ).map((item) => clampLine(item, 140));
  const { primary: primaryPlan, next: nextPlans } = splitTomorrowPlan(actionPlan);
  const summaryText = clampLine(clampSentences(result.summary, 8), 560);
  const characteristicsText = clampLine(
    clampSentences(
      result.sleepCharacteristics || result.dataInsight || "",
      10,
    ),
    720,
  );
  const melatoninYogaText = clampLine(
    clampSentences(result.melatoninYoga || "", 8),
    520,
  );
  const cautionText = clampLine(result.caution ?? "", 120);
  const disclaimerText = clampLine(
    clampSentences(result.disclaimer ?? "", 2),
    120,
  );
  const visualPanels = buildVisualPanels(confirmedMetrics);
  /** Visual Report は SCREEN01–05 まで（6枚目以降は載せない＝3ページ化防止） */
  const visualImages = images.slice(0, 5);
  const visualSlots = Math.max(visualImages.length, 1);
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
          <AnalysisFlow current={4} />
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
                  Sleep Wellness Medical Report
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

          <section className="report-metrics mt-5 sm:mt-6">
            <SectionLabel title="確認済み睡眠データ" eyebrow="CONFIRMED" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4">
              {(
                [
                  ["睡眠スコア", confirmedMetrics.sleepScore],
                  ["睡眠時間", confirmedMetrics.sleepDuration],
                  ["入眠時間", confirmedMetrics.bedtime],
                  ["起床時間", confirmedMetrics.wakeTime],
                  ["睡眠効率", confirmedMetrics.sleepEfficiency],
                  ["睡眠負債", confirmedMetrics.sleepDebt],
                  ["入眠潜時", confirmedMetrics.sleepLatency],
                  ["体内時計", confirmedMetrics.circadianRhythm],
                  ["覚醒時間", confirmedMetrics.awakenings],
                  ["覚醒率", confirmedMetrics.awakeningRate],
                  ["REM睡眠", confirmedMetrics.remSleep],
                  ["レム睡眠率", confirmedMetrics.remSleepRate],
                  ["浅い睡眠", confirmedMetrics.lightSleep],
                  ["浅い睡眠率", confirmedMetrics.lightSleepRate],
                  ["深い睡眠", confirmedMetrics.deepSleep],
                  ["深い睡眠率", confirmedMetrics.deepSleepRate],
                  ["呼吸速度", confirmedMetrics.respiratoryRate],
                  ["平均SpO₂", confirmedMetrics.spo2],
                  ["安静時心拍数", confirmedMetrics.restingHeartRate],
                  ["HRV", confirmedMetrics.hrv],
                  ["皮膚温度", confirmedMetrics.skinTemperature],
                  ["ストレス", confirmedMetrics.stress],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-3 py-3 sm:px-3.5 sm:py-3.5"
                >
                  <p className="text-[10px] font-medium tracking-[0.04em] text-slate-400 sm:text-[11px]">
                    {label}
                  </p>
                  <p
                    className="mt-1 text-[0.95rem] font-semibold tracking-[-0.03em] sm:text-[1.02rem]"
                    style={{ color: NAVY }}
                  >
                    {displayValue(value)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="report-assessment mt-6 rounded-xl border border-[#071426]/10 bg-[#fafafa] px-4 py-5 sm:mt-7 sm:px-5 sm:py-5">
            <SectionLabel title="① 総合評価" eyebrow="OVERVIEW" />
            <div className="report-summary mt-1">
              <FormattedAiText text={summaryText || "—"} />
            </div>
          </section>

          <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <SectionLabel title="② 睡眠の特徴" eyebrow="CHARACTERISTICS" />
            <FormattedAiText text={characteristicsText || "—"} />
          </section>

          <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <SectionLabel title="③ 改善ポイント" eyebrow="IMPROVE" />
            <BulletList items={improvements} />
          </section>

          <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <SectionLabel
              title="④ 今日から実践する3つの行動"
              eyebrow="ACTION"
            />
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

          <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <SectionLabel
              title="⑤ メラトニンヨガ™の推奨内容"
              eyebrow="MELATONIN YOGA"
            />
            <FormattedAiText text={melatoninYogaText || "—"} />
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
                  Sleep Wellness Visual Report
                </h2>
                <p className="visual-subtitle mt-2 text-sm leading-6 text-slate-500 sm:text-[15px]">
                  睡眠ステージ・生体指標の可視化
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  SLEEP SCORE
                </p>
                <p
                  className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
                  style={{ color: NAVY }}
                >
                  {displayValue(confirmedMetrics.sleepScore)}
                </p>
                <p className="mt-1 text-[11px] tracking-[0.12em] text-slate-400">
                  SOXAI
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
                  {panel.graph}
                  {panel.values && panel.values.length > 0 && (
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
                  )}
              </div>
            ))}
          </section>

          {visualImages.length > 0 ? (
            <div
              className={`visual-grid mt-5 grid gap-3 sm:mt-6 sm:gap-4 ${visualCols}`}
            >
              {visualImages.map((src, index) => (
                <figure
                  key={`visual-${index}`}
                  className="visual-cell overflow-hidden rounded-xl border border-[#071426]/10 bg-[#f4f4f2]"
                >
                  <div className="relative aspect-[3/4] w-full min-h-[180px] sm:min-h-[220px]">
                    <Image
                      src={src}
                      alt={`SOXAI測定画面 ${index + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="border-t border-[#071426]/08 px-3 py-1.5 text-center text-[11px] font-medium tracking-[0.08em] text-slate-400">
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
            onClick={() => {
              const saved = loadLastSavedAnalysisRef();
              if (saved) {
                recordPdfDownload(
                  saved.clientId,
                  saved.analysisId,
                  "PDFダウンロード",
                );
              }
              window.print();
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            PDFダウンロード
          </button>

          <Link
            href="/clients"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-center text-base font-semibold transition hover:bg-slate-50"
            style={{ color: NAVY }}
          >
            クライアント一覧
          </Link>

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
