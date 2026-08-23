/**
 * Sleep Wellness Institute Japan
 * 睡眠ウェルネス・カウンセリングレポート（A4縦・3ページ）
 * 分析画面は変更しない。取得できた指標だけを掲載する。
 */

"use client";

import Image from "next/image";
import type { AnalysisResult } from "@/lib/analysis-session";
import {
  WELLNESS_CATEGORY_LABELS,
  type WellnessCategoryKey,
} from "@/lib/analysis-session";
import { buildCounselingReportContent } from "@/lib/counseling-report";
import type { CounselingKeyMetric } from "@/lib/counseling-report";
import type { LifestyleSnapshot } from "@/lib/wellness-client-report";
import type { RecoveryIndexResult } from "@/lib/recovery-index";
import { formatOuraDeviceLabel } from "@/lib/device-adapters/oura";
import { ouraLifestyleForPdf } from "@/lib/oura-analysis-input";
import {
  getExpertAnalysis,
  getPrescription,
  toPracticeMetrics,
  type PrescriptionCard,
} from "@/lib/data/practice";
import { isReportSectionVisible } from "@/lib/report-sections";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const GOLD_SOFT = "#fbf9f4";
const SURFACE = "#fafaf8";

const CATEGORY_ORDER: WellnessCategoryKey[] = [
  "body",
  "mind",
  "lifestyle",
  "environment",
];

function SectionEyebrow({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-1.5 border-b border-[#071426]/10 pb-1">
      <p
        className="text-[9px] font-semibold tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        {eyebrow}
      </p>
      <h2
        className="mt-0.5 text-[13px] font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        {title}
      </h2>
    </div>
  );
}

function actionPlanLead(count: number): string {
  if (count >= 3) return "まず取り組みたい3つ";
  if (count === 2) return "まず取り組みたい2つ";
  return "まず取り組みたいこと";
}

function BrandFooter() {
  return (
    <footer className="mt-auto border-t border-[#071426]/10 pt-2 text-center">
      <p
        className="text-[10px] font-semibold tracking-[0.04em]"
        style={{ color: NAVY }}
      >
        Sleep Wellness Institute Japan
      </p>
      <p className="mt-0.5 text-[10px] leading-4" style={{ color: GOLD }}>
        睡眠を、人生の土台へ。
      </p>
      <p className="text-[8px] tracking-[0.08em] text-slate-400">
        Sleep as the Foundation of Life.
      </p>
    </footer>
  );
}

function metricGridClass(count: number): string {
  if (count === 6 || count <= 3) return "grid-cols-3";
  return "grid-cols-4";
}

function clampPdfComment(text: string, maxSentences = 2): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const parts = trimmed.match(/[^.!?。！？]+[.!?。！？]?/g);
  if (!parts || parts.length <= maxSentences) return trimmed;
  return parts.slice(0, maxSentences).join("").trim();
}

function MetricGuideTile({
  item,
  compact = false,
}: {
  item: CounselingKeyMetric;
  compact?: boolean;
}) {
  return (
    <div
      className={compact ? "rounded-md px-2 py-1.5" : "rounded-lg px-2.5 py-2"}
      style={{ background: SURFACE }}
    >
      <p className="text-[8px] tracking-[0.04em] text-slate-500">{item.label}</p>
      <p
        className={`mt-0.5 font-semibold leading-snug tracking-[-0.02em] ${
          compact ? "text-[12px]" : "text-[13px]"
        }`}
        style={{ color: NAVY }}
      >
        {item.value}
      </p>
      {item.starsLabel || item.evalLabel ? (
        <p className="mt-0.5 text-[8px] leading-3" style={{ color: GOLD }}>
          {item.starsLabel ? (
            <>
              {item.starsLabel}
              {item.evalLabel ? (
                <span className="ml-1 font-medium text-slate-500">
                  {item.evalLabel}
                </span>
              ) : null}
            </>
          ) : item.evalLabel ? (
            <span className="font-medium text-slate-500">{item.evalLabel}</span>
          ) : null}
        </p>
      ) : null}
      {item.guide ? (
        <p className="mt-1 whitespace-pre-line text-[8px] leading-[1.35] text-slate-400">
          一般的な目安
          <br />
          {item.guide}
        </p>
      ) : null}
    </div>
  );
}

function PdfPrescriptionCard({ card }: { card: PrescriptionCard }) {
  return (
    <div
      className="flex min-h-0 flex-col rounded-lg px-2 py-1.5"
      style={{
        background: card.emphasized ? GOLD_SOFT : SURFACE,
        border: card.emphasized
          ? `1px solid ${GOLD}33`
          : "1px solid rgba(7,20,38,0.08)",
      }}
    >
      <p
        className="text-[8px] font-semibold tracking-[0.12em]"
        style={{ color: GOLD }}
      >
        {card.title}
        {card.emphasized ? (
          <span className="ml-1.5">今日からこれ</span>
        ) : null}
      </p>
      <p
        className="mt-0.5 text-[8px] leading-[1.35]"
        style={{ color: "rgba(7,20,38,0.7)" }}
      >
        {card.philosophy}
      </p>
      <ol
        className="mt-1 list-decimal space-y-0.5 pl-3.5 text-[8px] leading-[1.35]"
        style={{ color: "rgba(7,20,38,0.8)" }}
      >
        {card.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="mt-1 flex flex-wrap gap-0.5">
        {card.dosageBadges.map((badge) => (
          <span
            key={badge}
            className="rounded-full px-1.5 py-px text-[8px] leading-[1.3]"
            style={{
              border: `1px solid ${GOLD}40`,
              color: "rgba(7,20,38,0.7)",
            }}
          >
            {badge}
          </span>
        ))}
      </div>
      <div className="mt-1">
        <p
          className="text-[8px] font-semibold tracking-[0.1em]"
          style={{ color: GOLD }}
        >
          注意
        </p>
        <ul
          className="mt-0.5 list-disc space-y-px pl-3.5 text-[8px] leading-[1.35]"
          style={{ color: "rgba(7,20,38,0.7)" }}
        >
          {card.cautions.map((caution) => (
            <li key={caution}>{caution}</li>
          ))}
        </ul>
      </div>
      {card.sourceNote ? (
        <p className="mt-1 text-[7px] leading-[1.35] text-slate-400">
          出典：{card.sourceNote}
        </p>
      ) : null}
    </div>
  );
}

export function ClientDiagnosticPdf({
  result,
  lifestyle,
  deviceName,
  recovery,
  preview = false,
}: {
  result: AnalysisResult;
  lifestyle?: LifestyleSnapshot | null;
  deviceName?: string;
  recovery: RecoveryIndexResult;
  preview?: boolean;
}) {
  const resolvedDeviceName =
    deviceName?.trim() ||
    (result.inputSource === "oura"
      ? formatOuraDeviceLabel()
      : result.inputSource === "manual"
        ? "手入力"
        : "SOXAI Ring");
  const pdfLifestyle = ouraLifestyleForPdf(result.inputSource, lifestyle);
  const report = buildCounselingReportContent(result, pdfLifestyle);
  const practiceMetrics = toPracticeMetrics(result.metrics);
  const practicePrescription = getPrescription(practiceMetrics);
  const score = Math.max(0, Math.min(100, Math.round(result.score)));
  const scoreComment = clampPdfComment(result.scoreComment);
  const expertParagraphs = getExpertAnalysis(
    practiceMetrics,
    report.priorityImprovements,
  );
  const pdfPageCount = isReportSectionVisible("melatoninYoga") ? 3 : 2;

  return (
    <div
      id={preview ? "client-diagnostic-pdf-preview" : "client-diagnostic-pdf"}
      className={
        preview
          ? "client-diagnostic-pdf client-diagnostic-pdf-preview"
          : "client-diagnostic-pdf"
      }
      aria-hidden={preview ? undefined : "true"}
    >
      <section className="client-diagnostic-page client-diagnostic-page-front flex flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-[#071426]/12 pb-3">
          <div className="min-w-0">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={220}
              height={55}
              className="h-auto w-[136px] object-contain"
            />
            <p
              className="mt-2 text-[9px] font-semibold tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              SLEEP WELLNESS COUNSELING REPORT
            </p>
            <h1
              className="mt-1 text-[16px] font-semibold leading-snug tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              あなたの睡眠の現在地
            </h1>
          </div>
          <div className="shrink-0 pt-1 text-right text-[10px] leading-5 text-slate-600">
            <p className="font-semibold" style={{ color: NAVY }}>
              {result.clientName?.trim() || "クライアント"}
            </p>
            <p>{result.measurementDate || "分析日未設定"}</p>
            <p>デバイス：{resolvedDeviceName}</p>
            <p className="mt-1 text-[9px] text-slate-400">1 / {pdfPageCount}</p>
          </div>
        </header>

        <section className="mt-3">
          <SectionEyebrow
            eyebrow="① TODAY'S SLEEP WELLNESS"
            title="今回の総合評価"
          />
          <div
            className={`grid gap-2 ${
              isReportSectionVisible("recoveryIndex") && recovery.available
                ? "grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            <div
              className="rounded-lg px-3 py-2.5"
              style={{ background: SURFACE, border: `1px solid ${NAVY}14` }}
            >
              <p
                className="text-[9px] font-semibold tracking-[0.16em]"
                style={{ color: GOLD }}
              >
                SLEEP WELLNESS SCORE
              </p>
              <div className="mt-1 flex items-end gap-2">
                <p
                  className="text-[34px] font-semibold leading-none tracking-[-0.06em]"
                  style={{ color: NAVY }}
                >
                  {score}
                </p>
                <p className="pb-1 text-[11px] text-slate-400">/ 100</p>
              </div>
              <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                生活・環境・測定を総合した独自指標
              </p>
            </div>
            {isReportSectionVisible("recoveryIndex") && recovery.available ? (
              <div
                className="rounded-lg px-3 py-2.5"
                style={{
                  background: recovery.accentSoft,
                  border: `1px solid ${recovery.accent}33`,
                }}
              >
                <p
                  className="text-[9px] font-semibold tracking-[0.16em]"
                  style={{ color: GOLD }}
                >
                  RECOVERY INDEX
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <p
                    className="text-[34px] font-semibold leading-none tracking-[-0.06em]"
                    style={{ color: recovery.accent }}
                  >
                    {recovery.score}
                  </p>
                  <p className="pb-1 text-[11px] text-slate-400">/ 100</p>
                </div>
                <p
                  className="mt-1.5 text-[11px] font-semibold"
                  style={{ color: recovery.accent }}
                >
                  {recovery.label}
                </p>
              </div>
            ) : null}
          </div>
          {report.overallComment ? (
            <p
              className="mt-2 text-[11px] leading-[1.6]"
              style={{ color: "rgba(7,20,38,0.82)" }}
            >
              {report.overallComment}
            </p>
          ) : null}
        </section>

        {report.keyMetrics.length > 0 ? (
          <section className="mt-3">
            <SectionEyebrow eyebrow="② KEY DATA" title="重要な睡眠指標" />
            <div className={`grid gap-1.5 ${metricGridClass(report.keyMetrics.length)}`}>
              {report.keyMetrics.map((item) => (
                <MetricGuideTile key={item.label} item={item} />
              ))}
            </div>
          </section>
        ) : null}

        {report.stages.length > 0 || report.stagesUnavailableMessage ? (
          <section className="mt-3">
            <SectionEyebrow eyebrow="③ SLEEP BALANCE" title="睡眠バランス" />
            {report.stagesUnavailableMessage ? (
              <p className="mt-1 text-[11px] leading-5" style={{ color: NAVY }}>
                {report.stagesUnavailableMessage}
              </p>
            ) : (
              <>
                <div
                  className="flex h-4 overflow-hidden rounded-full"
                  style={{ background: "rgba(7,20,38,0.06)" }}
                >
                  {report.stages.map((stage) => (
                    <div
                      key={stage.id}
                      style={{
                        width: `${Math.max(stage.percent, 4)}%`,
                        backgroundColor: stage.color,
                      }}
                      title={`${stage.label} ${stage.valueText}`}
                    />
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                  {report.stages.map((stage) => (
                    <div key={stage.id} className="flex items-baseline justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[10px]" style={{ color: NAVY }}>
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                          aria-hidden
                        />
                        {stage.label}
                      </p>
                      <p className="text-[10px] font-semibold" style={{ color: NAVY }}>
                        {stage.valueText}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        ) : null}

        {isReportSectionVisible("insight") &&
        (report.goodPoints.length > 0 || report.attentionPoints.length > 0) ? (
          <section className="mt-3">
            <SectionEyebrow
              eyebrow="④ GOOD / ATTENTION"
              title="今回の良かった点・気になる点"
            />
            <div
              className={`grid gap-3 ${
                report.goodPoints.length > 0 && report.attentionPoints.length > 0
                  ? "grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {report.goodPoints.length > 0 ? (
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: GOLD_SOFT, border: `1px solid ${GOLD}33` }}
              >
                <p
                  className="text-[9px] font-semibold tracking-[0.14em]"
                  style={{ color: GOLD }}
                >
                  GOOD POINTS
                </p>
                <p className="mt-0.5 text-[11px] font-semibold" style={{ color: NAVY }}>
                  今回良かったところ
                </p>
                <ol className="mt-1.5 space-y-1">
                  {report.goodPoints.map((point, index) => (
                    <li
                      key={`good-${index}`}
                      className="flex gap-2 text-[10px] leading-[1.45]"
                      style={{ color: "rgba(7,20,38,0.8)" }}
                    >
                      <span className="font-semibold" style={{ color: GOLD }}>
                        {index + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ol>
              </div>
              ) : null}
              {report.attentionPoints.length > 0 ? (
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: SURFACE, border: "1px solid rgba(7,20,38,0.08)" }}
              >
                <p
                  className="text-[9px] font-semibold tracking-[0.14em]"
                  style={{ color: GOLD }}
                >
                  ATTENTION
                </p>
                <p className="mt-0.5 text-[11px] font-semibold" style={{ color: NAVY }}>
                  今回注目したいところ
                </p>
                <ol className="mt-1.5 space-y-1">
                  {report.attentionPoints.map((point, index) => (
                    <li
                      key={`attn-${index}`}
                      className="flex gap-2 text-[10px] leading-[1.45]"
                      style={{ color: "rgba(7,20,38,0.8)" }}
                    >
                      <span className="font-semibold" style={{ color: NAVY }}>
                        {index + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ol>
              </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <BrandFooter />
      </section>

      <section className="client-diagnostic-page client-diagnostic-page-back flex flex-col">
        <header className="flex items-end justify-between border-b border-[#071426]/12 pb-3">
          <div>
            <p
              className="text-[9px] font-semibold tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              COUNSELING
            </p>
            <h1
              className="mt-1 text-[16px] font-semibold tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              分析から分かったこと・これからの改善
            </h1>
          </div>
          <p className="text-[9px] text-slate-400">2 / {pdfPageCount}</p>
        </header>

        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        <section>
          <SectionEyebrow
            eyebrow="WELLNESS SCORE"
            title="Sleep Wellness Score（4領域）"
          />
          {scoreComment ? (
            <p
              className="mb-1.5 text-[9px] leading-[1.45]"
              style={{ color: "rgba(7,20,38,0.78)" }}
            >
              {scoreComment}
            </p>
          ) : null}
          <ul className="grid grid-cols-4 gap-1.5">
            {CATEGORY_ORDER.map((key) => (
              <li
                key={key}
                className="rounded-lg px-2 py-1.5"
                style={{ background: SURFACE }}
              >
                <p className="text-[8px] tracking-[0.04em] text-slate-500">
                  {WELLNESS_CATEGORY_LABELS[key]}
                </p>
                <p
                  className="mt-0.5 text-[13px] font-semibold leading-none tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {result.categoryScores[key]}
                  <span className="ml-0.5 text-[8px] font-medium text-slate-400">
                    /100
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        {report.analysisGuideMetrics.length > 0 ? (
          <section className="mt-3">
            <SectionEyebrow eyebrow="KEY DATA" title="一般的な指標" />
            <div
              className={`grid gap-1.5 ${metricGridClass(report.analysisGuideMetrics.length)}`}
            >
              {report.analysisGuideMetrics.map((item) => (
                <MetricGuideTile key={item.label} item={item} compact />
              ))}
            </div>
          </section>
        ) : null}

        {expertParagraphs.length >= 2 ? (
          <section className="mt-3">
            <SectionEyebrow
              eyebrow="⑤ EXPERT ANALYSIS"
              title="睡眠ウェルネス分析"
            />
            <div className="space-y-1.5">
              {expertParagraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-[10px] leading-[1.55]"
                  style={{ color: "rgba(7,20,38,0.78)" }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {report.lifestyleConnection ? (
          <section className="mt-3">
            <SectionEyebrow eyebrow="⑥ LIFESTYLE" title="生活とのつながり" />
            <p
              className="text-[11px] leading-[1.7]"
              style={{ color: "rgba(7,20,38,0.8)" }}
            >
              {report.lifestyleConnection}
            </p>
          </section>
        ) : null}
        </div>

        {isReportSectionVisible("homework") && report.actions.length > 0 ? (
          <section className="mt-3 shrink-0">
            <SectionEyebrow
              eyebrow="⑦ YOUR ACTION PLAN"
              title="あなたへの改善提案"
            />
            <p className="mb-1.5 text-[10px] text-slate-500">
              {actionPlanLead(report.actions.length)}
            </p>
            <div className="space-y-1.5">
              {report.actions.map((item) => (
                <div
                  key={item.rank}
                  className="flex gap-3 rounded-lg px-3 py-1.5"
                  style={{ background: SURFACE }}
                >
                  <p
                    className="text-[16px] font-semibold leading-none"
                    style={{ color: GOLD }}
                  >
                    {item.rank}
                  </p>
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-semibold leading-snug"
                      style={{ color: NAVY }}
                    >
                      {item.what}
                    </p>
                    <p
                      className="mt-0.5 text-[9px] leading-[1.5] text-slate-600"
                    >
                      {item.why}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {isReportSectionVisible("next") && report.nextSteps.length > 0 ? (
          <section className="mt-3 shrink-0">
            <SectionEyebrow
              eyebrow="⑧ NEXT STEP"
              title="次回までのポイント"
            />
            <p className="mb-1.5 text-[10px] text-slate-500">
              次回までに意識すること
            </p>
            <ul className="space-y-1">
              {report.nextSteps.map((step, index) => (
                <li
                  key={`${step}-${index}`}
                  className="flex gap-2 text-[10px] leading-[1.5]"
                  style={{ color: "rgba(7,20,38,0.8)" }}
                >
                  <span style={{ color: GOLD }}>・</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <BrandFooter />
      </section>

      {isReportSectionVisible("melatoninYoga") ? (
      <section className="client-diagnostic-page client-diagnostic-page-prescription flex flex-col">
        <header className="flex items-end justify-between border-b border-[#071426]/12 pb-3">
          <div>
            <p
              className="text-[9px] font-semibold tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              PRACTICE
            </p>
            <h1
              className="mt-1 text-[16px] font-semibold tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              今夜からの実践
            </h1>
          </div>
          <p className="text-[9px] text-slate-400">3 / {pdfPageCount}</p>
        </header>

        <section className="mt-3 flex min-h-0 flex-1 flex-col">
          <SectionEyebrow
            eyebrow="MELATONIN YOGA"
            title="メラトニンヨガ™処方"
          />
          <div className="mt-1.5 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5">
            {practicePrescription.cards.map((card) => (
              <PdfPrescriptionCard key={card.id} card={card} />
            ))}
          </div>
          <p className="mt-2 text-[8px] leading-[1.4] text-slate-400">
            睡眠の状態が続けて気になる場合は、医療機関にご相談ください。本ページは医療的な診断・治療ではなく、生活上の実践の提案です。
          </p>
        </section>

        <BrandFooter />
      </section>
      ) : null}
    </div>
  );
}
