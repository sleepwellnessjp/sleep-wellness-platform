"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  DANGER,
  GOLD,
  NAVY,
  SURFACE_WARM,
  TEAL,
} from "@/components/ui/tokens";
import type {
  AdminAlertItem,
  AdminAlertSeverity,
  AdminHqDashboard,
} from "@/lib/admin/types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function severityStyle(severity: AdminAlertSeverity): {
  color: string;
  background: string;
} {
  switch (severity) {
    case "critical":
      return { color: DANGER, background: "rgba(163,58,58,0.08)" };
    case "warning":
      return { color: GOLD, background: "rgba(138,106,45,0.12)" };
    case "caution":
      return { color: TEAL, background: "rgba(49,95,104,0.1)" };
    default:
      return { color: "#64748b", background: SURFACE_WARM };
  }
}

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
    <article className="rounded-[24px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)] sm:px-6">
      <p
        className="text-[10px] font-semibold tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-[1.75rem] font-semibold tracking-[-0.04em] tabular-nums sm:text-3xl"
        style={{ color: NAVY }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-[12px] leading-5 text-slate-400">{hint}</p>
      ) : null}
    </article>
  );
}

function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[12px] font-semibold transition hover:opacity-80"
      style={{ color: TEAL }}
    >
      {children}
    </Link>
  );
}

function MiniBars({
  values,
  labels,
  accent,
}: {
  values: number[];
  labels: string[];
  accent: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-36 items-end gap-1.5 sm:gap-2">
      {values.map((value, index) => {
        const height = Math.max(6, (value / max) * 100);
        return (
          <div
            key={`${labels[index]}-${index}`}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <p className="text-[10px] font-semibold tabular-nums text-slate-500">
              {value}
            </p>
            <div
              className="w-full rounded-t-lg"
              style={{
                height: `${height}%`,
                background: accent,
                minHeight: 6,
              }}
              title={`${labels[index]}: ${value}`}
            />
            <p className="truncate text-[9px] text-slate-400">{labels[index]}</p>
          </div>
        );
      })}
    </div>
  );
}

function OverviewSection({ data }: { data: AdminHqDashboard["overview"] }) {
  return (
    <section aria-labelledby="admin-hq-overview">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2
          id="admin-hq-overview"
          className="text-[13px] font-semibold tracking-[0.08em]"
          style={{ color: NAVY }}
        >
          Overview
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricTile label="認定講師数" value={String(data.instructorCount)} />
        <MetricTile
          label="登録クライアント総数"
          value={String(data.clientCount)}
        />
        <MetricTile label="分析件数" value={String(data.analysisCount)} />
        <MetricTile label="レポート作成件数" value={String(data.reportCount)} />
        <MetricTile
          label="今月の新規登録数"
          value={String(data.newRegistrationsThisMonth)}
          hint="クライアント新規"
        />
      </div>
    </section>
  );
}

function InstructorsSection({
  rows,
}: {
  rows: AdminHqDashboard["instructors"];
}) {
  return (
    <SectionCard
      eyebrow="INSTRUCTOR MANAGEMENT"
      title="認定講師管理"
      className="overflow-hidden"
    >
      <div className="mb-4 flex justify-end">
        <SectionLink href="/admin/instructors">すべて見る →</SectionLink>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.14em] text-slate-400">
              <th className="py-3 pr-4 font-semibold">認定講師</th>
              <th className="py-3 pr-4 font-semibold">認定レベル</th>
              <th className="py-3 pr-4 font-semibold">登録日</th>
              <th className="py-3 pr-4 font-semibold">担当</th>
              <th className="py-3 pr-4 font-semibold">最終ログイン</th>
              <th className="py-3 font-semibold">利用状況</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-b border-slate-50">
                <td className="py-3.5 pr-4">
                  <p className="font-semibold" style={{ color: NAVY }}>
                    {item.displayName ?? "—"}
                  </p>
                  <p className="text-[12px] text-slate-500">{item.email}</p>
                </td>
                <td className="py-3.5 pr-4 text-slate-600">
                  {item.certificationLabel}
                </td>
                <td className="py-3.5 pr-4 text-slate-500">
                  {formatDate(item.registeredAt)}
                </td>
                <td className="py-3.5 pr-4 tabular-nums">{item.clientCount}</td>
                <td className="py-3.5 pr-4 text-slate-500">
                  {formatDateTime(item.lastLoginAt)}
                </td>
                <td className="py-3.5">
                  <p className="text-[12px] leading-5 text-slate-600">
                    {item.usageLabel}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold" style={{ color: GOLD }}>
                    {item.statusLabel}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            認定講師がまだ登録されていません。
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}

function ClientStatsSection({
  data,
}: {
  data: AdminHqDashboard["clientStats"];
}) {
  return (
    <SectionCard eyebrow="CLIENT STATISTICS" title="クライアント統計">
      <div className="mb-4 flex justify-end">
        <SectionLink href="/admin/clients">一覧を開く →</SectionLink>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "クライアント総数", value: String(data.clientCount) },
          {
            label: "平均睡眠スコア",
            value:
              data.averageSleepScore != null
                ? data.averageSleepScore.toFixed(1)
                : "—",
          },
          {
            label: "改善率",
            value:
              data.improvementRate != null ? `${data.improvementRate}%` : "—",
          },
          {
            label: "継続率",
            value:
              data.retentionRate != null ? `${data.retentionRate}%` : "—",
          },
          {
            label: "最新分析日",
            value: formatDate(data.latestAnalysisAt),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl px-4 py-4"
            style={{ backgroundColor: SURFACE_WARM }}
          >
            <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
            <p
              className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums"
              style={{ color: NAVY }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PlatformAnalyticsSection({
  data,
}: {
  data: AdminHqDashboard["platformAnalytics"];
}) {
  const labels = data.daily.map((item) => item.label);
  return (
    <SectionCard eyebrow="PLATFORM ANALYTICS" title="プラットフォーム分析">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">直近14日 · Asia/Tokyo</p>
        <SectionLink href="/admin/analytics">詳細統計 →</SectionLink>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "期間内利用者数", value: String(data.activeUsersPeriod) },
          { label: "分析件数", value: String(data.analysesPeriod) },
          { label: "Homework送信数", value: String(data.homeworkSentPeriod) },
          { label: "Journey更新数", value: String(data.journeyUpdatesPeriod) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-100 px-4 py-3"
          >
            <p className="text-[11px] text-slate-500">{item.label}</p>
            <p
              className="mt-1 text-xl font-semibold tabular-nums"
              style={{ color: NAVY }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-[12px] font-semibold" style={{ color: NAVY }}>
            日別利用者数
          </p>
          <MiniBars
            values={data.daily.map((item) => item.activeUsers)}
            labels={labels}
            accent={NAVY}
          />
        </div>
        <div>
          <p className="mb-3 text-[12px] font-semibold" style={{ color: NAVY }}>
            分析件数推移
          </p>
          <MiniBars
            values={data.daily.map((item) => item.analyses)}
            labels={labels}
            accent={`linear-gradient(180deg, ${TEAL} 0%, ${NAVY} 100%)`}
          />
        </div>
        <div>
          <p className="mb-3 text-[12px] font-semibold" style={{ color: NAVY }}>
            Homework送信数
          </p>
          <MiniBars
            values={data.daily.map((item) => item.homeworkSent)}
            labels={labels}
            accent={TEAL}
          />
        </div>
        <div>
          <p className="mb-3 text-[12px] font-semibold" style={{ color: NAVY }}>
            Journey更新数
          </p>
          <MiniBars
            values={data.daily.map((item) => item.journeyUpdates)}
            labels={labels}
            accent={GOLD}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function AlertsSection({ alerts }: { alerts: AdminAlertItem[] }) {
  return (
    <SectionCard eyebrow="ALERTS" title="注意・アラート">
      {alerts.length === 0 ? (
        <div
          className="rounded-2xl px-4 py-8 text-center"
          style={{ backgroundColor: SURFACE_WARM }}
        >
          <p className="text-sm text-slate-500">現在、要注意の項目はありません。</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => {
            const style = severityStyle(alert.severity);
            return (
              <li key={alert.id}>
                <div
                  className="flex flex-col gap-3 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  style={{ backgroundColor: style.background }}
                >
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-semibold tracking-[0.14em]"
                      style={{ color: style.color }}
                    >
                      {alert.severity.toUpperCase()}
                      {alert.count > 0 ? ` · ${alert.count}` : ""}
                    </p>
                    <p
                      className="mt-1 text-[15px] font-semibold tracking-[-0.02em]"
                      style={{ color: NAVY }}
                    >
                      {alert.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-slate-600">
                      {alert.detail}
                    </p>
                  </div>
                  {alert.href ? (
                    <Link
                      href={alert.href}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-4 text-[12px] font-semibold text-white"
                      style={{ backgroundColor: NAVY }}
                    >
                      確認する
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

const QUICK_ACTIONS = [
  {
    href: "/admin/instructors",
    label: "認定講師追加",
    description: "講師一覧から資格・クレジットを設定",
  },
  {
    href: "/admin/instructors",
    label: "認定講師停止",
    description: "会員ステータスを停止に変更",
  },
  {
    href: "/admin/community",
    label: "お知らせ配信",
    description: "Community / 通知向けの告知準備",
  },
  {
    href: "/admin/academy",
    label: "教材更新",
    description: "Academy 認定・教材の管理",
  },
  {
    href: "/admin/settings",
    label: "システム設定",
    description: "ブランド・規約・問い合わせ先",
  },
  {
    href: "/admin/beta",
    label: "Closed Beta",
    description: "運営指標・健全性・ロードマップ",
  },
  {
    href: "/admin/feedback",
    label: "βフィードバック",
    description: "講師からの改善要望・不具合を確認",
  },
] as const;

function QuickActionsSection() {
  return (
    <SectionCard eyebrow="ADMIN QUICK ACTIONS" title="クイックアクション">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-[22px] border border-slate-200/90 bg-white px-4 py-5 transition hover:border-[#071426]/20"
          >
            <p
              className="text-[14px] font-semibold tracking-[-0.02em]"
              style={{ color: NAVY }}
            >
              {action.label}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-slate-500">
              {action.description}
            </p>
            <p
              className="mt-3 text-[11px] font-semibold"
              style={{ color: TEAL }}
            >
              開く →
            </p>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

export function AdminHqDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-[28px]" />
      <Skeleton className="h-40 rounded-[28px]" />
      <Skeleton className="h-72 rounded-[28px]" />
      <Skeleton className="h-48 rounded-[28px]" />
    </div>
  );
}

export default function AdminHqDashboardView({
  data,
}: {
  data: AdminHqDashboard;
}) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <OverviewSection data={data.overview} />
      <QuickActionsSection />
      <InstructorsSection rows={data.instructors} />
      <ClientStatsSection data={data.clientStats} />
      <PlatformAnalyticsSection data={data.platformAnalytics} />
      <AlertsSection alerts={data.alerts} />
    </div>
  );
}
