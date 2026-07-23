"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import ErrorState from "@/components/ui/ErrorState";
import {
  BORDER,
  CARD_SHADOW,
  GOLD,
  MUTED,
  NAVY,
  SURFACE,
  SURFACE_WARM,
  TEAL,
} from "@/components/ui/tokens";
import { userMessageFromUnknown } from "@/lib/data-access-errors";
import {
  formatReportDate,
  getReportsPageData,
  REPORT_STATUS_LABELS,
  type ReportListItem,
  type ReportsPageData,
  type ReportStatus,
} from "@/lib/reports-list";

function statusTone(status: ReportStatus): string {
  if (status === "ready") return TEAL;
  if (status === "draft") return GOLD;
  return MUTED;
}

function ReportCard({ report }: { report: ReportListItem }) {
  return (
    <article
      className="rounded-3xl border bg-white p-5 sm:p-6"
      style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            REPORT
          </p>
          <h2
            className="mt-2 text-lg font-semibold tracking-[-0.03em]"
            style={{ color: NAVY }}
          >
            {report.clientName}
          </h2>
          <p className="mt-1 text-[14px]" style={{ color: MUTED }}>
            {report.title} · {formatReportDate(report.createdAt)}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.04em]"
          style={{
            color: statusTone(report.status),
            backgroundColor: `${statusTone(report.status)}14`,
          }}
        >
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.08em]" style={{ color: MUTED }}>
            Sleep Score
          </p>
          <p
            className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.04em]"
            style={{ color: NAVY }}
          >
            {report.sleepScore ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/journey?clientId=${encodeURIComponent(report.clientId)}`}
            className="rounded-2xl border px-3.5 py-2 text-[12px] font-semibold transition hover:bg-slate-50"
            style={{ borderColor: BORDER, color: NAVY }}
          >
            Journey
          </Link>
          <Link
            href={report.href}
            className="rounded-2xl px-3.5 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            開く
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsPageData | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | ReportStatus>("all");

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError(null);

    void (async () => {
      try {
        const next = await getReportsPageData();
        if (!cancelled) setData(next);
      } catch (error) {
        console.error("[reports] getReportsPageData failed:", error);
        if (!cancelled) {
          setData(null);
          setLoadError(userMessageFromUnknown(error));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="REPORT" />
        <div
          className="mx-auto max-w-3xl space-y-4 px-6 py-16 sm:px-10"
          aria-busy="true"
          aria-label="読み込み中"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="REPORT" />
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6">
          <ErrorState
            title="レポートを表示できません"
            message={loadError || "しばらくしてから再度お試しください。"}
            kind="supabase"
          />
        </div>
      </main>
    );
  }

  const filtered = data.reports.filter(
    (report) => filter === "all" || report.status === filter,
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE, color: NAVY }}>
      <InstructorNav eyebrow="REPORT" />

      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16 lg:py-20">
        <header className="animate-fade-up">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            REPORT
          </p>
          <h1
            className="mt-2 text-[1.85rem] font-semibold tracking-[-0.04em] sm:text-[2.35rem]"
            style={{ color: NAVY }}
          >
            レポート一覧
          </h1>
          <p className="mt-3 text-[15px] leading-7" style={{ color: MUTED }}>
            {data.instructorDisplayName}
            先生の担当クライアント向けレポートです。同じクライアントデータで
            Journey・Homework・詳細へ移動できます。
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-2">
          {(
            [
              ["all", "すべて"],
              ["ready", "発行済み"],
              ["draft", "下書き"],
              ["pending", "準備中"],
            ] as const
          ).map(([value, label]) => {
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className="rounded-2xl px-3.5 py-2 text-[12px] font-semibold transition"
                style={
                  active
                    ? { backgroundColor: NAVY, color: "#fff" }
                    : {
                        backgroundColor: SURFACE_WARM,
                        color: MUTED,
                        border: `1px solid ${BORDER}`,
                      }
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-8 space-y-4">
          {filtered.length === 0 ? (
            <div
              className="rounded-3xl border px-6 py-12 text-center"
              style={{ borderColor: BORDER, backgroundColor: "#fff" }}
            >
              <p className="text-[15px]" style={{ color: MUTED }}>
                該当するレポートがありません。睡眠分析を実行するとここに表示されます。
              </p>
            </div>
          ) : (
            filtered.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
