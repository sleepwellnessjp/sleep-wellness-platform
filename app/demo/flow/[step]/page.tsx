"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import DemoFlowNav from "@/components/demo/DemoFlowNav";
import DemoFlowControls from "@/components/demo/DemoFlowControls";
import DemoShell from "@/components/demo/DemoShell";
import {
  BORDER,
  CARD_SHADOW,
  GOLD,
  MUTED,
  NAVY,
  SUCCESS,
  TEAL,
} from "@/components/ui/tokens";
import { enableDemoSession, setDemoFlowStep } from "@/lib/auth/demo-session";
import {
  getDemoFlowStep,
  type DemoFlowStepId,
} from "@/lib/demo-mode/flow";
import { getDemoDashboardSnapshot } from "@/lib/demo-mode/sample-data";

const STEP_IDS: DemoFlowStepId[] = [
  "collect",
  "analysis",
  "ai",
  "homework",
  "journey",
  "followup",
  "report",
];

function isStepId(value: string): value is DemoFlowStepId {
  return STEP_IDS.includes(value as DemoFlowStepId);
}

function StepContent({ stepId }: { stepId: DemoFlowStepId }) {
  const data = getDemoDashboardSnapshot();
  const featured = data.featuredClient;

  switch (stepId) {
    case "collect":
      return (
        <div className="space-y-4">
          <div
            className="rounded-3xl border bg-white p-5 sm:p-6"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            <p className="text-[11px] font-medium tracking-[0.12em]" style={{ color: MUTED }}>
              対象クライアント
            </p>
            <p className="mt-2 text-lg font-semibold" style={{ color: NAVY }}>
              {featured.name}
            </p>
            <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
              SOXAI / 測定シートから睡眠データを取り込みます。
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "睡眠スコア", value: String(data.sampleSleepMetrics.sleepScore) },
              { label: "総睡眠時間", value: data.sampleSleepMetrics.sleepDuration },
              { label: "睡眠効率", value: data.sampleSleepMetrics.sleepEfficiency },
              { label: "深睡眠割合", value: data.sampleSleepMetrics.deepSleepRate },
              { label: "HRV", value: data.sampleSleepMetrics.hrv },
              { label: "ストレス", value: data.sampleSleepMetrics.stress },
            ].map((item) => (
              <li
                key={item.label}
                className="rounded-2xl border bg-white px-4 py-4"
                style={{ borderColor: BORDER }}
              >
                <p className="text-[11px]" style={{ color: MUTED }}>
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums" style={{ color: NAVY }}>
                  {item.value}
                </p>
              </li>
            ))}
          </ul>
        </div>
      );

    case "analysis":
      return (
        <div
          className="rounded-3xl border bg-white p-5 sm:p-7"
          style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
        >
          <p className="text-[11px] font-medium tracking-[0.12em]" style={{ color: GOLD }}>
            SLEEP ANALYSIS
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]" style={{ color: NAVY }}>
            {featured.name}さんの睡眠分析
          </h3>
          <p className="mt-4 text-[14px] leading-7" style={{ color: NAVY }}>
            深い睡眠と効率が安定し、回復の質が良い夜でした。入眠前の切り替えが睡眠の連続性に影響している可能性があるため、生活リズムとあわせて確認します。
          </p>
          <div className="mt-6 flex items-end gap-6">
            <div>
              <p className="text-[11px]" style={{ color: MUTED }}>
                睡眠スコア
              </p>
              <p className="text-4xl font-semibold tabular-nums" style={{ color: TEAL }}>
                {featured.sleepScore}
              </p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: MUTED }}>
                Journey 進捗
              </p>
              <p className="text-2xl font-semibold tabular-nums" style={{ color: NAVY }}>
                {featured.journeyProgress}%
              </p>
            </div>
          </div>
        </div>
      );

    case "ai":
      return (
        <div className="space-y-3">
          {data.sampleAiSuggestions.map((item) => (
            <div
              key={item.text}
              className="rounded-2xl border bg-white px-4 py-4 sm:px-5"
              style={{ borderColor: BORDER }}
            >
              <p className="text-[11px] font-semibold tracking-[0.1em]" style={{ color: GOLD }}>
                {"★".repeat(item.stars)}
              </p>
              <p className="mt-2 text-[14px] leading-6" style={{ color: NAVY }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      );

    case "homework":
      return (
        <ul className="space-y-3">
          {data.sampleHomeworks.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border bg-white px-4 py-4 sm:px-5"
              style={{ borderColor: BORDER }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[14px] font-semibold" style={{ color: NAVY }}>
                  {item.title}
                </p>
                <span
                  className="shrink-0 text-[12px] font-medium"
                  style={{
                    color: item.status === "完了" ? SUCCESS : TEAL,
                  }}
                >
                  {item.status}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${item.progressRate}%`,
                    backgroundColor: item.status === "完了" ? SUCCESS : TEAL,
                  }}
                />
              </div>
              <p className="mt-2 text-[12px] tabular-nums" style={{ color: MUTED }}>
                達成率 {item.progressRate}%
              </p>
            </li>
          ))}
        </ul>
      );

    case "journey":
      return (
        <ol className="space-y-3">
          {data.sampleJourney.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-4 rounded-2xl border bg-white px-4 py-4"
              style={{
                borderColor:
                  item.status === "current" ? TEAL : BORDER,
              }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{
                  backgroundColor:
                    item.status === "upcoming"
                      ? "#94a3b8"
                      : item.status === "current"
                        ? TEAL
                        : NAVY,
                }}
              >
                {item.status === "completed" ? "✓" : item.status === "current" ? "●" : "·"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold" style={{ color: NAVY }}>
                  {item.label}
                </p>
                <p className="text-[12px]" style={{ color: MUTED }}>
                  {item.status === "completed"
                    ? "完了"
                    : item.status === "current"
                      ? "現在地"
                      : "これから"}
                </p>
              </div>
              <p className="text-lg font-semibold tabular-nums" style={{ color: NAVY }}>
                {item.sleepScore ?? "—"}
              </p>
            </li>
          ))}
        </ol>
      );

    case "followup":
      return (
        <ul className="space-y-3">
          {data.sampleFollowUps.map((item) => (
            <li
              key={item.conductedAt}
              className="rounded-2xl border bg-white px-4 py-4 sm:px-5"
              style={{ borderColor: BORDER }}
            >
              <div className="flex flex-wrap items-center gap-2 text-[12px]" style={{ color: MUTED }}>
                <span>{item.conductedAt}</span>
                <span>·</span>
                <span>{item.method}</span>
              </div>
              <p className="mt-2 text-[14px] leading-6" style={{ color: NAVY }}>
                {item.finding}
              </p>
            </li>
          ))}
          <li
            className="rounded-2xl border border-dashed px-4 py-5 text-center sm:px-5"
            style={{ borderColor: BORDER }}
          >
            <p className="text-[13px]" style={{ color: MUTED }}>
              次回フォロー予定: {featured.nextFollowUpDate ?? "未設定"}
            </p>
          </li>
        </ul>
      );

    case "report":
      return (
        <div className="space-y-4">
          <div
            className="rounded-3xl border bg-white p-5 sm:p-7"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            <p className="text-[11px] font-medium tracking-[0.12em]" style={{ color: GOLD }}>
              IMPROVEMENT REPORT
            </p>
            <h3 className="mt-2 text-xl font-semibold" style={{ color: NAVY }}>
              {featured.name}さんの改善レポート
            </h3>
            <p className="mt-4 text-[14px] leading-7" style={{ color: NAVY }}>
              初回スコア 58 → 現在 {featured.sleepScore}。就寝ルーティンの定着と入浴タイミングの調整により、睡眠効率と深睡眠が改善しています。
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: "初回", value: "58" },
                { label: "現在", value: String(featured.sleepScore ?? 72) },
                { label: "変化", value: "+14" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-[#f4f7f7] px-3 py-3 text-center"
                >
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums" style={{ color: NAVY }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <ul className="space-y-2">
            {data.sampleReports.map((report) => (
              <li
                key={report.clientName}
                className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3"
                style={{ borderColor: BORDER }}
              >
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: NAVY }}>
                    {report.clientName}
                  </p>
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    {report.title}
                  </p>
                </div>
                <span className="text-[12px] font-medium" style={{ color: SUCCESS }}>
                  {report.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}

export default function DemoFlowStepPage() {
  const params = useParams();
  const raw = typeof params.step === "string" ? params.step : "";

  useEffect(() => {
    enableDemoSession();
    if (isStepId(raw)) setDemoFlowStep(raw);
  }, [raw]);

  if (!isStepId(raw)) {
    return (
      <DemoShell eyebrow="DEMO FLOW" title="ステップが見つかりません">
        <p className="text-[14px]" style={{ color: MUTED }}>
          デモ体験のステップ URL が正しくありません。
        </p>
        <Link
          href="/demo"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full px-6 text-[14px] font-semibold text-white"
          style={{ backgroundColor: NAVY }}
        >
          デモダッシュボードへ
        </Link>
      </DemoShell>
    );
  }

  const step = getDemoFlowStep(raw);
  if (!step) {
    return null;
  }

  return (
    <DemoShell
      eyebrow={`DEMO FLOW · ${step.index}/7`}
      title={step.title}
      subtitle={step.description}
    >
      <div className="mb-6 overflow-hidden sm:mb-8">
        <DemoFlowNav currentId={step.id} compact />
      </div>

      <StepContent stepId={step.id} />

      <div className="h-24" aria-hidden />
      <DemoFlowControls stepId={step.id} />
    </DemoShell>
  );
}
