"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InstructorBetaLaunchChrome from "@/components/beta/InstructorBetaLaunchChrome";
import InstructorNav from "@/components/InstructorNav";
import InstructorOpsMetrics from "@/components/ops/InstructorOpsMetrics";
import { useResolvedOsRole } from "@/components/os/OsTopBar";
import {
  BORDER,
  CARD_SHADOW,
  GOLD,
  MUTED,
  NAVY,
  SUCCESS,
  SURFACE,
} from "@/components/ui/tokens";
import { SWIJ_EYEBROW_INSTRUCTOR } from "@/lib/brand/swij-brand";
import { isAdminOsRole } from "@/lib/os/roles";
import type { InstructorOpsDashboard } from "@/lib/ops/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  formatFollowUpDate,
  formatScoreDelta,
  formatSenseiName,
  getInstructorDashboard,
  type InstructorDashboardData,
  type InstructorTodayTodoItem,
  type InstructorTodayTodoKind,
} from "@/lib/instructor-dashboard";
import RecoveryIndexCard from "@/components/analysis/RecoveryIndexCard";

function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "こんばんは";
  if (hour < 11) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "こんばんは";
}

function deltaTone(delta: number | null): string {
  if (delta == null) return MUTED;
  if (delta > 0) return SUCCESS;
  if (delta < 0) return "#B91C1C";
  return MUTED;
}

const TODAY_TODO_SECTIONS: Array<{
  kind: InstructorTodayTodoKind;
  title: string;
  empty: string;
  key: keyof InstructorDashboardData["todayTodos"];
}> = [
  {
    kind: "counseling",
    title: "今日カウンセリング予定",
    empty: "本日のカウンセリング予定はありません。",
    key: "counseling",
  },
  {
    kind: "unread_feedback",
    title: "未読フィードバック",
    empty: "未読のフィードバックはありません。",
    key: "unreadFeedback",
  },
  {
    kind: "homework_pending",
    title: "提出待ち宿題",
    empty: "提出待ちの宿題はありません。",
    key: "homeworkPending",
  },
  {
    kind: "new_analysis",
    title: "新しい睡眠分析",
    empty: "本日の新しい睡眠分析はありません。",
    key: "newAnalyses",
  },
];

function TodayTodoList({
  items,
  empty,
}: {
  items: InstructorTodayTodoItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <p className="px-1 py-3 text-[13px] leading-6" style={{ color: MUTED }}>
        {empty}
      </p>
    );
  }

  return (
    <ul className="divide-y" style={{ borderColor: BORDER }}>
      {items.map((item) => (
        <li key={item.id} style={{ borderColor: BORDER }}>
          <Link
            href={item.href}
            className="flex flex-col gap-0.5 py-3.5 transition active:opacity-80 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 sm:py-3.5 sm:hover:opacity-90"
          >
            <span
              className="min-w-0 text-[14px] font-medium tracking-[-0.02em] sm:text-[15px]"
              style={{ color: NAVY }}
            >
              {item.title}
            </span>
            <span
              className="min-w-0 break-words text-[13px] leading-5 sm:max-w-[55%] sm:text-right"
              style={{ color: MUTED }}
            >
              {item.detail}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function InstructorDashboardPage() {
  const router = useRouter();
  const role = useResolvedOsRole("instructor");
  const [data, setData] = useState<InstructorDashboardData | null>(null);
  const [ops, setOps] = useState<InstructorOpsDashboard | null>(null);
  const [showDemoBanner, setShowDemoBanner] = useState(false);

  // Founder / HQ（admin・super_admin）は本部画面へ誘導
  useEffect(() => {
    if (isAdminOsRole(role)) {
      router.replace("/admin");
    }
  }, [role, router]);

  useEffect(() => {
    if (isAdminOsRole(role)) return;
    let cancelled = false;
    void (async () => {
      const next = await getInstructorDashboard();
      if (!cancelled) setData(next);
    })();
    void fetch("/api/ops/instructor-dashboard", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { dashboard?: InstructorOpsDashboard } | null) => {
        if (!cancelled && json?.dashboard) setOps(json.dashboard);
      })
      .catch(() => {
        /* keep null */
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    setShowDemoBanner(!isSupabaseConfigured());
  }, []);

  if (isAdminOsRole(role)) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen"
        style={{ backgroundColor: SURFACE, color: NAVY }}
      >
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-500">
          本部管理画面へ移動しています…
        </div>
      </main>
    );
  }

  const senseiName = formatSenseiName(data?.instructorDisplayName ?? "");
  const greeting = greetingForNow();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen"
      style={{ backgroundColor: SURFACE, color: NAVY }}
    >
      <InstructorBetaLaunchChrome enabled />
      <InstructorNav eyebrow={SWIJ_EYEBROW_INSTRUCTOR} />

      <div className="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-16 sm:pb-16 lg:py-20 lg:pb-20">
        {/* Greeting */}
        <header className="animate-fade-up">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS INSTITUTE JAPAN
          </p>
          <h1
            className="mt-2 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.04em] sm:text-[2.35rem] sm:leading-normal"
            style={{ color: NAVY }}
          >
            {greeting}、{data ? senseiName : "——先生"}
          </h1>
          <p
            className="mt-2 text-[14px] leading-6 sm:mt-3 sm:text-[15px] sm:leading-7"
            style={{ color: MUTED }}
          >
            今日やることと担当クライアント、今月の運営指標を確認しましょう。
          </p>
        </header>

        <section
          className="mt-8 animate-fade-up rounded-3xl border bg-white px-5 py-6 sm:mt-10 sm:px-7 sm:py-7"
          style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          aria-labelledby="schedule-manage-title"
        >
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            SCHEDULE
          </p>
          <h2
            id="schedule-manage-title"
            className="mt-2 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
            style={{ color: NAVY }}
          >
            活動予定
          </h2>
          <p className="mt-2 text-[13px] leading-6 sm:text-[14px]" style={{ color: MUTED }}>
            日付・タイトル・短い説明・外部リンクを登録すると、トップページの「認定インストラクターの活動予定」に文字だけで表示されます。
          </p>
          <div className="mt-5">
            <Link
              href="/instructor/activity-schedules"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white transition active:opacity-90 sm:min-h-11 sm:hover:opacity-90"
              style={{ backgroundColor: NAVY }}
            >
              活動予定を登録・管理
            </Link>
          </div>
        </section>

        {ops ? (
          <div className="mt-8 animate-fade-up sm:mt-10">
            <InstructorOpsMetrics data={ops} />
          </div>
        ) : null}

        {data?.latestRecovery ? (
          <section
            className="mt-8 animate-fade-up sm:mt-10"
            aria-labelledby="recovery-index-title"
          >
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2 sm:mb-4">
              <h2
                id="recovery-index-title"
                className="text-base font-semibold tracking-[-0.03em] sm:text-xl"
                style={{ color: NAVY }}
              >
                直近の回復指数
              </h2>
              <Link
                href={`/clients/${encodeURIComponent(data.latestRecovery.clientId)}`}
                className="text-[12px] font-medium sm:text-[13px]"
                style={{ color: GOLD }}
              >
                {data.latestRecovery.clientName} ·{" "}
                {data.latestRecovery.analysisDate}
              </Link>
            </div>
            <RecoveryIndexCard value={data.latestRecovery.recovery} compact />
          </section>
        ) : null}

        {showDemoBanner ? (
          <section
            className="mt-6 rounded-3xl border bg-[#faf7f1] px-5 py-5 sm:mt-8 sm:px-6"
            style={{ borderColor: "rgba(138,106,45,0.25)" }}
            aria-label="デモ体験"
          >
            <p
              className="text-[10px] font-semibold tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              DEMO MODE
            </p>
            <p className="mt-2 text-[15px] font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
              約30秒で全体像を体験
            </p>
            <p className="mt-1 text-[13px] leading-6" style={{ color: MUTED }}>
              データ収集から改善レポートまで、1クリックずつ進められます。
            </p>
            <Link
              href="/demo"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white transition active:opacity-90"
              style={{ backgroundColor: NAVY }}
            >
              デモダッシュボードを開く
            </Link>
          </section>
        ) : null}

        {!data ? (
          <div
            className="mt-10 space-y-3 sm:mt-16 sm:space-y-4"
            aria-busy="true"
            aria-label="読み込み中"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-3xl bg-slate-100 sm:h-28"
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 space-y-10 sm:mt-16 sm:space-y-16">
            {/* 今日やること */}
            <section aria-labelledby="today-todos-title">
              <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6 sm:gap-4">
                <h2
                  id="today-todos-title"
                  className="text-base font-semibold tracking-[-0.03em] sm:text-xl"
                  style={{ color: NAVY }}
                >
                  今日やること
                </h2>
                <span
                  className="shrink-0 text-[13px] tabular-nums"
                  style={{ color: MUTED }}
                >
                  {TODAY_TODO_SECTIONS.reduce(
                    (sum, section) => sum + data.todayTodos[section.key].length,
                    0,
                  )}
                  件
                </span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {TODAY_TODO_SECTIONS.map((section) => {
                  const items = data.todayTodos[section.key];
                  return (
                    <article
                      key={section.kind}
                      className="rounded-3xl border bg-white px-4 py-4 sm:px-6 sm:py-5"
                      style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h3
                          className="text-[14px] font-semibold tracking-[-0.02em] sm:text-[15px]"
                          style={{ color: NAVY }}
                        >
                          {section.title}
                        </h3>
                        <span
                          className="text-[12px] tabular-nums"
                          style={{ color: MUTED }}
                        >
                          {items.length}
                        </span>
                      </div>
                      <TodayTodoList items={items} empty={section.empty} />
                    </article>
                  );
                })}
              </div>
            </section>

            {/* 今日の担当クライアント */}
            <section aria-labelledby="today-clients-title">
              <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6 sm:gap-4">
                <h2
                  id="today-clients-title"
                  className="text-base font-semibold tracking-[-0.03em] sm:text-xl"
                  style={{ color: NAVY }}
                >
                  今日の担当クライアント
                </h2>
                <span
                  className="shrink-0 text-[13px] tabular-nums"
                  style={{ color: MUTED }}
                >
                  {data.todayClients.length}名
                </span>
              </div>

              {data.todayClients.length === 0 ? (
                <div
                  className="rounded-3xl border px-5 py-10 text-center sm:px-6 sm:py-12"
                  style={{ borderColor: BORDER }}
                >
                  <p className="text-sm" style={{ color: MUTED }}>
                    担当クライアントはまだいません。新規登録から始めましょう。
                  </p>
                  <Link
                    href="/clients/new"
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[14px] font-semibold text-white transition hover:opacity-90 sm:w-auto sm:min-h-11"
                    style={{ backgroundColor: NAVY }}
                  >
                    新規クライアント登録
                  </Link>
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  {data.todayClients.map((client) => (
                    <li key={client.id}>
                      <Link
                        href={`/clients/${encodeURIComponent(client.id)}`}
                        className="block rounded-3xl border bg-white p-4 transition active:bg-slate-50 sm:p-6 sm:hover:-translate-y-0.5 sm:active:bg-white"
                        style={{
                          borderColor: BORDER,
                          boxShadow: CARD_SHADOW,
                        }}
                      >
                        <p
                          className="text-[16px] font-semibold tracking-[-0.02em]"
                          style={{ color: NAVY }}
                        >
                          {client.name}
                        </p>

                        <div className="mt-4 flex items-end justify-between gap-3 sm:mt-5">
                          <div>
                            <p
                              className="text-[11px] font-medium tracking-[0.12em]"
                              style={{ color: MUTED }}
                            >
                              睡眠スコア
                            </p>
                            <p
                              className="mt-1 text-[1.6rem] font-semibold tracking-[-0.04em] tabular-nums sm:text-[1.75rem]"
                              style={{ color: NAVY }}
                            >
                              {client.sleepScore ?? "—"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-[11px] font-medium tracking-[0.12em]"
                              style={{ color: MUTED }}
                            >
                              前回から
                            </p>
                            <p
                              className="mt-1 text-[15px] font-semibold tabular-nums"
                              style={{ color: deltaTone(client.scoreDelta) }}
                            >
                              {formatScoreDelta(client.scoreDelta)}
                            </p>
                          </div>
                        </div>

                        <div
                          className="mt-4 border-t pt-3.5 sm:mt-5 sm:pt-4"
                          style={{ borderColor: BORDER }}
                        >
                          <p
                            className="text-[11px] font-medium tracking-[0.12em]"
                            style={{ color: MUTED }}
                          >
                            次回フォロー日
                          </p>
                          <p
                            className="mt-1 text-[14px] font-medium"
                            style={{ color: NAVY }}
                          >
                            {formatFollowUpDate(client.nextFollowUpDate)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* クイックメニュー */}
            <section aria-labelledby="quick-menu-title">
              <h2
                id="quick-menu-title"
                className="mb-4 text-base font-semibold tracking-[-0.03em] sm:mb-6 sm:text-xl"
                style={{ color: NAVY }}
              >
                クイックメニュー
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                {data.quickLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className="inline-flex min-h-12 items-center rounded-2xl border px-4 py-3.5 text-[15px] font-medium tracking-[-0.02em] transition active:opacity-90 sm:min-h-0 sm:px-5 sm:py-4 sm:hover:bg-slate-50 sm:active:opacity-100"
                    style={
                      link.emphasize
                        ? {
                            borderColor: NAVY,
                            backgroundColor: NAVY,
                            color: "#FFFFFF",
                            boxShadow: CARD_SHADOW,
                          }
                        : {
                            borderColor: BORDER,
                            color: NAVY,
                            backgroundColor: "#FFFFFF",
                            boxShadow: CARD_SHADOW,
                          }
                    }
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>

            {/* 最近の活動 */}
            <section aria-labelledby="activity-title">
              <h2
                id="activity-title"
                className="mb-4 text-base font-semibold tracking-[-0.03em] sm:mb-6 sm:text-xl"
                style={{ color: NAVY }}
              >
                最近の活動
              </h2>
              <div
                className="rounded-3xl border bg-white px-4 py-1.5 sm:px-6 sm:py-2"
                style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
              >
                {data.recentActivity.length === 0 ? (
                  <p className="py-8 text-center text-sm" style={{ color: MUTED }}>
                    最近の活動はまだありません。
                  </p>
                ) : (
                  <ul className="divide-y" style={{ borderColor: BORDER }}>
                    {data.recentActivity.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:gap-4 sm:py-4"
                        style={{ borderColor: BORDER }}
                      >
                        <span
                          className="shrink-0 text-[12px] sm:w-14 sm:text-[13px]"
                          style={{ color: MUTED }}
                        >
                          {item.whenLabel}
                        </span>
                        <span
                          className="min-w-0 flex-1 break-words text-[14px] font-medium tracking-[-0.02em] sm:text-[15px]"
                          style={{ color: NAVY }}
                        >
                          {item.summary}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* 今週の予定 */}
            <section aria-labelledby="week-plan-title">
              <h2
                id="week-plan-title"
                className="mb-4 text-base font-semibold tracking-[-0.03em] sm:mb-6 sm:text-xl"
                style={{ color: NAVY }}
              >
                今週の予定
              </h2>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
                {[
                  {
                    label: "フォロー予定",
                    value: data.weekPlan.followUpCount,
                    unit: "人",
                  },
                  {
                    label: "未分析",
                    value: data.weekPlan.unanalyzedCount,
                    unit: "人",
                  },
                  {
                    label: "宿題提出待ち",
                    value: data.weekPlan.homeworkPendingCount,
                    unit: "件",
                  },
                ].map((tile) => (
                  <article
                    key={tile.label}
                    className="min-w-[9.5rem] shrink-0 rounded-3xl border bg-white px-4 py-5 text-center sm:min-w-0 sm:px-4 sm:py-6"
                    style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
                  >
                    <p
                      className="text-[11px] font-medium tracking-[0.06em] sm:text-[12px]"
                      style={{ color: MUTED }}
                    >
                      {tile.label}
                    </p>
                    <p
                      className="mt-2 text-[1.75rem] font-semibold tracking-[-0.04em] tabular-nums sm:mt-3 sm:text-[2rem]"
                      style={{ color: NAVY }}
                    >
                      {tile.value}
                      <span className="ml-1 text-[13px] font-medium tracking-normal">
                        {tile.unit}
                      </span>
                    </p>
                  </article>
                ))}
              </div>
            </section>

            {/* Platform Information */}
            <footer
              className="border-t pt-8 text-center sm:pt-10"
              style={{ borderColor: BORDER }}
            >
              <p
                className="text-[11px] font-semibold tracking-[0.2em]"
                style={{ color: MUTED }}
              >
                Platform Information
              </p>
              <p className="mt-3 text-[14px] font-medium" style={{ color: NAVY }}>
                Version 1.0 Beta
              </p>
              <p className="mt-2 text-[13px]" style={{ color: MUTED }}>
                © Sleep Wellness Institute Japan
              </p>
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}
