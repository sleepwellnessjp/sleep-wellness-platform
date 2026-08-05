/**
 * Sleep Wellness Institute Japan 公式 睡眠カウンセリングシート（印刷専用）。
 * SOXAI / Oura 共通レイアウト。デバイス差は deviceName（表示名）のみ。
 * Expert Report / 分析ロジック / Oura 固有項目の全載せは行わない。
 */

"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  WELLNESS_CATEGORY_LABELS,
  type AnalysisResult,
  type ScoreStars,
  type WellnessCategoryKey,
} from "@/lib/analysis-session";
import { buildCounselingSheetModel } from "@/lib/counseling-sheet";
import {
  buildClientWellnessReport,
  formatStars,
  type LifestyleSnapshot,
} from "@/lib/wellness-client-report";
import type { RecoveryIndexResult } from "@/lib/recovery-index";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import { formatOuraDeviceLabel } from "@/lib/device-adapters/oura";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const GOLD_SOFT = "#fbf9f4";
const SURFACE = "#fafaf8";

const GOOD_ICONS = ["✓", "🌙", "⭐", "✦"] as const;

const KEY_METRICS: Array<{ label: string; key: keyof AnalysisMetrics }> = [
  { label: "睡眠時間", key: "sleepDuration" },
  { label: "睡眠効率", key: "sleepEfficiency" },
  { label: "入眠潜時", key: "sleepLatency" },
  { label: "覚醒時間", key: "awakenings" },
  { label: "レム睡眠", key: "remSleep" },
  { label: "深い睡眠", key: "deepSleep" },
  { label: "HRV", key: "hrv" },
  { label: "安静時心拍", key: "restingHeartRate" },
  { label: "SpO₂", key: "spo2" },
  { label: "呼吸数", key: "respiratoryRate" },
];

function displayMetric(
  metrics: AnalysisMetrics,
  key: keyof AnalysisMetrics,
): string {
  const value = metrics[key];
  if (value == null) return "—";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "—";
  }
  const text = String(value).trim();
  return text || "—";
}

function clampText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function overallStatusLabel(stars: ScoreStars): string {
  if (stars >= 5) return "Excellent";
  if (stars === 4) return "Overall Good";
  if (stars === 3) return "Fair";
  if (stars === 2) return "Needs Care";
  return "Needs Rest";
}

function priorityStars(tier: "highest" | "next" | "optional"): string {
  if (tier === "highest") return "★★★★★";
  if (tier === "next") return "★★★★☆";
  return "★★★☆☆";
}

function scoreBars(score: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(score / 10)));
  return `${"■".repeat(filled)}${"□".repeat(10 - filled)}`;
}

function PdfSectionTitle({
  title,
  eyebrow,
  compact = false,
}: {
  title: string;
  eyebrow: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-2 border-b border-[#071426]/12 ${
        compact ? "mb-0.5 pb-0.5" : "mb-1 pb-0.5"
      }`}
    >
      <h2
        className="text-[11px] font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        {title}
      </h2>
      <p
        className="text-[7px] font-semibold tracking-[0.16em]"
        style={{ color: GOLD }}
      >
        {eyebrow}
      </p>
    </div>
  );
}

function CheckboxRow({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-start ${compact ? "gap-1.5 py-0" : "gap-2"}`}>
      <span
        className={`shrink-0 rounded-[2px] border border-[#071426]/45 bg-white ${
          compact
            ? "mt-[1px] h-[9px] w-[9px]"
            : "mt-[1px] h-[11px] w-[11px]"
        }`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

function WriteInField({
  title,
  prompts,
  linesPerPrompt = 3,
  compact = false,
}: {
  title: string;
  prompts: string[];
  linesPerPrompt?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded border border-dashed border-[#071426]/35 bg-[#fafaf8] ${
        compact ? "px-2 py-1" : "px-2.5 py-2"
      }`}
    >
      <p
        className="text-[9px] font-semibold tracking-[0.1em]"
        style={{ color: GOLD }}
      >
        {title}
      </p>
      <div className={compact ? "mt-1 space-y-1" : "mt-1.5 space-y-2"}>
        {prompts.map((prompt) => (
          <div key={prompt}>
            <p className="text-[8px] font-medium text-slate-500">{prompt}</p>
            <div className={compact ? "mt-0.5 space-y-1" : "mt-0.5 space-y-2"}>
              {Array.from({ length: linesPerPrompt }).map((_, index) => (
                <div
                  key={index}
                  className="h-0 border-b border-[#071426]/20"
                  aria-hidden
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClientDiagnosticPdf({
  result,
  lifestyle,
  deviceName,
  recovery,
}: {
  result: AnalysisResult;
  lifestyle?: LifestyleSnapshot | null;
  deviceName?: string;
  recovery: RecoveryIndexResult;
}) {
  const resolvedDeviceName =
    deviceName?.trim() ||
    (result.inputSource === "oura"
      ? formatOuraDeviceLabel()
      : result.inputSource === "manual"
        ? "手入力"
        : "SOXAI Ring");
  const model = buildClientWellnessReport(result, lifestyle);
  const sheet = buildCounselingSheetModel(result, lifestyle);
  const metrics = result.metrics;
  const categoryKeys = Object.keys(
    WELLNESS_CATEGORY_LABELS,
  ) as WellnessCategoryKey[];
  const rationales = result.categoryScoreRationales;

  const nextGoals = (result.recommendationsUntilNext ?? [])
    .map((item) => (item?.text ?? "").trim())
    .filter(Boolean)
    .slice(0, 4);

  const fallbackGoals =
    nextGoals.length > 0
      ? nextGoals
      : (result.todaysRecommendations ?? [])
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 4);

  const priorityActions = sheet.priorities
    .map((p) => p.action)
    .filter(Boolean)
    .slice(0, 4);

  const goals: string[] = [
    ...(fallbackGoals.length > 0
      ? fallbackGoals
      : priorityActions.length > 0
        ? priorityActions
        : [
            "今夜できる小さな一歩を1つ実践する",
            "就寝・起床時刻をできるだけそろえる",
            "寝る30分前から画面を見ない",
            "朝起きたら光を取り入れる",
          ]),
  ];
  while (goals.length < 4) goals.push("");

  const melatonin = result.melatoninYogaPlan
    ? {
        phase: result.melatoninYogaPlan.recommendedPhase,
        breathing: result.melatoninYogaPlan.breathing,
        bathing: result.melatoninYogaPlan.bathing,
        morning: result.melatoninYogaPlan.morningAction,
      }
    : {
        phase: model.melatoninYoga.phase,
        breathing: model.melatoninYoga.breathing,
        bathing: model.melatoninYoga.bathing,
        morning: model.melatoninYoga.morningAction,
      };

  const melatoninItems = [
    { icon: "①", label: "Phase", value: melatonin.phase || "要確認" },
    { icon: "②", label: "呼吸", value: melatonin.breathing || "要確認" },
    { icon: "③", label: "入浴", value: melatonin.bathing || "要確認" },
    { icon: "④", label: "朝", value: melatonin.morning || "要確認" },
  ];

  return (
    <div className="client-diagnostic-pdf" aria-hidden="true">
      {/* —— 1ページ目：診断結果 —— */}
      <section className="client-diagnostic-page client-diagnostic-page-front">
        <header className="flex items-start justify-between gap-2 border-b border-[#071426]/12 pb-1">
          <div className="min-w-0">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={200}
              height={50}
              className="h-auto w-[100px] object-contain"
            />
            <p
              className="mt-1 text-[7px] font-semibold tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              OFFICIAL COUNSELING SHEET
            </p>
            <h1
              className="mt-0.5 text-[13px] font-semibold tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              睡眠カウンセリングシート
            </h1>
            <p className="mt-0.5 text-[8px] text-slate-500">
              1ページ目 · 診断結果
            </p>
          </div>
          <div className="shrink-0 text-right text-[8px] leading-3 text-slate-600">
            <p className="font-semibold" style={{ color: NAVY }}>
              {result.clientName || "クライアント"}
            </p>
            <p>{result.measurementDate || "測定日未設定"}</p>
            <p>デバイス：{resolvedDeviceName}</p>
            <p className="mt-0.5 text-[7px] text-slate-400">1 / 3</p>
          </div>
        </header>

        {/* 総合評価 + Recovery（高さ約2/3へ圧縮） */}
        <div className="pdf-hero-row mt-1.5 grid grid-cols-2 gap-1.5">
          <div
            className="pdf-hero-card rounded-md border-2 px-2.5 py-2"
            style={{ borderColor: NAVY, background: SURFACE }}
          >
            <p
              className="text-[8px] font-semibold tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              OVERALL ASSESSMENT
            </p>
            <p
              className="mt-0.5 text-[12px] font-semibold leading-tight"
              style={{ color: NAVY }}
            >
              今日の総合評価
            </p>
            <div className="mt-1.5 flex items-end gap-2.5">
              <p
                className="text-[40px] font-semibold leading-none tracking-[-0.06em]"
                style={{ color: NAVY }}
              >
                {model.score}
              </p>
              <div className="pb-0.5">
                <p
                  className="text-[14px] tracking-[0.12em]"
                  style={{ color: GOLD }}
                >
                  {formatStars(model.stars)}
                </p>
                <p
                  className="mt-0.5 text-[12px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {overallStatusLabel(model.stars)}
                </p>
              </div>
            </div>
            <p className="mt-1 text-[8px] leading-3 text-slate-600">
              Sleep Wellness Score {Math.round(result.score)} · SWIJ独自評価
            </p>
          </div>

          <div
            className="pdf-hero-card rounded-md border-2 px-2.5 py-2"
            style={{
              borderColor: recovery.available ? recovery.accent : NAVY,
              background: recovery.available ? recovery.accentSoft : SURFACE,
            }}
          >
            <p
              className="text-[8px] font-semibold tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              RECOVERY INDEX
            </p>
            <p
              className="mt-0.5 text-[12px] font-semibold leading-tight"
              style={{ color: NAVY }}
            >
              回復指数
            </p>
            {recovery.available ? (
              <div className="mt-1.5">
                <p
                  className="text-[40px] font-semibold leading-none tracking-[-0.05em]"
                  style={{ color: recovery.accent }}
                >
                  {recovery.score}
                </p>
                <div
                  className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    color: recovery.accent,
                    background: "#ffffff",
                    border: `1px solid ${recovery.accent}55`,
                  }}
                >
                  <span>{recovery.emoji}</span>
                  <span>{recovery.label}</span>
                </div>
                <p className="mt-1 text-[8px] leading-3 text-slate-700">
                  {clampText(recovery.summary, 68)}
                </p>
              </div>
            ) : (
              <p className="mt-1.5 text-[9px] leading-3.5 text-slate-500">
                {recovery.message}
              </p>
            )}
          </div>
        </div>

        {/* Today's Focus */}
        <div
          className="mt-1.5 rounded-md border-2 px-2.5 py-1.5"
          style={{ borderColor: GOLD, background: GOLD_SOFT }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold" style={{ color: NAVY }}>
              今回のテーマ
            </p>
            <p
              className="text-[8px] font-semibold tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              TODAY&apos;S FOCUS
            </p>
          </div>
          <p
            className="mt-1 text-[13px] font-semibold leading-4 tracking-[-0.02em]"
            style={{ color: NAVY }}
          >
            {sheet.sessionTheme}
          </p>
        </div>

        {/* 4領域 + バー */}
        <div className="mt-1.5 rounded-md border border-[#071426]/12 px-2.5 py-1.5">
          <PdfSectionTitle title="4領域スコア" eyebrow="BALANCE" compact />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {categoryKeys.map((key) => {
              const score = Math.round(result.categoryScores[key]);
              return (
                <div key={key} className="flex items-center gap-2">
                  <p
                    className="w-8 shrink-0 text-[9px] font-semibold"
                    style={{ color: NAVY }}
                  >
                    {WELLNESS_CATEGORY_LABELS[key]}
                  </p>
                  <p
                    className="min-w-0 flex-1 truncate text-[10px] tracking-[-0.04em]"
                    style={{ color: GOLD }}
                    aria-label={`${WELLNESS_CATEGORY_LABELS[key]} ${score}`}
                  >
                    {scoreBars(score)}
                  </p>
                  <p
                    className="w-7 shrink-0 text-right text-[12px] font-semibold tabular-nums"
                    style={{ color: NAVY }}
                  >
                    {score}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 要因 */}
        <div className="mt-1.5 rounded-md border border-[#071426]/12 px-2.5 py-1.5">
          <PdfSectionTitle
            title="今日の睡眠に影響した要因"
            eyebrow="FACTORS"
            compact
          />
          <div className="space-y-0.5">
            {sheet.impactFactors.slice(0, 3).map((factor, index) => (
              <div
                key={`${factor.label}-${index}`}
                className="flex gap-1.5 text-[8px] leading-3 text-slate-700"
              >
                <span
                  className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[7px] font-semibold text-white"
                  style={{ background: NAVY }}
                >
                  {index + 1}
                </span>
                <span>{factor.reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Good Point + 改善優先順位カード */}
        <div className="mt-1.5 grid grid-cols-[0.85fr_1.15fr] gap-1.5">
          <div className="rounded-md border border-[#071426]/12 px-2 py-1.5">
            <PdfSectionTitle title="今日のGood Point" eyebrow="GOOD" compact />
            <ul className="space-y-1">
              {model.goodPoints.slice(0, 4).map((point, index) => (
                <li
                  key={`${point}-${index}`}
                  className="flex gap-1.5 text-[8px] leading-3 text-slate-700"
                >
                  <span
                    className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]"
                    style={{
                      color: GOLD,
                      background: GOLD_SOFT,
                      border: `1px solid ${GOLD}55`,
                    }}
                  >
                    {GOOD_ICONS[index % GOOD_ICONS.length]}
                  </span>
                  <span className="pt-0.5">{clampText(point, 40)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-0.5 flex items-baseline justify-between gap-2 border-b border-[#071426]/12 pb-0.5">
              <h2
                className="text-[11px] font-semibold"
                style={{ color: NAVY }}
              >
                改善優先順位
              </h2>
              <p
                className="text-[7px] font-semibold tracking-[0.16em]"
                style={{ color: GOLD }}
              >
                PRIORITY
              </p>
            </div>
            <div className="space-y-1">
              {sheet.priorities.slice(0, 3).map((item) => (
                <div
                  key={`${item.tier}-${item.content}`}
                  className="rounded-md border border-[#071426]/12 px-2 py-1"
                  style={{ background: SURFACE }}
                >
                  <p
                    className="text-[7px] font-semibold tracking-[0.08em]"
                    style={{ color: GOLD }}
                  >
                    {item.tierLabel} {priorityStars(item.tier)}
                  </p>
                  <p
                    className="mt-0.5 text-[9px] font-semibold leading-3"
                    style={{ color: NAVY }}
                  >
                    {clampText(item.content, 34)}
                  </p>
                  <p className="mt-0.5 text-[7px] leading-[1.25] text-slate-600">
                    <span className="font-semibold text-slate-700">理由 </span>
                    {clampText(item.reason, 42)}
                  </p>
                  <p className="text-[7px] leading-[1.25] text-slate-600">
                    <span className="font-semibold text-slate-700">
                      今日やること{" "}
                    </span>
                    {clampText(item.action, 38)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* —— 2〜3ページ目：実践シート —— */}
      <section className="client-diagnostic-page client-diagnostic-page-back">
        <header className="flex items-end justify-between border-b border-[#071426]/12 pb-0.5">
          <div>
            <p
              className="text-[7px] font-semibold tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              PRACTICE SHEET
            </p>
            <h2
              className="mt-0.5 text-[13px] font-semibold tracking-[-0.02em]"
              style={{ color: NAVY }}
            >
              実践シート
            </h2>
            <p className="mt-0.5 text-[8px] text-slate-500">
              2〜3ページ目 · 今日から何をするか
            </p>
          </div>
          <p className="text-[7px] text-slate-400">2–3 / 3</p>
        </header>

        <div className="mt-1 rounded-md border border-[#071426]/12 px-2 py-1">
          <PdfSectionTitle
            title="主要測定値（厳選）"
            eyebrow="KEY METRICS"
            compact
          />
          <div className="grid grid-cols-5 gap-1">
            {KEY_METRICS.map(({ label, key }) => (
              <div
                key={label}
                className="rounded-md px-1 py-0.5 text-center"
                style={{ background: SURFACE }}
              >
                <p className="text-[7px] text-slate-500">{label}</p>
                <p
                  className="mt-0.5 text-[11px] font-semibold leading-3 tracking-[-0.03em] tabular-nums"
                  style={{ color: NAVY }}
                >
                  {displayMetric(metrics, key)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-1">
          <PdfSectionTitle title="各数値の分析" eyebrow="ANALYSIS" compact />
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                ["身体", rationales?.body],
                ["心", rationales?.mind],
                ["生活", rationales?.lifestyle],
                ["環境", rationales?.environment],
              ] as const
            ).map(([label, text]) => (
              <div
                key={label}
                className="rounded-md border border-[#071426]/10 px-2 py-1"
                style={{ background: SURFACE }}
              >
                <p
                  className="text-[9px] font-semibold"
                  style={{ color: NAVY }}
                >
                  {label}
                </p>
                <p className="mt-0.5 text-[7px] leading-[1.3] text-slate-600">
                  {text?.trim()
                    ? clampText(text, 58)
                    : "詳細は Expert Report で確認できます"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-1 rounded-md border-2 px-2 py-1"
          style={{ borderColor: GOLD, background: GOLD_SOFT }}
        >
          <PdfSectionTitle
            title="メラトニンヨガ™提案"
            eyebrow="MELATONIN YOGA"
            compact
          />
          <div className="grid grid-cols-2 gap-1">
            {melatoninItems.map((item) => (
              <div
                key={item.label}
                className="flex gap-1.5 rounded-md bg-white/80 px-1.5 py-0.5"
              >
                <span
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[7px] font-semibold text-white"
                  style={{ background: NAVY }}
                >
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p
                    className="text-[7px] font-semibold tracking-[0.08em]"
                    style={{ color: GOLD }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="text-[8px] font-semibold leading-3"
                    style={{ color: NAVY }}
                  >
                    {clampText(item.value, 32)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 次回までの目標：高さ約1/2へ圧縮 */}
        <div className="pdf-next-goals mt-1 rounded-md border border-[#071426]/12 px-2 py-1">
          <PdfSectionTitle
            title="次回までの目標"
            eyebrow="NEXT GOALS"
            compact
          />
          <div className="space-y-0.5">
            {goals.slice(0, 4).map((goal, index) => (
              <CheckboxRow key={index} compact>
                <span className="text-[8px] leading-[1.25] text-slate-700">
                  {goal ? clampText(goal, 72) : "\u00A0"}
                </span>
              </CheckboxRow>
            ))}
          </div>
        </div>

        <div className="mt-1 grid grid-cols-2 gap-1.5">
          <WriteInField
            title="今日のリアクション（ご本人記入）"
            prompts={["・今日気付いたこと", "・今日からやること"]}
            linesPerPrompt={2}
            compact
          />
          <WriteInField
            title="認定講師コメント"
            prompts={["・次回までの宿題", "・講師からの一言"]}
            linesPerPrompt={2}
            compact
          />
        </div>

        <div className="mt-1 rounded-md border border-[#071426]/12 px-2 py-1">
          <PdfSectionTitle
            title="AIから認定講師への提案"
            eyebrow="FOR INSTRUCTOR"
            compact
          />
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                {
                  no: "①",
                  title: "最初に褒める",
                  items: [sheet.instructorBlocks.praise],
                },
                {
                  no: "②",
                  title: "確認する質問",
                  items: sheet.instructorBlocks.questions,
                },
                {
                  no: "③",
                  title: "生活改善提案",
                  items: sheet.instructorBlocks.lifestyle,
                },
                {
                  no: "④",
                  title: "次回評価ポイント",
                  items: [sheet.instructorBlocks.nextEval],
                },
              ] as const
            ).map((block) => (
              <div
                key={block.no}
                className="rounded-md px-1.5 py-0.5"
                style={{ background: SURFACE }}
              >
                <p
                  className="text-[7px] font-semibold leading-3"
                  style={{ color: GOLD }}
                >
                  {block.no} {block.title}
                </p>
                <div className="mt-0.5 space-y-0">
                  {block.items.map((item, index) => (
                    <CheckboxRow key={`${block.no}-${index}`} compact>
                      <span className="text-[7px] leading-[1.2] text-slate-700">
                        {clampText(item, 44)}
                      </span>
                    </CheckboxRow>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-1 border-t border-[#071426]/12 pt-0.5 text-[7px] leading-[1.25] text-slate-500">
          <p>
            詳細データ・全グラフ・全測定値はアプリ内「Sleep Wellness Expert
            Report」にのみ掲載しています。
          </p>
          <p className="mt-0.5 font-semibold" style={{ color: NAVY }}>
            Sleep Wellness Institute Japan
          </p>
          <p className="text-[6px] leading-[1.2] text-slate-400">
            © Sleep Wellness Institute Japan · Official Counseling Sheet ·
            Version 1.0
          </p>
        </footer>
      </section>
    </div>
  );
}
