"use client";

import Link from "next/link";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SUCCESS, TEAL } from "@/components/ui/tokens";
import {
  HEALTH_STATUS_LABELS,
  ROADMAP_HORIZON_LABELS,
  ROADMAP_STATUS_LABELS,
  type ClosedBetaOpsBundle,
  type HealthStatus,
  type RoadmapHorizon,
} from "@/lib/closed-beta";

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#071426]/08 bg-[#fafaf8] px-4 py-4 sm:px-5">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p
        className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] tabular-nums"
        style={{ color: NAVY }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

function healthColor(status: HealthStatus): string {
  switch (status) {
    case "operational":
      return SUCCESS;
    case "degraded":
      return GOLD;
    case "maintenance":
      return TEAL;
    default:
      return "#a33a3a";
  }
}

function formatPct(value: number): string {
  return `${value}%`;
}

const HORIZON_ORDER: RoadmapHorizon[] = ["v2_5", "v3_0", "coming_soon"];

export default function ClosedBetaOpsDashboard({
  data,
}: {
  data: ClosedBetaOpsBundle;
}) {
  const { metrics, health, releaseNotes, usage, roadmap } = data;

  return (
    <div className="space-y-8 sm:space-y-10">
      <SectionCard
        id="beta-dashboard"
        eyebrow="MODULE 6 · BETA METRICS"
        title="Closed Beta 週次指標"
      >
        <p className="mb-5 text-[13px] text-slate-500">
          {metrics.periodLabel} · 最終更新{" "}
          {new Date(metrics.updatedAt).toLocaleString("ja-JP")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricTile
            label="利用講師数"
            value={String(metrics.certifiedInstructorCount)}
          />
          <MetricTile
            label="分析件数"
            value={String(metrics.analysisCount)}
          />
          <MetricTile
            label="クライアント数"
            value={String(metrics.registeredClientCount)}
            hint="今週の新規"
          />
          <MetricTile
            label="継続率"
            value={formatPct(metrics.journeyContinuationRate)}
          />
          <MetricTile
            label="改善率"
            value={formatPct(metrics.improvementRate)}
          />
          <MetricTile
            label="バグ件数"
            value={String(metrics.bugCount)}
            hint={`フィードバック計 ${metrics.feedbackCount}`}
          />
        </div>
        <div className="mt-5">
          <Link
            href="/admin/feedback"
            className="text-[13px] font-semibold"
            style={{ color: TEAL }}
          >
            フィードバック管理を開く →
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        id="beta-invitation"
        eyebrow="MODULE 1 · BETA INVITATION"
        title="認定講師招待"
      >
        <p className="text-[14px] leading-7 text-slate-600">
          メール送信（モック）・招待コード・利用開始日・利用規約同意で、認定講師を Closed Beta に招待します。
        </p>
        <div className="mt-5">
          <Link
            href="/admin/invitations"
            className="inline-flex min-h-11 items-center rounded-full px-5 text-[13px] font-semibold text-white"
            style={{ backgroundColor: NAVY }}
          >
            招待管理を開く
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        id="beta-feedback"
        eyebrow="MODULE 4–5 · FEEDBACK"
        title="フィードバック運営"
      >
        <p className="text-[14px] leading-7 text-slate-600">
          優先度は Critical / High / Medium / Low。本部は受付・対応中・保留・完了を設定できます。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin/feedback"
            className="inline-flex min-h-11 items-center rounded-full px-5 text-[13px] font-semibold text-white"
            style={{ backgroundColor: NAVY }}
          >
            一覧・対応管理
          </Link>
          <Link
            href="/feedback"
            className="inline-flex min-h-11 items-center rounded-full border border-[#071426]/12 px-5 text-[13px] font-semibold"
            style={{ color: NAVY }}
          >
            講師向け送信画面を確認
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        id="health-score"
        eyebrow="MODULE 3 · HEALTH SCORE"
        title="システム状態"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p
              className="text-[12px] font-semibold tracking-[0.16em]"
              style={{ color: healthColor(health.overall) }}
            >
              {HEALTH_STATUS_LABELS[health.overall].toUpperCase()}
            </p>
            <p
              className="mt-1 text-[1.15rem] font-semibold tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              {health.overallLabel}
            </p>
          </div>
          <p className="text-[13px] text-slate-500">
            利用率 {formatPct(health.utilizationPercent)}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {health.components.map((component) => (
            <div
              key={component.id}
              className="rounded-2xl border border-[#071426]/08 bg-white px-4 py-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="text-[14px] font-semibold"
                  style={{ color: NAVY }}
                >
                  {component.label}
                </p>
                <span
                  className="text-[11px] font-semibold tracking-[0.08em]"
                  style={{ color: healthColor(component.status) }}
                >
                  {HEALTH_STATUS_LABELS[component.status]}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-6 text-slate-500">
                {component.detail}
              </p>
              {component.latencyMs != null ? (
                <p className="mt-2 text-[12px] tabular-nums text-slate-400">
                  {component.latencyMs} ms
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="release-notes"
        eyebrow="MODULE 4 · RELEASE NOTES"
        title="アップデート履歴"
      >
        <ul className="space-y-5">
          {releaseNotes.map((note) => (
            <li
              key={note.id}
              className="border-b border-slate-100 pb-5 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p
                  className="text-[15px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  Version {note.version}
                </p>
                <p className="text-[12px] text-slate-400">{note.releasedAt}</p>
                {note.isCurrent ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em]"
                    style={{
                      backgroundColor: "rgba(138,106,45,0.12)",
                      color: GOLD,
                    }}
                  >
                    CURRENT
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[14px] font-medium text-slate-700">
                {note.title}
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p
                    className="text-[11px] font-semibold tracking-[0.14em]"
                    style={{ color: GOLD }}
                  >
                    変更内容
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-slate-600">
                    {note.changes.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p
                    className="text-[11px] font-semibold tracking-[0.14em]"
                    style={{ color: GOLD }}
                  >
                    改善内容
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-slate-600">
                    {note.improvements.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        id="usage-analytics"
        eyebrow="MODULE 5 · USAGE ANALYTICS"
        title="利用状況"
      >
        <p className="mb-5 text-[13px] text-slate-500">
          {usage.periodLabel}
          {usage.isMock ? " · モックデータ" : ""}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="平均利用時間"
            value={`${usage.averageSessionMinutes} 分`}
          />
          <MetricTile
            label="スマホ比率"
            value={formatPct(usage.mobileSharePercent)}
          />
          <MetricTile
            label="PC比率"
            value={formatPct(usage.pcSharePercent)}
          />
          <MetricTile
            label="タブレット比率"
            value={formatPct(usage.tabletSharePercent)}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p
              className="text-[12px] font-semibold tracking-[0.14em]"
              style={{ color: GOLD }}
            >
              最も使われている画面
            </p>
            <ul className="mt-3 space-y-2.5">
              {usage.topScreens.map((screen) => (
                <li
                  key={screen.screen}
                  className="flex items-center justify-between gap-3 text-[13px]"
                >
                  <span className="font-medium" style={{ color: NAVY }}>
                    {screen.label}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {screen.sessions.toLocaleString("ja-JP")} ·{" "}
                    {formatPct(screen.sharePercent)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p
              className="text-[12px] font-semibold tracking-[0.14em]"
              style={{ color: GOLD }}
            >
              離脱ポイント
            </p>
            <ul className="mt-3 space-y-2.5">
              {usage.dropOffPoints.map((point) => (
                <li
                  key={point.screen}
                  className="flex items-center justify-between gap-3 text-[13px]"
                >
                  <span className="font-medium" style={{ color: NAVY }}>
                    {point.label}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {formatPct(point.dropOffPercent)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="roadmap"
        eyebrow="MODULE 6 · ROADMAP"
        title="今後の予定"
      >
        <div className="space-y-8">
          {HORIZON_ORDER.map((horizon) => {
            const items = roadmap.filter((item) => item.horizon === horizon);
            if (items.length === 0) return null;
            return (
              <div key={horizon}>
                <p
                  className="text-[12px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  {ROADMAP_HORIZON_LABELS[horizon]}
                </p>
                <ul className="mt-3 space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-[#071426]/08 bg-[#fafaf8] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className="text-[15px] font-semibold"
                          style={{ color: NAVY }}
                        >
                          {item.title}
                        </p>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {ROADMAP_STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-[13px] leading-6 text-slate-600">
                        {item.summary}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

export function ClosedBetaOpsDashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 rounded-[28px]" />
      <Skeleton className="h-32 rounded-[28px]" />
      <Skeleton className="h-56 rounded-[28px]" />
      <Skeleton className="h-64 rounded-[28px]" />
    </div>
  );
}
