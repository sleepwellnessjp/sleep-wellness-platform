"use client";

import { useEffect, useState } from "react";
import {
  buildClientWellnessReport,
  formatStars,
  type LifestyleSnapshot,
} from "@/lib/wellness-client-report";
import type { AnalysisResult } from "@/lib/analysis-session";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const GOLD_LIGHT = "#d8b36a";

function SectionLabel({
  title,
  eyebrow,
}: {
  title: string;
  eyebrow: string;
}) {
  return (
    <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="hidden h-4 w-[3px] shrink-0 rounded-full sm:block"
          style={{ backgroundColor: GOLD }}
          aria-hidden
        />
        <h2
          className="min-w-0 break-words text-[15px] font-semibold tracking-[-0.02em] sm:text-[1.05rem]"
          style={{ color: NAVY }}
        >
          {title}
        </h2>
      </div>
      <p
        className="text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        {eyebrow}
      </p>
    </div>
  );
}

function ReportCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`report-client-card rounded-2xl border border-[#071426]/10 bg-white px-4 py-5 sm:px-6 sm:py-6 ${className}`}
      style={{
        boxShadow:
          "0 20px 50px -42px rgba(7,20,38,.35), inset 0 1px 0 rgba(255,255,255,.8)",
      }}
    >
      {children}
    </section>
  );
}

const COMMENT_STORAGE_PREFIX = "swij-instructor-comment-v1:";

function commentStorageKey(result: AnalysisResult): string {
  return `${COMMENT_STORAGE_PREFIX}${result.analysisId || result.clientId || "session"}:${result.measurementDate || "na"}`;
}

function readSavedComment(result: AnalysisResult): string {
  const key = commentStorageKey(result);
  try {
    const fromSession = sessionStorage.getItem(key);
    if (fromSession != null) return fromSession;
  } catch {
    // ignore
  }
  try {
    const fromLocal = localStorage.getItem(key);
    if (fromLocal != null) return fromLocal;
  } catch {
    // ignore
  }
  return "";
}

function writeSavedComment(result: AnalysisResult, value: string) {
  const key = commentStorageKey(result);
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/** ⑦ 認定講師コメント（入力・保存・PDF表示） */
export function InstructorCommentEditor({
  result,
  numbered = true,
}: {
  result: AnalysisResult;
  numbered?: boolean;
}) {
  const [instructorComment, setInstructorComment] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    setInstructorComment(readSavedComment(result));
    setSaveState("idle");
  }, [result]);

  const persist = (value: string, showSaved: boolean) => {
    setInstructorComment(value);
    writeSavedComment(result, value);
    if (showSaved) {
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    }
  };

  return (
    <ReportCard className="report-instructor-comment-field">
      <SectionLabel
        title={numbered ? "⑦ 認定講師コメント" : "認定講師コメント"}
        eyebrow="INSTRUCTOR"
      />
      <p className="mb-3 text-[13px] leading-6 text-slate-500 sm:text-[14px]">
        本日のポイントや、次回までのアドバイスを記入してください。保存内容は再表示・PDF出力に反映されます。
      </p>
      <label className="sr-only" htmlFor="instructor-comment-field">
        認定講師コメント
      </label>
      <textarea
        id="instructor-comment-field"
        name="instructorComment"
        rows={8}
        value={instructorComment}
        onChange={(event) => persist(event.target.value, false)}
        placeholder="例：今夜は入浴と呼吸法を優先しましょう。飲酒は就寝2時間前までに終えると、深い睡眠が戻りやすくなります。"
        className="no-print mt-1 min-h-[10rem] w-full resize-y rounded-2xl border border-[#071426]/15 bg-[#fafaf8] px-4 py-3.5 text-[15px] leading-7 text-[#071426] outline-none transition placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10"
      />
      <div className="no-print mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => persist(instructorComment, true)}
          className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[14px] font-semibold text-white transition active:opacity-90"
          style={{ background: NAVY }}
        >
          コメントを保存
        </button>
        <p
          className={`text-[13px] transition ${
            saveState === "saved" ? "text-[#315f68]" : "text-slate-400"
          }`}
        >
          {saveState === "saved"
            ? "保存しました（PDFにも反映されます）"
            : "入力内容は自動でも保持されます"}
        </p>
      </div>
      <div className="print-only-instructor-comment mt-1 hidden min-h-[6rem] whitespace-pre-wrap rounded-2xl border border-[#071426]/12 bg-[#fafaf8] px-4 py-4 text-[14px] leading-7 text-slate-700 print:block">
        {instructorComment.trim()
          ? instructorComment
          : "（認定講師コメント未記入）"}
      </div>
    </ReportCard>
  );
}

/**
 * 認定講師がクライアントへ渡す睡眠ウェルネスレポート（①〜⑦）
 * 既存の数値・グラフは変更せず、その下に追加表示する。
 */
export function ClientWellnessReportSections({
  result,
  lifestyle,
  includeInstructorComment = true,
}: {
  result: AnalysisResult;
  lifestyle?: LifestyleSnapshot | null;
  includeInstructorComment?: boolean;
}) {
  const model = buildClientWellnessReport(result, lifestyle);

  return (
    <div className="report-client-wellness mt-6 space-y-5 sm:mt-8 sm:space-y-6">
      <header
        className="relative overflow-hidden rounded-2xl border border-[#8a6a2d]/25 px-4 py-5 sm:px-6 sm:py-6"
        style={{
          background:
            "linear-gradient(165deg, #ffffff 0%, #fbf9f4 48%, #f7f3ea 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${GOLD_LIGHT}, transparent)`,
          }}
          aria-hidden
        />
        <p
          className="text-[10px] font-semibold tracking-[0.24em]"
          style={{ color: GOLD }}
        >
          SLEEP WELLNESS INSTITUTE JAPAN
        </p>
        <h2
          className="mt-1.5 text-[1.15rem] font-semibold tracking-[-0.03em] sm:text-[1.35rem]"
          style={{ color: NAVY }}
        >
          睡眠ウェルネスレポート
        </h2>
        <p className="mt-2 max-w-[36rem] text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
          認定講師がクライアントへそのままお渡しできる、本日の総合まとめです。測定データと生活習慣をもとに自動生成しています。
        </p>
      </header>

      {/* ① 今日の総合評価 / 総合コメント */}
      <ReportCard className="bg-gradient-to-br from-white via-[#fafaf8] to-[#f4f7f7]">
        <SectionLabel title="① 今日の総合評価" eyebrow="OVERALL" />
        <div className="mt-1 flex flex-wrap items-end gap-6 sm:gap-10">
          <div>
            <p
              className="text-[11px] font-semibold tracking-[0.12em]"
              style={{ color: GOLD }}
            >
              総合評価（100点満点）
            </p>
            <p
              className="mt-1 text-[3rem] leading-none font-semibold tracking-[-0.06em] sm:text-[3.6rem]"
              style={{ color: NAVY }}
            >
              {model.score}
              <span className="ml-1 text-[1rem] font-medium tracking-normal text-slate-400">
                /100
              </span>
            </p>
          </div>
          <div className="pb-1.5">
            <p
              className="text-[11px] font-semibold tracking-[0.12em]"
              style={{ color: GOLD }}
            >
              5段階評価
            </p>
            <p
              className="mt-2 text-[1.45rem] tracking-[0.14em] sm:text-[1.65rem]"
              style={{ color: GOLD }}
              aria-label={`${model.stars}つ星`}
            >
              {formatStars(model.stars)}
            </p>
          </div>
        </div>
        <div className="mt-5">
          <p
            className="mb-2 text-[11px] font-semibold tracking-[0.12em]"
            style={{ color: GOLD }}
          >
            今日の総合コメント
          </p>
          <div className="whitespace-pre-line rounded-xl border border-[#071426]/08 bg-white/90 px-4 py-4 text-[14px] leading-7 text-slate-600 sm:text-[15px] sm:leading-8">
            {model.overallComment}
          </div>
        </div>
      </ReportCard>

      {/* 今日の睡眠に影響した要因 */}
      <ReportCard>
        <SectionLabel title="② 今日の睡眠に影響した要因" eyebrow="FACTORS" />
        <p className="mb-3 text-[13px] leading-6 text-slate-500 sm:text-[14px]">
          入力内容とSOXAIデータから、本日の睡眠に影響したと考えられる要因です（最大5つ）。
        </p>
        <ul className="mt-1 space-y-2.5">
          {model.impactFactors.map((factor, index) => (
            <li
              key={`${factor}-${index}`}
              className="flex gap-3 rounded-xl border border-[#071426]/08 bg-[#fafaf8] px-3.5 py-3.5"
            >
              <span
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{ background: NAVY }}
              >
                {index + 1}
              </span>
              <span
                className="text-[14px] font-medium leading-6 sm:text-[15px]"
                style={{ color: NAVY }}
              >
                {factor}
              </span>
            </li>
          ))}
        </ul>
      </ReportCard>

      {/* ③ Good Point */}
      <ReportCard>
        <SectionLabel title="③ 今日のGood Point" eyebrow="GOOD" />
        <ul className="mt-1 space-y-2.5">
          {model.goodPoints.map((point, index) => (
            <li
              key={`${point}-${index}`}
              className="flex gap-3 rounded-xl border border-[#071426]/08 bg-[#fafaf8] px-3.5 py-3.5"
            >
              <span
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{ background: NAVY }}
              >
                {index + 1}
              </span>
              <span
                className="text-[14px] font-medium leading-6 sm:text-[15px]"
                style={{ color: NAVY }}
              >
                {point}
              </span>
            </li>
          ))}
        </ul>
      </ReportCard>

      {/* ④ 改善優先順位 */}
      <ReportCard>
        <SectionLabel title="④ 改善優先順位" eyebrow="PRIORITY" />
        <p className="mb-3 text-[13px] leading-6 text-slate-500 sm:text-[14px]">
          認定講師が説明しやすいよう、最優先から順に整理しています。
        </p>
        <div className="mt-1 space-y-3.5">
          {model.priorityImprovements.map((item) => (
            <div
              key={`${item.tier}-${item.title}`}
              className="rounded-xl border border-[#071426]/08 bg-[#fafaf8] px-3.5 py-3.5"
            >
              <p
                className="text-[11px] font-semibold tracking-[0.12em]"
                style={{ color: GOLD }}
              >
                {item.tierLabel}
              </p>
              <p
                className="mt-1.5 text-[14px] font-semibold tracking-[-0.01em] sm:text-[15px]"
                style={{ color: NAVY }}
              >
                {item.title}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-slate-600 sm:text-[14px] sm:leading-7">
                <span className="font-semibold text-slate-700">理由：</span>
                {item.reason}
              </p>
              <p className="mt-1.5 text-[13px] leading-6 text-slate-600 sm:text-[14px] sm:leading-7">
                <span className="font-semibold text-slate-700">行動：</span>
                {item.action}
              </p>
            </div>
          ))}
        </div>
      </ReportCard>

      {/* ⑤ メラトニンヨガ™提案 */}
      <ReportCard className="border-[#8a6a2d]/25 bg-gradient-to-br from-[#fbf9f4] via-white to-[#f7f3ea]">
        <SectionLabel title="⑤ メラトニンヨガ™提案" eyebrow="MELATONIN YOGA" />
        <p className="mb-4 text-[13px] leading-6 text-slate-500 sm:text-[14px]">
          本日の睡眠状態に合わせ、Phase1 / Phase2 / Phase3 のどれを実施するとよいかを提案します。
        </p>
        <div className="mb-3 rounded-xl border border-[#8a6a2d]/18 bg-white/90 px-3.5 py-3.5">
          <p
            className="text-[11px] font-semibold tracking-[0.12em]"
            style={{ color: GOLD }}
          >
            推奨Phase
          </p>
          <p
            className="mt-1 text-[15px] font-semibold leading-6 sm:text-[16px]"
            style={{ color: NAVY }}
          >
            {model.melatoninYoga.phase}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-slate-600 sm:text-[14px] sm:leading-7">
            <span className="font-semibold text-slate-700">推奨理由：</span>
            {model.melatoninYoga.phaseReason}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {(
            [
              ["呼吸", model.melatoninYoga.breathing],
              ["ヨガ", model.melatoninYoga.yogaMinutes],
              ["瞑想", model.melatoninYoga.meditationMinutes],
              ["合計時間", model.melatoninYoga.totalMinutes],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-[#8a6a2d]/18 bg-white/90 px-3.5 py-3"
            >
              <p
                className="text-[11px] font-semibold tracking-[0.12em]"
                style={{ color: GOLD }}
              >
                {label}
              </p>
              <p
                className="mt-1 text-[14px] font-medium leading-6 sm:text-[15px]"
                style={{ color: NAVY }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </ReportCard>

      {/* 今日のアクション */}
      <ReportCard>
        <SectionLabel title="今日のアクション" eyebrow="TODAY" />
        <p className="mb-3 text-[13px] leading-6 text-slate-500 sm:text-[14px]">
          今日から実行できる行動です（最大3件）。
        </p>
        <ul className="mt-1 space-y-2.5">
          {model.todaysActions.map((action, index) => (
            <li
              key={`${action}-${index}`}
              className="flex gap-3 rounded-xl border border-[#071426]/08 bg-[#fafaf8] px-3.5 py-3.5"
            >
              <span
                className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{ background: NAVY }}
              >
                {index + 1}
              </span>
              <span
                className="text-[14px] font-medium leading-6 sm:text-[15px]"
                style={{ color: NAVY }}
              >
                {action}
              </span>
            </li>
          ))}
        </ul>
      </ReportCard>

      {/* ⑥ 生活習慣評価 */}
      <ReportCard>
        <SectionLabel title="⑥ 生活習慣評価" eyebrow="LIFESTYLE" />
        <ul className="mt-1 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {model.lifestyleStars.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#071426]/08 bg-[#fafaf8] px-3.5 py-3"
            >
              <span
                className="text-[14px] font-semibold sm:text-[15px]"
                style={{ color: NAVY }}
              >
                {row.label}
              </span>
              <span
                className="text-[15px] tracking-[0.1em] sm:text-[16px]"
                style={{ color: GOLD }}
                aria-label={`${row.label} ${row.stars}つ星`}
              >
                {formatStars(row.stars)}
              </span>
            </li>
          ))}
        </ul>
      </ReportCard>

      {/* ⑦ 認定講師コメント */}
      {includeInstructorComment ? (
        <InstructorCommentEditor result={result} numbered />
      ) : null}
    </div>
  );
}
