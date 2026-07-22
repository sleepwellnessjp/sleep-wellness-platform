"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import AiFollowAlerts, {
  type AiFollowAlertItem,
} from "@/components/AiFollowAlerts";
import InstructorNav from "@/components/InstructorNav";
import OnboardingGuide from "@/components/OnboardingGuide";
import SchemaSetupBanner from "@/components/SchemaSetupBanner";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { buildAiFollowAlerts } from "@/lib/ai-follow-alerts";
import { usePlatformMe } from "@/lib/platform/use-platform-me";
import {
  appointmentDisplayTitle,
  formatLocationTypeLabel,
  listTodayOwnerAppointments,
  type ClientAppointment,
} from "@/lib/repositories/client-appointments-repository";
import {
  filterTodaysHomeworks,
  formatHomeworkDate,
  homeworkStatusLabel,
  homeworkStatusOf,
  listClientHomeworks,
  type ClientHomework,
} from "@/lib/repositories/client-homeworks-repository";
import {
  formatDisplayDate,
  loadClients,
  type StoredClient,
} from "@/lib/repositories/client-repository";
import {
  computeDashboardStatsFromClients,
  type DashboardStats,
  type RecentAnalysisItem,
} from "@/lib/dashboard-stats";
import { SWIJ_NEWS_ITEMS } from "@/lib/swij-news";
import { homeModulesForRole } from "@/lib/os/navigation";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const GOLD_SOFT = "rgba(184, 146, 66, 0.12)";
const GOLD_BORDER = "rgba(138, 106, 45, 0.28)";
const TEAL = "#315f68";

type TodayScheduleItem = {
  appointment: ClientAppointment;
  clientName: string;
};

type ClientPreview = {
  id: string;
  name: string;
  latestSleepScore: number | null;
  latestAnalysisDate: string | null;
};

type HomeworkPreview = {
  homework: ClientHomework;
  clientId: string;
  clientName: string;
};

function emptyStats(): DashboardStats {
  return {
    clientCount: 0,
    analysesThisMonth: 0,
    averageSleepScore: null,
    improvement: { improvedCount: 0, comparableCount: 0, rate: null },
    followUpCount: 0,
    followUps: [],
    recentAnalyses: [],
    distribution: { "80+": 0, "70-79": 0, "60-69": 0, "59-": 0 },
    compareClientId: null,
    retention: {
      months3: { rate: null, eligibleCount: 0, retainedCount: 0 },
      months6: { rate: null, eligibleCount: 0, retainedCount: 0 },
      churnRate: null,
      churnCount: 0,
      analyzedCount: 0,
      frequency: { perMonth: null, avgDaysBetween: null },
    },
  };
}

function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "こんばんは";
  if (hour < 11) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "こんばんは";
}

function formatSenseiName(displayName: string | null | undefined): string {
  const cleaned = displayName?.trim();
  if (!cleaned) return "インストラクター先生";
  if (cleaned.endsWith("先生")) return cleaned;
  return `${cleaned}先生`;
}

function toSanName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "クライアント";
  if (/\s/.test(trimmed)) {
    return `${trimmed.split(/\s+/)[0]}さん`;
  }
  if (trimmed.length >= 3) return `${trimmed.slice(0, 2)}さん`;
  return `${trimmed}さん`;
}

function uniqueRecentClients(
  items: RecentAnalysisItem[],
  limit = 5,
): RecentAnalysisItem[] {
  const seen = new Set<string>();
  const result: RecentAnalysisItem[] = [];
  for (const item of items) {
    if (seen.has(item.clientId)) continue;
    seen.add(item.clientId);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function buildClientNameMap(clients: StoredClient[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const client of clients) {
    map.set(client.id, client.name);
  }
  return map;
}

function buildTodaySchedule(
  appointments: ClientAppointment[],
  nameById: Map<string, string>,
): TodayScheduleItem[] {
  return appointments.map((appointment) => ({
    appointment,
    clientName: nameById.get(appointment.clientId) ?? "クライアント",
  }));
}

function buildDashboardAlerts(clients: StoredClient[]): AiFollowAlertItem[] {
  const items: AiFollowAlertItem[] = [];
  for (const client of clients) {
    if (!client.analyses.length) continue;
    const alerts = buildAiFollowAlerts({
      analyses: client.analyses,
      tags: client.tags,
    });
    for (const alert of alerts) {
      items.push({
        ...alert,
        id: `${client.id}:${alert.id}`,
        href: `/clients/${encodeURIComponent(client.id)}`,
        clientLabel: toSanName(client.name),
      });
    }
  }
  return items.slice(0, 6);
}

function buildClientPreviews(clients: StoredClient[], limit = 6): ClientPreview[] {
  return [...clients]
    .sort((a, b) => {
      const dateA = a.analyses[0]?.createdAt ?? a.registeredAt;
      const dateB = b.analyses[0]?.createdAt ?? b.registeredAt;
      return dateB.localeCompare(dateA);
    })
    .slice(0, limit)
    .map((client) => ({
      id: client.id,
      name: client.name,
      latestSleepScore: client.analyses[0]?.sleepScore ?? null,
      latestAnalysisDate: client.analyses[0]?.analysisDate ?? null,
    }));
}

function formatTodayLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function SectionHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
      <div className="min-w-0">
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          {eyebrow}
        </p>
        <h2
          className="mt-1.5 text-lg font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function cardClassName(extra = "") {
  return `rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-7 sm:py-8 ${extra}`;
}

export default function InstructorDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [todaySchedule, setTodaySchedule] = useState<TodayScheduleItem[]>([]);
  const [alerts, setAlerts] = useState<AiFollowAlertItem[]>([]);
  const [clientPreviews, setClientPreviews] = useState<ClientPreview[]>([]);
  const [homeworkPreviews, setHomeworkPreviews] = useState<HomeworkPreview[]>(
    [],
  );
  const [ready, setReady] = useState(false);
  const { data: platformMe } = usePlatformMe();

  const refresh = async () => {
    try {
      const [clients, appointments] = await Promise.all([
        loadClients(),
        listTodayOwnerAppointments().catch((error) => {
          console.error("[dashboard] listTodayOwnerAppointments failed:", error);
          return [] as ClientAppointment[];
        }),
      ]);
      const nameById = buildClientNameMap(clients);
      setStats(computeDashboardStatsFromClients(clients));
      setTodaySchedule(buildTodaySchedule(appointments, nameById));
      setAlerts(buildDashboardAlerts(clients));
      setClientPreviews(buildClientPreviews(clients));

      const homeworkPairs = await Promise.all(
        clients.slice(0, 12).map(async (client) => {
          try {
            const items = await listClientHomeworks(client.id);
            return filterTodaysHomeworks(items).map((homework) => ({
              homework,
              clientId: client.id,
              clientName: client.name,
            }));
          } catch {
            return [] as HomeworkPreview[];
          }
        }),
      );
      setHomeworkPreviews(homeworkPairs.flat().slice(0, 8));
    } catch (error) {
      console.error("[dashboard] loadClients failed:", error);
      setStats(emptyStats());
      setTodaySchedule([]);
      setAlerts([]);
      setClientPreviews([]);
      setHomeworkPreviews([]);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    void refresh();
    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
    };
  }, []);

  const greeting = greetingForNow();
  const senseiName = formatSenseiName(platformMe?.profile.displayName);
  const recentClients = useMemo(
    () => uniqueRecentClients(stats.recentAnalyses, 5),
    [stats.recentAnalyses],
  );
  const todayLabel = formatTodayLabel();

  const focusLine = useMemo(() => {
    if (todaySchedule.length > 0) {
      return `本日の予定が${todaySchedule.length}件あります。`;
    }
    if (alerts.length > 0) {
      return `フォロー推奨が${alerts.length}件あります。`;
    }
    if (stats.followUpCount > 0) {
      return `フォローが必要なクライアントが${stats.followUpCount}名います。`;
    }
    if (stats.clientCount === 0) {
      return "まずは新規クライアントの登録から始めましょう。";
    }
    return "今日は新しい分析やクライアントのフォローから進められます。";
  }, [
    todaySchedule.length,
    alerts.length,
    stats.followUpCount,
    stats.clientCount,
  ]);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="DASHBOARD" />
      <OnboardingGuide enabled={ready} />

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
        <SchemaSetupBanner />

        <header className="animate-fade-up">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            TODAY · {todayLabel}
          </p>
          <p className="mt-5 text-[1.05rem] font-medium tracking-[-0.02em] text-slate-500 sm:text-lg">
            {greeting}
          </p>
          <h1
            className="mt-1 text-[2.15rem] font-semibold tracking-[-0.05em] sm:text-5xl"
            style={{ color: NAVY }}
          >
            {senseiName}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600 sm:text-base">
            {focusLine}
          </p>
        </header>

        {!ready ? (
          <div className="mt-16">
            <ListSkeleton rows={4} />
          </div>
        ) : (
          <div className="mt-10 space-y-5 sm:mt-12 sm:space-y-6">
            <section
              className={`animate-fade-up ${cardClassName()}`}
              style={{ animationDelay: "30ms" }}
            >
              <SectionHeader title="OS Home" eyebrow="SLEEP WELLNESS OS" />
              <div className="grid gap-3 sm:grid-cols-2">
                {homeModulesForRole("instructor").map((module) => (
                  <Link
                    key={module.id}
                    href={module.href}
                    className="rounded-2xl bg-[#fafaf8] px-4 py-4 transition hover:bg-[#f5f4f0]"
                  >
                    <p
                      className="text-[10px] font-semibold tracking-[0.16em]"
                      style={{ color: GOLD }}
                    >
                      {module.eyebrow}
                    </p>
                    <p
                      className="mt-2 text-[15px] font-semibold"
                      style={{ color: NAVY }}
                    >
                      {module.title}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">
                      {module.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* 1. 今日の予約 */}
            <section
              id="appointments"
              className={`animate-fade-up ${cardClassName()}`}
              style={{ animationDelay: "60ms" }}
            >
              <SectionHeader
                title="今日の予約"
                eyebrow="SCHEDULE"
                action={
                  <p
                    className="rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.14em]"
                    style={{
                      color: GOLD,
                      backgroundColor: GOLD_SOFT,
                      boxShadow: `inset 0 0 0 1px ${GOLD_BORDER}`,
                    }}
                  >
                    {todaySchedule.length}件
                  </p>
                }
              />

              {todaySchedule.length === 0 ? (
                <div className="rounded-2xl bg-[#fafaf8] px-4 py-8 text-center sm:px-5">
                  <p className="text-sm leading-7 text-slate-500">
                    本日の予定はありません。
                  </p>
                  <p className="mt-1 text-[13px] text-slate-400">
                    クライアント詳細から次回予定を登録できます。
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {todaySchedule.map(({ appointment, clientName }) => (
                    <li key={appointment.id}>
                      <Link
                        href={`/clients/${encodeURIComponent(appointment.clientId)}`}
                        className="group flex items-start gap-4 rounded-2xl bg-[#fafaf8] px-4 py-4 transition hover:bg-[#f5f4f0] sm:px-5"
                      >
                        <div
                          className="flex h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-2xl px-2 text-white"
                          style={{ backgroundColor: NAVY }}
                        >
                          {appointment.startTime ? (
                            <span className="text-[13px] font-semibold tabular-nums tracking-[-0.03em]">
                              {appointment.startTime}
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold tracking-[0.04em]">
                              終日
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p
                            className="text-[15px] font-semibold tracking-[-0.02em] transition group-hover:opacity-70"
                            style={{ color: NAVY }}
                          >
                            {toSanName(clientName)}
                          </p>
                          <p className="mt-1 text-[13px] text-slate-500">
                            {appointmentDisplayTitle(appointment)}
                          </p>
                          <p className="mt-1.5 text-[12px] text-slate-400">
                            {formatLocationTypeLabel(appointment.locationType)}
                            {appointment.location.trim()
                              ? ` · ${appointment.location.trim()}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className="mt-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#8a6a2d]"
                          aria-hidden
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 2. 最近分析 */}
            <section
              className={`animate-fade-up ${cardClassName()}`}
              style={{ animationDelay: "120ms" }}
            >
              <SectionHeader title="最近分析" eyebrow="RECENT" />

              {recentClients.length === 0 ? (
                <EmptyState
                  compact
                  illustration="analysis"
                  title="まだ分析がありません"
                  description="最初の睡眠分析を始めると、ここに最近の結果が表示されます。"
                  primaryAction={{
                    label: "新しい分析を作成",
                    href: "/analysis/new",
                  }}
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentClients.map((client) => (
                    <li key={`${client.clientId}-${client.analysisId}`}>
                      <Link
                        href={`/analysis/result?analysisId=${encodeURIComponent(client.analysisId)}`}
                        className="group flex items-center justify-between gap-4 py-3.5 transition first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p
                            className="text-[15px] font-medium tracking-[-0.02em] transition group-hover:opacity-70 sm:text-base"
                            style={{ color: NAVY }}
                          >
                            {client.name}
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-400">
                            {formatDisplayDate(client.analysisDate)}
                            {client.trend === "improved"
                              ? " · 改善"
                              : client.trend === "worsened"
                                ? " · 要注意"
                                : ""}
                          </p>
                        </div>
                        <span className="text-[15px] font-semibold tracking-[-0.02em] tabular-nums text-slate-400 transition group-hover:text-[#8a6a2d]">
                          {client.sleepScore ?? "—"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 2b. 今日の宿題確認 */}
            <section
              id="homework"
              className={`animate-fade-up ${cardClassName()}`}
              style={{ animationDelay: "150ms" }}
            >
              <SectionHeader
                title="今日の宿題確認"
                eyebrow="HOMEWORK"
                action={
                  <p className="text-[12px] font-medium text-slate-400">
                    {homeworkPreviews.length}件
                  </p>
                }
              />
              {homeworkPreviews.length === 0 ? (
                <div className="rounded-2xl bg-[#fafaf8] px-4 py-8 text-center">
                  <p className="text-sm leading-7 text-slate-500">
                    本日確認すべき宿題はありません。
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {homeworkPreviews.map(({ homework, clientId, clientName }) => {
                    const status = homeworkStatusOf(homework);
                    return (
                      <li key={homework.id}>
                        <Link
                          href={`/clients/${encodeURIComponent(clientId)}`}
                          className="group flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p
                              className="text-[15px] font-medium transition group-hover:opacity-70"
                              style={{ color: NAVY }}
                            >
                              {toSanName(clientName)}
                            </p>
                            <p className="mt-0.5 truncate text-[12px] text-slate-400">
                              {homework.title} · 期限{" "}
                              {formatHomeworkDate(homework.dueDate)}
                            </p>
                          </div>
                          <span className="shrink-0 text-[12px] font-semibold text-slate-500">
                            {homeworkStatusLabel(status)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 3. AI Instructor Insight */}
            <div id="insight">
              <AiFollowAlerts
                className="animate-fade-up"
                style={{ animationDelay: "180ms" }}
                alerts={alerts}
                title="AI Instructor Insight"
                eyebrow="AI INSIGHT"
                description="診断ではありません。今日フォローしたい着眼点です。"
                emptyMessage="いま優先して見るインサイトはありません。"
                dividedHeader
              />
            </div>

            {/* 4. Sleep Wellness Institute Japan News */}
            <section
              className={`animate-fade-up ${cardClassName()}`}
              style={{ animationDelay: "240ms" }}
            >
              <SectionHeader
                title="Sleep Wellness Institute Japan News"
                eyebrow="NEWS"
                action={
                  <Link
                    href="/#news"
                    className="text-[12px] font-semibold underline-offset-4 transition hover:underline"
                    style={{ color: GOLD }}
                  >
                    すべて
                  </Link>
                }
              />

              <ul className="space-y-3">
                {SWIJ_NEWS_ITEMS.slice(0, 3).map((item) => (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      className="group block rounded-2xl bg-[#fafaf8] px-4 py-4 transition hover:bg-[#f5f4f0] sm:px-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em]"
                          style={{
                            color: TEAL,
                            backgroundColor: "rgba(49, 95, 104, 0.1)",
                          }}
                        >
                          {item.category}
                        </span>
                        <time
                          dateTime={item.date.replace(/\./g, "-")}
                          className="text-[11px] text-slate-400"
                        >
                          {item.date}
                        </time>
                      </div>
                      <p
                        className="mt-3 text-[15px] font-semibold tracking-[-0.02em] transition group-hover:opacity-70"
                        style={{ color: NAVY }}
                      >
                        {item.title}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-slate-500">
                        {item.description}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {/* 5. 担当クライアント */}
            <section
              id="clients"
              className={`animate-fade-up ${cardClassName()}`}
              style={{ animationDelay: "300ms" }}
            >
              <SectionHeader
                title="担当クライアント"
                eyebrow="CLIENTS"
                action={
                  <p className="text-[12px] font-medium text-slate-400">
                    {stats.clientCount}名
                  </p>
                }
              />

              {clientPreviews.length === 0 ? (
                <EmptyState
                  compact
                  illustration="generic"
                  title="まだクライアントがいません"
                  description="新規登録からクライアントを追加しましょう。"
                  primaryAction={{
                    label: "クライアント一覧へ",
                    href: "/clients",
                  }}
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {clientPreviews.map((client) => (
                    <li key={client.id}>
                      <Link
                        href={`/clients/${encodeURIComponent(client.id)}`}
                        className="group flex items-center justify-between gap-4 py-3.5 transition first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p
                            className="text-[15px] font-medium tracking-[-0.02em] transition group-hover:opacity-70"
                            style={{ color: NAVY }}
                          >
                            {client.name}
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-400">
                            {client.latestAnalysisDate
                              ? `最終分析 ${formatDisplayDate(client.latestAnalysisDate)}`
                              : "未分析"}
                          </p>
                        </div>
                        <span className="text-[14px] font-semibold tabular-nums text-slate-400 transition group-hover:text-[#8a6a2d]">
                          {client.latestSleepScore ?? "—"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <Link
                  href="/clients"
                  className="text-[13px] font-semibold underline-offset-4 transition hover:underline"
                  style={{ color: GOLD }}
                >
                  すべてのクライアントを見る
                </Link>
              </div>
            </section>

            {/* 6. 新規分析 */}
            <section
              className="animate-fade-up"
              style={{ animationDelay: "360ms" }}
            >
              <Link
                href="/analysis/new"
                className="group flex items-center justify-between gap-4 rounded-[28px] border border-[#071426]/15 bg-[#071426] px-5 py-6 text-white shadow-[0_24px_70px_-42px_rgba(7,20,38,0.55)] transition hover:-translate-y-0.5 hover:opacity-95 sm:px-7 sm:py-7"
              >
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-[#d8b36a]">
                    NEW ANALYSIS
                  </p>
                  <p className="mt-3 text-lg font-semibold tracking-[-0.03em] sm:text-xl">
                    新規分析
                  </p>
                  <p className="mt-1.5 text-sm text-white/65">
                    SOXAIデータから睡眠ウェルネスを分析します
                  </p>
                </div>
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition group-hover:scale-105"
                  aria-hidden
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4">
                    <path
                      d="M3.2 8h9.6M8.8 4.2 12.6 8 8.8 11.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </section>

            {/* 7. 新規クライアント */}
            <section
              className="animate-fade-up"
              style={{ animationDelay: "420ms" }}
            >
              <Link
                href="/clients/new"
                className="group flex items-center justify-between gap-4 rounded-[28px] border border-[#8a6a2d]/25 bg-gradient-to-br from-[#faf7f1] to-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-[#8a6a2d]/40 hover:shadow-[0_24px_70px_-42px_rgba(15,23,42,0.22)] sm:px-7 sm:py-7"
              >
                <div>
                  <p
                    className="text-[10px] font-semibold tracking-[0.22em]"
                    style={{ color: GOLD }}
                  >
                    NEW CLIENT
                  </p>
                  <p
                    className="mt-3 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                    style={{ color: NAVY }}
                  >
                    新規クライアント
                  </p>
                  <p className="mt-1.5 text-sm text-slate-500">
                    プロフィール登録から始めます
                  </p>
                </div>
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition group-hover:scale-105"
                  style={{ backgroundColor: NAVY }}
                  aria-hidden
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4">
                    <path
                      d="M8 3.2v9.6M3.2 8h9.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </Link>
            </section>

            {/* 8. 設定 */}
            <section
              className="animate-fade-up"
              style={{ animationDelay: "480ms" }}
            >
              <Link
                href="/portal"
                className="group flex items-center justify-between gap-4 rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)] transition hover:bg-[#fafaf8] sm:px-7 sm:py-6"
              >
                <div>
                  <p
                    className="text-[10px] font-semibold tracking-[0.22em]"
                    style={{ color: GOLD }}
                  >
                    SETTINGS
                  </p>
                  <p
                    className="mt-2 text-[15px] font-semibold tracking-[-0.02em] sm:text-base"
                    style={{ color: NAVY }}
                  >
                    設定
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    認定資格・クレジット・分析履歴を確認
                  </p>
                </div>
                <span
                  className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#8a6a2d]"
                  aria-hidden
                >
                  →
                </span>
              </Link>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
