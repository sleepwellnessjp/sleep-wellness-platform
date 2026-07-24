"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SUCCESS, TEAL } from "@/components/ui/tokens";
import {
  BACKLOG_STATUSES,
  BACKLOG_STATUS_LABELS,
  BUG_SEVERITIES,
  BUG_SEVERITY_LABELS,
  BUG_STATUSES,
  BUG_STATUS_LABELS,
  FEATURE_REQUEST_CATEGORIES,
  FEATURE_REQUEST_CATEGORY_LABELS,
  FEATURE_REQUEST_PRIORITIES,
  FEATURE_REQUEST_PRIORITY_LABELS,
  FEATURE_REQUEST_STATUSES,
  FEATURE_REQUEST_STATUS_LABELS,
  type BacklogStatus,
  type BugSeverity,
  type BugStatus,
  type ClosedBetaOperationBundle,
  type FeatureRequestPriority,
  type FeatureRequestStatus,
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

function formatPct(value: number): string {
  return `${value}%`;
}

function severityColor(severity: BugSeverity | FeatureRequestPriority): string {
  switch (severity) {
    case "critical":
      return "#a33a3a";
    case "high":
      return "#b45309";
    case "medium":
      return TEAL;
    default:
      return "#64748b";
  }
}

function KpiBarChart({
  series,
}: {
  series: ClosedBetaOperationBundle["kpi"]["weeklySeries"];
}) {
  const max = Math.max(...series.map((p) => p.analyses), 1);
  const width = 360;
  const height = 140;
  const pad = 16;
  const barGap = 12;
  const barWidth =
    (width - pad * 2 - barGap * (series.length - 1)) / series.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 28}`}
      className="h-auto w-full max-w-md"
      role="img"
      aria-label="週間分析件数の推移"
    >
      {series.map((point, index) => {
        const x = pad + index * (barWidth + barGap);
        const barHeight = Math.max(4, (point.analyses / max) * height);
        const y = height - barHeight;
        return (
          <g key={point.weekLabel}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={6}
              fill={NAVY}
              opacity={0.85 - index * 0.08}
            />
            <text
              x={x + barWidth / 2}
              y={height + 16}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {point.weekLabel}
            </text>
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={NAVY}
            >
              {point.analyses}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function OutcomeBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px]">
        <span className="font-medium" style={{ color: NAVY }}>
          {label}
        </span>
        <span className="tabular-nums text-slate-500">{formatPct(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: TEAL,
          }}
        />
      </div>
    </div>
  );
}

type SelectProps = {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
};

function InlineSelect({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
}: SelectProps) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-9 rounded-full border border-[#071426]/12 bg-white px-3 text-[12px] font-semibold text-slate-700"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default function ClosedBetaOperationDashboard({
  data,
  onRefresh,
}: {
  data: ClosedBetaOperationBundle;
  onRefresh: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const {
    kpi,
    featureRequests,
    bugReports,
    outcomes,
    weeklyReports,
    productBacklog,
    readinessPercent,
  } = data;

  const latestReport = weeklyReports[0] ?? null;

  const patchEntity = (
    body: Record<string, unknown>,
    successLabel: string,
  ) => {
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch("/api/admin/closed-beta-operation", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(json.error ?? "更新に失敗しました");
        setMessage(successLabel);
        await onRefresh();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "更新に失敗しました",
        );
      }
    });
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            className="text-[11px] font-semibold tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            BETA OPERATION READINESS
          </p>
          <p
            className="mt-1 text-[1.65rem] font-semibold tracking-[-0.04em] tabular-nums"
            style={{ color: NAVY }}
          >
            {formatPct(readinessPercent)}
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            Closed Beta 運営準備率（6 モジュール）
          </p>
        </div>
        <Link
          href="/admin/feedback"
          className="text-[13px] font-semibold"
          style={{ color: TEAL }}
        >
          既存フィードバック管理 →
        </Link>
      </div>

      {message ? (
        <p
          className="text-[13px]"
          style={{ color: message.includes("失敗") ? "#a33a3a" : SUCCESS }}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <SectionCard
        id="beta-kpi"
        eyebrow="MODULE 1 · BETA KPI"
        title="Beta KPI Dashboard"
      >
        <p className="mb-5 text-[13px] text-slate-500">
          {kpi.periodLabel} · 最終更新{" "}
          {new Date(kpi.updatedAt).toLocaleString("ja-JP")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="アクティブ認定講師数"
            value={String(kpi.activeCertifiedInstructors)}
          />
          <MetricTile
            label="アクティブクライアント数"
            value={String(kpi.activeClients)}
          />
          <MetricTile
            label="週間分析件数"
            value={String(kpi.weeklyAnalysisCount)}
          />
          <MetricTile
            label="今週の新規登録数"
            value={String(kpi.weeklyNewRegistrations)}
          />
          <MetricTile
            label="平均継続率"
            value={formatPct(kpi.averageContinuationRate)}
          />
          <MetricTile
            label="平均改善率"
            value={formatPct(kpi.averageImprovementRate)}
          />
          <MetricTile
            label="フィードバック対応率"
            value={formatPct(kpi.feedbackResponseRate)}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <p
              className="mb-3 text-[12px] font-semibold tracking-[0.14em]"
              style={{ color: GOLD }}
            >
              週間分析件数
            </p>
            <KpiBarChart series={kpi.weeklySeries} />
          </div>
          <div>
            <p
              className="mb-3 text-[12px] font-semibold tracking-[0.14em]"
              style={{ color: GOLD }}
            >
              週次トレンド
            </p>
            <ul className="space-y-2.5">
              {kpi.weeklySeries.map((point) => (
                <li
                  key={point.weekLabel}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#071426]/08 bg-white px-4 py-3 text-[13px]"
                >
                  <span className="font-semibold" style={{ color: NAVY }}>
                    {point.weekLabel}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    講師 {point.activeInstructors} · 新規{" "}
                    {point.newClients} · 分析 {point.analyses}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="feature-requests"
        eyebrow="MODULE 2 · FEATURE REQUESTS"
        title="機能要望"
      >
        <ul className="space-y-4">
          {featureRequests.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-[#071426]/08 bg-[#fafaf8] px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="text-[15px] font-semibold"
                      style={{ color: NAVY }}
                    >
                      {item.title}
                    </p>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {FEATURE_REQUEST_CATEGORY_LABELS[item.category]}
                    </span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: severityColor(item.priority) }}
                    >
                      {FEATURE_REQUEST_PRIORITY_LABELS[item.priority]}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-slate-600">
                    {item.description}
                  </p>
                  <p className="mt-2 text-[12px] text-slate-400">
                    投票 {item.voteCount} · {item.submittedBy}
                    {item.plannedFor ? ` · 対応予定 ${item.plannedFor}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <InlineSelect
                    ariaLabel={`${item.title} の優先度`}
                    value={item.priority}
                    disabled={pending}
                    options={FEATURE_REQUEST_PRIORITIES.map((value) => ({
                      value,
                      label: FEATURE_REQUEST_PRIORITY_LABELS[value],
                    }))}
                    onChange={(value) =>
                      patchEntity(
                        {
                          entity: "feature_request",
                          id: item.id,
                          priority: value as FeatureRequestPriority,
                        },
                        "要望の優先度を更新しました",
                      )
                    }
                  />
                  <InlineSelect
                    ariaLabel={`${item.title} のステータス`}
                    value={item.status}
                    disabled={pending}
                    options={FEATURE_REQUEST_STATUSES.map((value) => ({
                      value,
                      label: FEATURE_REQUEST_STATUS_LABELS[value],
                    }))}
                    onChange={(value) =>
                      patchEntity(
                        {
                          entity: "feature_request",
                          id: item.id,
                          status: value as FeatureRequestStatus,
                          plannedFor:
                            value === "planned" || value === "in_progress"
                              ? item.plannedFor ?? "Version 2.9"
                              : item.plannedFor,
                        },
                        "要望の対応状況を更新しました",
                      )
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-slate-400">
          カテゴリ:{" "}
          {FEATURE_REQUEST_CATEGORIES.map(
            (c) => FEATURE_REQUEST_CATEGORY_LABELS[c],
          ).join(" · ")}
        </p>
      </SectionCard>

      <SectionCard
        id="bug-tracker"
        eyebrow="MODULE 3 · BUG TRACKER"
        title="不具合トラッカー"
      >
        <ul className="space-y-4">
          {bugReports.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-[#071426]/08 bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="text-[15px] font-semibold"
                      style={{ color: NAVY }}
                    >
                      {item.title}
                    </p>
                    <span
                      className="text-[11px] font-semibold tracking-[0.08em]"
                      style={{ color: severityColor(item.severity) }}
                    >
                      {BUG_SEVERITY_LABELS[item.severity]}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-slate-600">
                    {item.description}
                  </p>
                  <p className="mt-2 text-[12px] text-slate-400">
                    {item.reporterName} · {item.affectedScreen}
                    {item.resolvedAt
                      ? ` · 修正 ${new Date(item.resolvedAt).toLocaleDateString("ja-JP")}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <InlineSelect
                    ariaLabel={`${item.title} の重要度`}
                    value={item.severity}
                    disabled={pending}
                    options={BUG_SEVERITIES.map((value) => ({
                      value,
                      label: BUG_SEVERITY_LABELS[value],
                    }))}
                    onChange={(value) =>
                      patchEntity(
                        {
                          entity: "bug_report",
                          id: item.id,
                          severity: value as BugSeverity,
                        },
                        "不具合の重要度を更新しました",
                      )
                    }
                  />
                  <InlineSelect
                    ariaLabel={`${item.title} の修正状況`}
                    value={item.status}
                    disabled={pending}
                    options={BUG_STATUSES.map((value) => ({
                      value,
                      label: BUG_STATUS_LABELS[value],
                    }))}
                    onChange={(value) =>
                      patchEntity(
                        {
                          entity: "bug_report",
                          id: item.id,
                          status: value as BugStatus,
                        },
                        "不具合の修正状況を更新しました",
                      )
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        id="client-outcomes"
        eyebrow="MODULE 4 · CLIENT OUTCOMES"
        title="クライアント成果"
      >
        <p className="mb-5 text-[13px] text-slate-500">
          {outcomes.periodLabel} · サンプル {outcomes.sampleSize} 名
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="睡眠改善率"
            value={formatPct(outcomes.sleepImprovementRate)}
          />
          <MetricTile
            label="継続率"
            value={formatPct(outcomes.continuationRate)}
          />
          <MetricTile
            label="Homework達成率"
            value={formatPct(outcomes.homeworkAchievementRate)}
          />
          <MetricTile
            label="Journey進捗"
            value={formatPct(outcomes.journeyProgressRate)}
          />
        </div>
        <div className="mt-6 space-y-3">
          {outcomes.byStage.map((row) => (
            <OutcomeBar
              key={row.stage}
              label={`${row.stage}（${row.clientCount}）`}
              value={row.progressPercent}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="weekly-report"
        eyebrow="MODULE 5 · WEEKLY REPORT"
        title="Closed Beta Report"
      >
        {latestReport ? (
          <div>
            <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p
                className="text-[1.05rem] font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                {latestReport.weekLabel}
              </p>
              <p className="text-[12px] text-slate-400">
                {latestReport.weekStart} — {latestReport.weekEnd}
                {latestReport.isMock ? " · モック自動生成" : ""}
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <p
                  className="text-[11px] font-semibold tracking-[0.14em]"
                  style={{ color: GOLD }}
                >
                  今週の成果
                </p>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-slate-600">
                  {latestReport.achievements.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p
                  className="text-[11px] font-semibold tracking-[0.14em]"
                  style={{ color: GOLD }}
                >
                  課題
                </p>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-slate-600">
                  {latestReport.challenges.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p
                  className="text-[11px] font-semibold tracking-[0.14em]"
                  style={{ color: GOLD }}
                >
                  改善提案
                </p>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-slate-600">
                  {latestReport.improvementProposals.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
            </div>
            {weeklyReports.length > 1 ? (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-[12px] font-semibold text-slate-400">
                  過去の週次レポート
                </p>
                <ul className="mt-2 space-y-1 text-[13px] text-slate-500">
                  {weeklyReports.slice(1).map((report) => (
                    <li key={report.id}>
                      {report.weekLabel}（{report.weekStart} — {report.weekEnd}
                      ）
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-[13px] text-slate-500">レポートがありません。</p>
        )}
      </SectionCard>

      <SectionCard
        id="product-backlog"
        eyebrow="MODULE 6 · PRODUCT BACKLOG"
        title="改善項目一覧"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {BACKLOG_STATUSES.map((status) => {
            const items = productBacklog.filter(
              (item) => item.status === status,
            );
            return (
              <div
                key={status}
                className="rounded-2xl border border-[#071426]/08 bg-[#fafaf8] px-4 py-4"
              >
                <p
                  className="text-[12px] font-semibold tracking-[0.14em]"
                  style={{ color: GOLD }}
                >
                  {BACKLOG_STATUS_LABELS[status]}
                  <span className="ml-2 tabular-nums text-slate-400">
                    {items.length}
                  </span>
                </p>
                <ul className="mt-3 space-y-3">
                  {items.length === 0 ? (
                    <li className="text-[13px] text-slate-400">なし</li>
                  ) : (
                    items.map((item) => (
                      <li key={item.id} className="rounded-xl bg-white px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p
                            className="text-[14px] font-semibold"
                            style={{ color: NAVY }}
                          >
                            {item.title}
                          </p>
                          <InlineSelect
                            ariaLabel={`${item.title} のステータス`}
                            value={item.status}
                            disabled={pending}
                            options={BACKLOG_STATUSES.map((value) => ({
                              value,
                              label: BACKLOG_STATUS_LABELS[value],
                            }))}
                            onChange={(value) =>
                              patchEntity(
                                {
                                  entity: "product_backlog",
                                  id: item.id,
                                  status: value as BacklogStatus,
                                },
                                "バックログを更新しました",
                              )
                            }
                          />
                        </div>
                        <p className="mt-1 text-[12px] leading-5 text-slate-500">
                          {item.summary}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {item.module} ·{" "}
                          {FEATURE_REQUEST_PRIORITY_LABELS[item.priority]}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

export function ClosedBetaOperationDashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-[28px]" />
      <Skeleton className="h-56 rounded-[28px]" />
      <Skeleton className="h-48 rounded-[28px]" />
      <Skeleton className="h-48 rounded-[28px]" />
      <Skeleton className="h-40 rounded-[28px]" />
    </div>
  );
}
