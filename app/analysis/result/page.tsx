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
  const normalized = text.replace(/,/g, "");
  const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
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
        valueText={stressText ? stressText : "—"}
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

function buildVisualPanels(metrics: AnalysisMetrics): VisualPanel[] {
  return [
    {
      id: "stages",
      title: "睡眠ステージ",
      subtitle: "SLEEP STAGES",
      graph: (() => {
        const remP = parsePercent(metrics.remSleepRate);
        const lightP = parsePercent(metrics.lightSleepRate);
        const deepP = parsePercent(metrics.deepSleepRate);

        if (remP != null || lightP != null || deepP != null) {
          return (
            <StageSegmentBar
              remRatio={remP ?? 0}
              lightRatio={lightP ?? 0}
              deepRatio={deepP ?? 0}
            />
          );
        }

        const remM = parseDurationMinutes(metrics.remSleep);
        const lightM = parseDurationMinutes(metrics.lightSleep);
        const deepM = parseDurationMinutes(metrics.deepSleep);
        return (
          <StageSegmentBar
            remRatio={remM ?? 0}
            lightRatio={lightM ?? 0}
            deepRatio={deepM ?? 0}
          />
        );
      })(),
      values: [
        {
          label: "REM（時間）",
          value:
            metrics.remSleep.trim() ? displayValue(metrics.remSleep) : "—",
        },
        {
          label: "浅い睡眠（時間）",
          value:
            metrics.lightSleep.trim()
              ? displayValue(metrics.lightSleep)
              : "—",
        },
        {
          label: "深い睡眠（時間）",
          value:
            metrics.deepSleep.trim() ? displayValue(metrics.deepSleep) : "—",
        },
      ],
    },
    {
      id: "stage-detail",
      title: "睡眠ステージ詳細",
      subtitle: "STAGE DETAIL",
      graph: (() => {
        const eff = parsePercent(metrics.sleepEfficiency);
        const awake = parsePercent(metrics.awakeningRate);
        const effRatio01 = eff == null ? null : clamp(eff / 100, 0, 1);
        const awakeRatio01 = awake == null ? null : clamp(awake / 100, 0, 1);
        return (
          <div className="mt-2 space-y-1">
            <SimpleMeterBar
              label="睡眠効率"
              valueText={metrics.sleepEfficiency || "—"}
              ratio01={effRatio01}
              color="#315f68"
            />
            <SimpleMeterBar
              label="覚醒率"
              valueText={metrics.awakeningRate || "—"}
              ratio01={awakeRatio01}
              color="#8a6a2d"
            />
          </div>
        );
      })(),
      values: [
        { label: "睡眠時間", value: displayValue(metrics.sleepDuration) },
        { label: "睡眠効率", value: displayValue(metrics.sleepEfficiency) },
        { label: "覚醒時間", value: displayValue(metrics.awakenings) },
        { label: "覚醒率", value: displayValue(metrics.awakeningRate) },
        { label: "入眠潜時", value: displayValue(metrics.sleepLatency) },
        { label: "睡眠負債", value: displayValue(metrics.sleepDebt) },
        { label: "REM睡眠率", value: displayValue(metrics.remSleepRate) },
        { label: "浅い睡眠率", value: displayValue(metrics.lightSleepRate) },
        { label: "深い睡眠率", value: displayValue(metrics.deepSleepRate) },
      ],
    },
    {
      id: "stress",
      title: "ストレスモニター",
      subtitle: "STRESS MONITOR",
      graph: <StressGauge stressText={metrics.stress} />,
      values: [{ label: "ストレス（測定）", value: displayValue(metrics.stress) }],
    },
    {
      id: "circadian",
      title: "体内時計",
      subtitle: "CIRCADIAN",
      graph: (
        <CircadianTimeline
          bedtime={metrics.bedtime}
          wakeTime={metrics.wakeTime}
          phaseText={metrics.circadianRhythm}
        />
      ),
      values: [
        { label: "位相", value: displayValue(metrics.circadianRhythm) },
      ],
    },
    {
      id: "respiration",
      title: "睡眠時呼吸",
      subtitle: "SLEEP RESPIRATION",
      graph: (() => {
        const rr = parseLeadingNumber(metrics.respiratoryRate);
        const spo2 = parsePercent(metrics.spo2) ?? parseLeadingNumber(metrics.spo2);
        const rrRatio01 = rr == null ? null : clamp(rr / 30, 0, 1);
        const spo2Ratio01 = spo2 == null ? null : clamp(Number(spo2) / 100, 0, 1);
        return (
          <div className="mt-2 space-y-1">
            <SimpleMeterBar
              label="呼吸速度"
              valueText={metrics.respiratoryRate || "—"}
              ratio01={rrRatio01}
              color="#315f68"
            />
            <SimpleMeterBar
              label="SpO₂"
              valueText={metrics.spo2 || "—"}
              ratio01={spo2Ratio01}
              color="#d8b36a"
            />
          </div>
        );
      })(),
      values: [
        { label: "呼吸速度", value: displayValue(metrics.respiratoryRate) },
        { label: "平均SpO₂", value: displayValue(metrics.spo2) },
      ],
    },
    {
      id: "rhr",
      title: "安静時心拍数",
      subtitle: "RESTING HR",
      values: [
        { label: "安静時心拍数", value: displayValue(metrics.restingHeartRate) },
      ],
      graph: (() => {
        const rhr = parseLeadingNumber(metrics.restingHeartRate);
        const ratio01 = rhr == null ? null : clamp((rhr - 40) / 50, 0, 1);
        return (
          <div className="mt-2">
            <SimpleMeterBar
              label="RHR"
              valueText={metrics.restingHeartRate || "—"}
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
      values: [{ label: "HRV", value: displayValue(metrics.hrv) }],
      graph: (() => {
        const hrv = parseLeadingNumber(metrics.hrv);
        const ratio01 = hrv == null ? null : clamp((hrv - 10) / 90, 0, 1);
        return (
          <div className="mt-2">
            <SimpleMeterBar
              label="HRV"
              valueText={metrics.hrv || "—"}
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
        { label: "皮膚温度", value: displayValue(metrics.skinTemperature) },
      ],
      graph: (() => {
        const t = parseLeadingNumber(metrics.skinTemperature);
        const ratio01 = t == null ? null : clamp((t + 1) / 2, 0, 1);
        return (
          <div className="mt-2">
            <SimpleMeterBar
              label="Skin Temp"
              valueText={metrics.skinTemperature || "—"}
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
  const improvements = takeItems(result.improvements, 2).map((item) =>
    clampLine(item, 88),
  );
  const { primary: primaryPlan } = splitTomorrowPlan(result.tomorrowPlan);
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

          <section className="report-assessment mt-6 rounded-xl border border-[#071426]/10 bg-[#fafafa] px-4 py-5 sm:mt-7 sm:px-5 sm:py-5">
            <SectionLabel title="睡眠ウェルネス所見" eyebrow="MEDICAL" />

            <div className="mt-3 space-y-2">
              <p className="text-[15px] leading-7 text-slate-600">
                睡眠スコアは<strong style={{ color: NAVY }}> {displayValue(result.metrics.sleepScore)}</strong>です。
              </p>
              <div className="space-y-1">
                {[
                  ["睡眠時間", displayValue(result.metrics.sleepDuration)],
                  ["睡眠効率", displayValue(result.metrics.sleepEfficiency)],
                  ["睡眠負債", displayValue(result.metrics.sleepDebt)],
                  ["入眠潜時", displayValue(result.metrics.sleepLatency)],
                  ["覚醒", displayValue(result.metrics.awakenings)],
                  ["レム睡眠", displayValue(result.metrics.remSleep)],
                  ["浅い睡眠", displayValue(result.metrics.lightSleep)],
                  ["深い睡眠", displayValue(result.metrics.deepSleep)],
                  ["体内時計", displayValue(result.metrics.circadianRhythm)],
                  ["呼吸速度", displayValue(result.metrics.respiratoryRate)],
                  ["平均酸素レベル（SpO₂）", displayValue(result.metrics.spo2)],
                  ["安静時心拍数", displayValue(result.metrics.restingHeartRate)],
                  ["HRV", displayValue(result.metrics.hrv)],
                  ["皮膚温度", displayValue(result.metrics.skinTemperature)],
                  ["ストレス", displayValue(result.metrics.stress)],
                ].map(([label, value]) => (
                  <p
                    key={label}
                    className="text-[13px] leading-6 text-slate-600"
                  >
                    <span style={{ color: NAVY, fontWeight: 600 }}>
                      {label}：
                    </span>
                    <span>{value}</span>
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
            <SectionLabel title="生活習慣を踏まえた改善提案" eyebrow="IMPROVEMENT" />
            <div className="mt-2">
              <FormattedAiText text={lifestyleRelationText || "—"} />
              <div className="mt-3">
                <BulletList
                  items={[
                    ...(primaryPlan ? [clampLine(primaryPlan, 88)] : []),
                    ...improvements,
                  ].slice(0, 3)}
                />
              </div>
            </div>
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
                        className="object-cover"
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
