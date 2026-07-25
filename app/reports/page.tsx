"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  formatAnalysisDate,
  formatImprovementRate,
  getAnalysisListPageData,
  sortAnalysisListItems,
  type AnalysisListItem,
  type AnalysisListPageData,
  type AnalysisListSort,
} from "@/lib/analysis-list";

function AnalysisCard({ item }: { item: AnalysisListItem }) {
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
            ANALYSIS
          </p>
          <h2
            className="mt-2 break-words text-base font-semibold tracking-[-0.03em] sm:text-lg"
            style={{ color: NAVY }}
          >
            {item.clientName}
          </h2>
          <p
            className="mt-1 break-words text-[13px] leading-5 sm:text-[14px] sm:leading-normal"
            style={{ color: MUTED }}
          >
            睡眠分析 · {formatAnalysisDate(item.analysisDate)}
          </p>
        </div>
        <span
          className="inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.04em]"
          style={{
            color: TEAL,
            backgroundColor: `${TEAL}14`,
          }}
        >
          分析済み
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex gap-6 sm:gap-8">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.08em]" style={{ color: MUTED }}>
              Sleep Score
            </p>
            <p
              className="mt-1 text-[1.65rem] font-semibold tabular-nums tracking-[-0.04em] sm:text-2xl"
              style={{ color: NAVY }}
            >
              {item.sleepScore ?? "—"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.08em]" style={{ color: MUTED }}>
              改善率
            </p>
            <p
              className="mt-1 text-[1.65rem] font-semibold tabular-nums tracking-[-0.04em] sm:text-2xl"
              style={{ color: NAVY }}
            >
              {formatImprovementRate(item.improvementRate)}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link
            href={`/journey?clientId=${encodeURIComponent(item.clientId)}`}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border px-3.5 py-2.5 text-[13px] font-semibold transition active:bg-slate-50 sm:min-h-0 sm:w-auto sm:py-2 sm:text-[12px] sm:hover:bg-slate-50 sm:active:bg-transparent"
            style={{ borderColor: BORDER, color: NAVY }}
          >
            Journey
          </Link>
          <Link
            href={item.href}
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

const SORT_OPTIONS: Array<{ value: AnalysisListSort; label: string }> = [
  { value: "date", label: "日付順" },
  { value: "score", label: "スコア順" },
  { value: "improvement", label: "改善率順" },
];

export default function ReportsPage() {
  const [data, setData] = useState<AnalysisListPageData | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sort, setSort] = useState<AnalysisListSort>("date");

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError(null);

    void (async () => {
      try {
        const next = await getAnalysisListPageData();
        if (!cancelled) setData(next);
      } catch (error) {
        console.error("[reports] getAnalysisListPageData failed:", error);
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

  const sortedAnalyses = useMemo(
    () => (data ? sortAnalysisListItems(data.analyses, sort) : []),
    [data, sort],
  );

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
            title="睡眠分析を表示できません"
            message={loadError || "しばらくしてから再度お試しください。"}
            kind="supabase"
          />
        </div>
      </main>
    );
  }

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
            睡眠分析一覧
          </h1>
          <p className="mt-2 text-[14px] leading-6 sm:mt-3 sm:text-[15px] sm:leading-7" style={{ color: MUTED }}>
            {data.instructorDisplayName}
            先生の担当クライアントの睡眠分析です。日付・スコア・改善率で並べ替えできます。
          </p>
        </header>

        <div className="mt-6 flex flex-wrap gap-2 sm:mt-8" role="group" aria-label="並び替え">
          {SORT_OPTIONS.map((option) => {
            const active = sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
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
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
          {sortedAnalyses.length === 0 ? (
            <div
              className="rounded-3xl border px-4 py-10 text-center sm:px-6 sm:py-12"
              style={{ borderColor: BORDER, backgroundColor: "#fff" }}
            >
              <p className="text-[14px] leading-6 sm:text-[15px]" style={{ color: MUTED }}>
                睡眠分析はまだありません。分析を実行するとここに表示されます。
              </p>
              <Link
                href="/analysis/new"
                className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-[14px] font-semibold text-white transition active:opacity-90"
                style={{ backgroundColor: NAVY }}
              >
                新しい分析を始める
              </Link>
            </div>
          ) : (
            sortedAnalyses.map((item) => (
              <AnalysisCard key={item.id} item={item} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
