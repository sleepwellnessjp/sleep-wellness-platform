"use client";

import Link from "next/link";
import { useEffect } from "react";
import DemoFlowNav from "@/components/demo/DemoFlowNav";
import DemoShell from "@/components/demo/DemoShell";
import { DemoStartButton } from "@/components/demo/DemoFlowControls";
import {
  BORDER,
  CARD_SHADOW,
  MUTED,
  NAVY,
  SUCCESS,
  TEAL,
} from "@/components/ui/tokens";
import { enableDemoSession } from "@/lib/auth/demo-session";
import { getDemoDashboardSnapshot } from "@/lib/demo-mode/sample-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const snapshot = getDemoDashboardSnapshot();

export default function DemoDashboardPage() {
  useEffect(() => {
    enableDemoSession();
  }, []);

  const canOpenLiveDemo = !isSupabaseConfigured();

  return (
    <DemoShell
      eyebrow="DEMO DASHBOARD"
      title="デモで全体像を体験"
      subtitle="サンプル認定講師・クライアント12名のデータで、収集から改善レポートまでの流れを約30秒で把握できます。実データには一切触れません。"
    >
      {/* Instructor */}
      <section
        className="rounded-3xl border bg-white p-5 sm:p-7"
        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
        aria-labelledby="demo-instructor-title"
      >
        <p
          className="text-[11px] font-medium tracking-[0.12em]"
          style={{ color: MUTED }}
        >
          サンプル認定講師
        </p>
        <h2
          id="demo-instructor-title"
          className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] sm:text-2xl"
          style={{ color: NAVY }}
        >
          {snapshot.instructor.name}
        </h2>
        <p className="mt-1 text-[14px]" style={{ color: MUTED }}>
          {snapshot.instructor.title} · {snapshot.instructor.specialty}
        </p>
        <p className="mt-3 text-[13px]" style={{ color: MUTED }}>
          {snapshot.instructor.region} · 担当クライアント{" "}
          <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
            {snapshot.clientCount}名
          </span>
        </p>
      </section>

      {/* KPI strip */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4 sm:gap-4">
        {[
          { label: "平均睡眠スコア", value: String(snapshot.averageSleepScore) },
          { label: "分析済み", value: `${snapshot.analyzedCount}名` },
          { label: "今週フォロー", value: `${snapshot.followUpDueCount}件` },
          { label: "宿題アクティブ", value: `${snapshot.homeworkActiveCount}件` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border bg-white px-4 py-4 sm:px-5 sm:py-5"
            style={{ borderColor: BORDER }}
          >
            <p
              className="text-[11px] font-medium tracking-[0.08em]"
              style={{ color: MUTED }}
            >
              {item.label}
            </p>
            <p
              className="mt-2 text-xl font-semibold tabular-nums tracking-[-0.03em] sm:text-2xl"
              style={{ color: NAVY }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="mt-8 rounded-3xl border bg-[#faf7f1] px-5 py-7 text-center sm:mt-10 sm:px-8 sm:py-9"
        style={{ borderColor: "rgba(138,106,45,0.25)" }}
      >
        <p className="text-[15px] font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
          ワンクリックでフロー体験
        </p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-6" style={{ color: MUTED }}>
          データ収集 → 睡眠分析 → AI提案 → Homework → Journey → Follow Up → 改善レポート
        </p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <DemoStartButton />
          {canOpenLiveDemo ? (
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-full border bg-white px-6 text-[14px] font-semibold transition active:opacity-80"
              style={{ borderColor: BORDER, color: NAVY }}
            >
              講師画面を開く
            </Link>
          ) : null}
        </div>
      </section>

      {/* Flow steps */}
      <section className="mt-10 sm:mt-12" aria-labelledby="demo-flow-title">
        <h2
          id="demo-flow-title"
          className="text-base font-semibold tracking-[-0.03em] sm:text-lg"
          style={{ color: NAVY }}
        >
          デモ体験の流れ
        </h2>
        <p className="mt-2 text-[13px] leading-6" style={{ color: MUTED }}>
          各ステップを1クリックで順番に体験できます。
        </p>
        <div className="mt-5">
          <DemoFlowNav />
        </div>
      </section>

      {/* Clients */}
      <section className="mt-10 sm:mt-12" aria-labelledby="demo-clients-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2
            id="demo-clients-title"
            className="text-base font-semibold tracking-[-0.03em] sm:text-lg"
            style={{ color: NAVY }}
          >
            サンプルクライアント
          </h2>
          <span className="text-[13px] tabular-nums" style={{ color: MUTED }}>
            {snapshot.clientCount}名
          </span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {snapshot.clients.map((client) => (
            <li
              key={client.id}
              className="rounded-2xl border bg-white px-4 py-4"
              style={{ borderColor: BORDER }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[15px] font-semibold" style={{ color: NAVY }}>
                    {client.name}
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
                    {client.age}歳 · Journey {client.journeyProgress}%
                  </p>
                </div>
                <p
                  className="text-lg font-semibold tabular-nums"
                  style={{
                    color: client.sleepScore != null ? TEAL : MUTED,
                  }}
                >
                  {client.sleepScore ?? "—"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Sample modules snapshot */}
      <section className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2">
        <div
          className="rounded-3xl border bg-white p-5"
          style={{ borderColor: BORDER }}
        >
          <p className="text-[11px] font-medium tracking-[0.1em]" style={{ color: MUTED }}>
            サンプル AI 分析
          </p>
          <ul className="mt-3 space-y-2">
            {snapshot.aiHighlights.map((item) => (
              <li key={item} className="text-[13px] leading-6" style={{ color: NAVY }}>
                · {item}
              </li>
            ))}
          </ul>
        </div>
        <div
          className="rounded-3xl border bg-white p-5"
          style={{ borderColor: BORDER }}
        >
          <p className="text-[11px] font-medium tracking-[0.1em]" style={{ color: MUTED }}>
            最近のデモ活動
          </p>
          <ul className="mt-3 space-y-3">
            {snapshot.recentActivity.map((item) => (
              <li key={item.id} className="text-[13px] leading-5">
                <span style={{ color: MUTED }}>{item.whenLabel}</span>
                <span className="mt-0.5 block" style={{ color: NAVY }}>
                  {item.summary}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div
          className="rounded-3xl border bg-white p-5"
          style={{ borderColor: BORDER }}
        >
          <p className="text-[11px] font-medium tracking-[0.1em]" style={{ color: MUTED }}>
            Homework / Follow Up
          </p>
          <p className="mt-3 text-[13px] leading-6" style={{ color: NAVY }}>
            宿題アクティブ{" "}
            <span className="font-semibold tabular-nums">
              {snapshot.homeworkActiveCount}
            </span>
            件 · フォロー予定{" "}
            <span className="font-semibold tabular-nums">
              {snapshot.followUpDueCount}
            </span>
            件 · Journey 進行中{" "}
            <span className="font-semibold tabular-nums">
              {snapshot.journeyInProgressCount}
            </span>
            名
          </p>
        </div>
        <div
          className="rounded-3xl border bg-white p-5"
          style={{ borderColor: BORDER }}
        >
          <p className="text-[11px] font-medium tracking-[0.1em]" style={{ color: MUTED }}>
            サンプルレポート
          </p>
          <ul className="mt-3 space-y-2">
            {snapshot.sampleReports.slice(0, 3).map((report) => (
              <li
                key={report.clientName}
                className="flex items-center justify-between gap-2 text-[13px]"
              >
                <span style={{ color: NAVY }}>{report.clientName}</span>
                <span className="tabular-nums" style={{ color: SUCCESS }}>
                  {report.sleepScore}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="mt-10 text-center text-[12px] leading-6" style={{ color: MUTED }}>
        このデモはサンプルデータのみを表示します。ログイン後の本番データとは分離されています。
      </p>
    </DemoShell>
  );
}
