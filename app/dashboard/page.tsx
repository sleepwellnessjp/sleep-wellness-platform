"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import {
  BORDER,
  CARD_SHADOW,
  MUTED,
  NAVY,
  SUCCESS,
  SURFACE,
} from "@/components/ui/tokens";
import {
  formatFollowUpDate,
  formatScoreDelta,
  formatSenseiName,
  getInstructorDashboard,
  type InstructorDashboardData,
} from "@/lib/instructor-dashboard";

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

export default function InstructorDashboardPage() {
  const [data, setData] = useState<InstructorDashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await getInstructorDashboard();
      if (!cancelled) setData(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const senseiName = formatSenseiName(data?.instructorDisplayName ?? "");
  const greeting = greetingForNow();

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE, color: NAVY }}>
      <InstructorNav eyebrow="HOME" />

      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16 lg:py-20">
        {/* Greeting */}
        <header className="animate-fade-up">
          <h1
            className="text-[1.85rem] font-semibold tracking-[-0.04em] sm:text-[2.35rem]"
            style={{ color: NAVY }}
          >
            {greeting}、{data ? senseiName : "——先生"}
          </h1>
          <p className="mt-3 text-[15px] leading-7" style={{ color: MUTED }}>
            今日の担当クライアントと今週の予定を確認しましょう。
          </p>
        </header>

        {!data ? (
          <div className="mt-16 space-y-4" aria-busy="true" aria-label="読み込み中">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-3xl bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mt-14 space-y-14 sm:mt-16 sm:space-y-16">
            {/* 今日の担当クライアント */}
            <section aria-labelledby="today-clients-title">
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2
                  id="today-clients-title"
                  className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                  style={{ color: NAVY }}
                >
                  今日の担当クライアント
                </h2>
                <span className="text-[13px] tabular-nums" style={{ color: MUTED }}>
                  {data.todayClients.length}名
                </span>
              </div>

              {data.todayClients.length === 0 ? (
                <div
                  className="rounded-3xl border px-6 py-12 text-center"
                  style={{ borderColor: BORDER }}
                >
                  <p className="text-sm" style={{ color: MUTED }}>
                    担当クライアントはまだいません。新規登録から始めましょう。
                  </p>
                  <Link
                    href="/clients/new"
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-[14px] font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: NAVY }}
                  >
                    新規クライアント登録
                  </Link>
                </div>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {data.todayClients.map((client) => (
                    <li key={client.id}>
                      <Link
                        href={`/clients/${encodeURIComponent(client.id)}`}
                        className="block rounded-3xl border bg-white p-5 transition hover:-translate-y-0.5 sm:p-6"
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

                        <div className="mt-5 flex items-end justify-between gap-3">
                          <div>
                            <p
                              className="text-[11px] font-medium tracking-[0.12em]"
                              style={{ color: MUTED }}
                            >
                              睡眠スコア
                            </p>
                            <p
                              className="mt-1 text-[1.75rem] font-semibold tracking-[-0.04em] tabular-nums"
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
                          className="mt-5 border-t pt-4"
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
                className="mb-6 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                style={{ color: NAVY }}
              >
                クイックメニュー
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.quickLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className="rounded-2xl border px-5 py-4 text-[15px] font-medium tracking-[-0.02em] transition hover:bg-slate-50"
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
                className="mb-6 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                style={{ color: NAVY }}
              >
                最近の活動
              </h2>
              <div
                className="rounded-3xl border bg-white px-5 py-2 sm:px-6"
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
                        className="flex items-baseline gap-4 py-4"
                        style={{ borderColor: BORDER }}
                      >
                        <span
                          className="w-14 shrink-0 text-[13px]"
                          style={{ color: MUTED }}
                        >
                          {item.whenLabel}
                        </span>
                        <span
                          className="min-w-0 flex-1 text-[15px] font-medium tracking-[-0.02em]"
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
                className="mb-6 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                style={{ color: NAVY }}
              >
                今週の予定
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
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
                    className="rounded-3xl border bg-white px-5 py-6 text-center sm:px-4"
                    style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
                  >
                    <p
                      className="text-[12px] font-medium tracking-[0.06em]"
                      style={{ color: MUTED }}
                    >
                      {tile.label}
                    </p>
                    <p
                      className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] tabular-nums"
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
              className="border-t pt-10 text-center"
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
