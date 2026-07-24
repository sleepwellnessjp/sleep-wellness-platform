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
      className="min-w-0 rounded-3xl border bg-white p-4 sm:p-6"
      style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            REPORT
          </p>
          <h2
            className="mt-2 break-words text-base font-semibold tracking-[-0.03em] sm:text-lg"
            style={{ color: NAVY }}
          >
            {report.clientName}
          </h2>
          <p className="mt-1 break-words text-[13px] leading-5 sm:text-[14px] sm:leading-normal" style={{ color: MUTED }}>
            {report.title} · {formatReportDate(report.createdAt)}
          </p>
        </div>
        <span
          className="inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.04em]"
          style={{
            color: statusTone(report.status),
            backgroundColor: `${statusTone(report.status)}14`,
          }}
        >
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.08em]" style={{ color: MUTED }}>
            Sleep Score
          </p>
          <p
            className="mt-1 text-[1.65rem] font-semibold tabular-nums tracking-[-0.04em] sm:text-2xl"
            style={{ color: NAVY }}
          >
            {report.sleepScore ?? "—"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link
            href={`/journey?clientId=${encodeURIComponent(report.clientId)}`}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border px-3.5 py-2.5 text-[13px] font-semibold transition active:bg-slate-50 sm:min-h-0 sm:w-auto sm:py-2 sm:text-[12px] sm:hover:bg-slate-50 sm:active:bg-transparent"
            style={{ borderColor: BORDER, color: NAVY }}
          >
            Journey
          </Link>
          <Link
            href={report.href}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold text-white transition active:opacity-90 sm:min-h-0 sm:w-auto sm:py-2 sm:text-[12px] sm:hover:opacity-90 sm:active:opacity-100"
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
      <main className="min-h-screen overflow-x-hidden" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="REPORT" />
        <div
          className="mx-auto max-w-3xl space-y-3 px-4 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] sm:space-y-4 sm:px-10 sm:py-16 sm:pb-16"
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
      <main className="min-h-screen overflow-x-hidden" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="REPORT" />
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-0">
          <ErrorState
            title="レポートを表示できません"
            message={loadError || "しばらくしてから再度お試しください。"}
            kind="supabase"
          />
        </div>
      </main>
    );
  }

  const filteredReports = data.reports.filter(
    (report) => filter === "all" || report.status === filter,
  );

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ backgroundColor: SURFACE, color: NAVY }}>
      <InstructorNav eyebrow="REPORT" />

      <div className="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-16 sm:pb-16 lg:py-20 lg:pb-20">
        <header className="min-w-0 animate-fade-up">
          <p
            className="text-[10px] font-semibold tracking-[0.22em] sm:text-[11px] sm:tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            REPORT
          </p>
          <h1
            className="mt-2 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.04em] sm:mt-3 sm:text-[2.35rem] sm:leading-normal"
            style={{ color: NAVY }}
          >
            レポート一覧
          </h1>
          <p className="mt-2 text-[14px] leading-6 sm:mt-3 sm:text-[15px] sm:leading-7" style={{ color: MUTED }}>
            {data.instructorDisplayName}
            先生の担当クライアント向けレポートです。同じクライアントデータで
            Journey・Homework・詳細へ移動できます。
          </p>
        </header>

        <div className="mt-6 flex flex-wrap gap-2 sm:mt-8">
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
                className="inline-flex min-h-11 items-center rounded-2xl px-3.5 py-2 text-[13px] font-semibold transition active:opacity-90 sm:min-h-0 sm:text-[12px] sm:active:opacity-100"
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

        <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
          {filteredReports.length === 0 ? (
            <div
              className="rounded-3xl border px-4 py-10 text-center sm:px-6 sm:py-12"
              style={{ borderColor: BORDER, backgroundColor: "#fff" }}
            >
              <p className="text-[14px] leading-6 sm:text-[15px]" style={{ color: MUTED }}>
                該当するレポートがありません。睡眠分析を実行するとここに表示されます。
              </p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
