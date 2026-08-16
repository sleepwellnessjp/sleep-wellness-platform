/**
 * Sleep Wellness Institute Japan
 * 睡眠ウェルネス・カウンセリングレポート（A4縦・2ページ固定）
 * 分析画面は変更しない。取得できた指標だけを掲載する。
 */

"use client";

import Image from "next/image";
import type { AnalysisResult } from "@/lib/analysis-session";
import { buildCounselingReportContent } from "@/lib/counseling-report";
import type { CounselingKeyMetric } from "@/lib/counseling-report";
import type { LifestyleSnapshot } from "@/lib/wellness-client-report";
import type { RecoveryIndexResult } from "@/lib/recovery-index";
import { formatOuraDeviceLabel } from "@/lib/device-adapters/oura";
import { ouraLifestyleForPdf } from "@/lib/oura-analysis-input";
import { selectOfficialTextPrescription } from "@/lib/prescription-knowledge/select-prescription";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const GOLD_SOFT = "#fbf9f4";
const SURFACE = "#fafaf8";

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
      {item.starsLabel ? (
        <p className="mt-0.5 text-[8px] leading-3" style={{ color: GOLD }}>
          {item.starsLabel}
          {item.evalLabel ? (
            <span className="ml-1 font-medium text-slate-500">{item.evalLabel}</span>
          ) : null}
        </p>
      ) : null}
      {item.guide ? (
        <p className="mt-1 text-[8px] leading-[1.35] text-slate-400">
          一般的な目安
          <br />
          {item.guide}
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
  const officialPrescription = selectOfficialTextPrescription(
    result,
    pdfLifestyle,
  );
  const score = Math.max(0, Math.min(100, Math.round(result.score)));

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
            <p className="mt-1 text-[9px] text-slate-400">1 / 2</p>
          </div>
        </header>

        <section className="mt-3">
          <SectionEyebrow
            eyebrow="① TODAY'S SLEEP WELLNESS"
            title="今回の総合評価"
          />
          <div
            className={`grid gap-2 ${recovery.available ? "grid-cols-2" : "grid-cols-1"}`}
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
            {recovery.available ? (
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
            {report.analysisGuideMetrics.length > 0 ? (
              <div className="mt-2.5">
                <p
                  className="mb-1.5 text-[9px] font-semibold tracking-[0.12em]"
                  style={{ color: GOLD }}
                >
                  一般的な指標
                </p>
                <div
                  className={`grid gap-1.5 ${metricGridClass(report.analysisGuideMetrics.length)}`}
                >
                  {report.analysisGuideMetrics.map((item) => (
                    <MetricGuideTile key={item.label} item={item} compact />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : report.analysisGuideMetrics.length > 0 ? (
          <section className="mt-3">
            <SectionEyebrow eyebrow="② KEY DATA" title="重要な睡眠指標" />
            <div
              className={`grid gap-1.5 ${metricGridClass(report.analysisGuideMetrics.length)}`}
            >
              {report.analysisGuideMetrics.map((item) => (
                <MetricGuideTile key={item.label} item={item} />
              ))}
            </div>
          </section>
        ) : null}

        {report.stages.length > 0 ? (
          <section className="mt-3">
            <SectionEyebrow eyebrow="③ SLEEP BALANCE" title="睡眠バランス" />
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
          </section>
        ) : null}

        {report.goodPoints.length > 0 || report.attentionPoints.length > 0 ? (
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
          <p className="text-[9px] text-slate-400">2 / 2</p>
        </header>

        {report.expertPoints.length > 0 ? (
          <section className="mt-3">
            <SectionEyebrow
              eyebrow="⑤ EXPERT ANALYSIS"
              title="睡眠ウェルネス分析"
            />
            <div className="space-y-1.5">
              {report.expertPoints.map((point) => (
                <div key={point.index} className="flex gap-3">
                  <p
                    className="w-7 shrink-0 text-[10px] font-semibold tracking-[0.08em]"
                    style={{ color: GOLD }}
                  >
                    {point.index}
                  </p>
                  <div className="min-w-0">
                    <p
                      className="text-[12px] font-semibold leading-snug"
                      style={{ color: NAVY }}
                    >
                      {point.title}
                    </p>
                    <p
                      className="mt-0.5 text-[11px] leading-[1.65]"
                      style={{ color: "rgba(7,20,38,0.78)" }}
                    >
                      {point.body}
                    </p>
                  </div>
                </div>
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

        {report.actions.length > 0 ? (
          <section className="mt-3">
            <SectionEyebrow
              eyebrow="⑦ YOUR ACTION PLAN"
              title="あなたへの改善提案"
            />
            <p className="mb-2 text-[10px] text-slate-500">
              まず取り組みたい3つ
            </p>
            <div className="space-y-2">
              {report.actions.map((item) => (
                <div
                  key={item.rank}
                  className="flex gap-3 rounded-lg px-3 py-1.5"
                  style={{ background: SURFACE }}
                >
                  <p
                    className="text-[18px] font-semibold leading-none"
                    style={{ color: GOLD }}
                  >
                    {item.rank}
                  </p>
                  <div className="min-w-0">
                    <p
                      className="text-[12px] font-semibold leading-snug"
                      style={{ color: NAVY }}
                    >
                      {item.what}
                    </p>
                    <p
                      className="mt-0.5 text-[10px] leading-[1.6] text-slate-600"
                    >
                      {item.why}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {report.nextSteps.length > 0 ? (
          <section className="mt-3">
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

        <section className="mt-3">
          <SectionEyebrow
            eyebrow="⑨ MELATONIN YOGA"
            title="メラトニンヨガ™の処方・アドバイス"
          />
          <p className="mb-1.5 text-[9px] leading-4 text-slate-500">
            Sleep Wellness Institute Japan 独自メソッド。本日の睡眠状態に合わせた処方箋です。公式テキスト（メラトニンヨガ™・間のヨガ・『間の書』）に基づきます。
          </p>
          {officialPrescription.safetyAlert ? (
            <div
              className="mb-1.5 rounded-lg px-3 py-2"
              style={{ background: GOLD_SOFT, border: `1px solid ${GOLD}55` }}
            >
              <p
                className="text-[8px] font-semibold tracking-[0.12em]"
                style={{ color: GOLD }}
              >
                安全確認
              </p>
              <p
                className="mt-0.5 text-[9px] leading-[1.45]"
                style={{ color: "rgba(7,20,38,0.8)" }}
              >
                {officialPrescription.safetyAlert.body.replace(
                  /^([^。]+。).*$/u,
                  "$1",
                )}
              </p>
            </div>
          ) : null}
          <div
            className="rounded-lg px-3 py-2"
            style={{ background: GOLD_SOFT, border: `1px solid ${GOLD}33` }}
          >
            <p
              className="text-[8px] font-semibold tracking-[0.12em]"
              style={{ color: GOLD }}
            >
              最終テーマ
            </p>
            <p
              className="mt-0.5 text-[12px] font-semibold leading-snug"
              style={{ color: NAVY }}
            >
              {officialPrescription.finalThemeLabel}
            </p>
            <p
              className="mt-1 text-[9px] leading-[1.45]"
              style={{ color: "rgba(7,20,38,0.75)" }}
            >
              {officialPrescription.themeReason}
            </p>
          </div>
          <div className="mt-1.5 space-y-0.5">
            <div className="flex gap-2 border-b border-[#071426]/08 py-0.5">
              <p
                className="w-[4.2rem] shrink-0 text-[8px] font-semibold"
                style={{ color: GOLD }}
              >
                今日の一本
              </p>
              <p
                className="min-w-0 text-[8px] leading-[1.35]"
                style={{ color: "rgba(7,20,38,0.8)" }}
              >
                {officialPrescription.todaysOne.name}：
                {officialPrescription.todaysOne.action.replace(
                  /^([^。]+。).*$/u,
                  "$1",
                )}
              </p>
            </div>
            {(
              [
                ["呼吸", officialPrescription.breathing],
                ["ヨガ", officialPrescription.yoga],
                ["間", officialPrescription.ma],
                ["入浴", officialPrescription.bathing],
                ["夜", officialPrescription.night],
                ["昼寝", officialPrescription.napNote],
              ] as Array<[string, (typeof officialPrescription)["breathing"]]>
            )
              .flatMap(([label, block]) => (block ? [{ label, block }] : []))
              .map(({ label, block }) => (
                <div key={label} className="flex gap-2 border-b border-[#071426]/08 py-0.5 last:border-b-0">
                  <p
                    className="w-[4.2rem] shrink-0 text-[8px] font-semibold"
                    style={{ color: GOLD }}
                  >
                    {label}
                  </p>
                  <p
                    className="min-w-0 text-[8px] leading-[1.35]"
                    style={{ color: "rgba(7,20,38,0.8)" }}
                  >
                    {block.body.replace(/^([^。]+。).*$/u, "$1")}
                  </p>
                </div>
              ))}
          </div>
        </section>

        <BrandFooter />
      </section>
    </div>
  );
}
