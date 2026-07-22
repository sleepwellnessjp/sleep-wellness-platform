"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import {
  formatProgramDate,
  getProgramListItems,
  PROGRAM_FILTER_OPTIONS,
  PROGRAM_STATUS_LABELS,
  statusBadgeStyle,
  type ProgramListItem,
  type ProgramStatus,
} from "@/lib/repositories/program-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

type FilterValue = "all" | ProgramStatus;

export default function ProgramsPage() {
  const [items, setItems] = useState<ProgramListItem[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const next = await getProgramListItems();
        if (!cancelled) setItems(next);
      } catch (error) {
        console.error("[programs] getProgramListItems failed:", error);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void refresh();

    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    window.addEventListener("swij-programs-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
      window.removeEventListener("swij-programs-updated", onUpdate);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter = filter === "all" || item.status === filter;
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;
      return item.name.toLowerCase().includes(normalizedQuery);
    });
  }, [items, query, filter]);

  const counts = useMemo(() => {
    const base: Record<FilterValue, number> = {
      all: items.length,
      active: 0,
      follow_up: 0,
      completed: 0,
      not_created: 0,
    };
    for (const item of items) {
      base[item.status] += 1;
    }
    return base;
  }, [items]);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="PROGRAMS" />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
        <header className="mx-auto max-w-2xl text-center">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            IMPROVEMENT PROGRAMS
          </p>
          <h1
            className="mt-4 text-[1.85rem] font-semibold tracking-[-0.05em] sm:mt-5 sm:text-4xl lg:text-5xl"
            style={{ color: NAVY }}
          >
            改善プログラム
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
            クライアントごとの睡眠改善プログラムの進捗とフォロー予定を
            一覧で確認できます。
          </p>
        </header>

        <section className="mt-10 rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:mt-12 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="block w-full lg:max-w-md">
              <span className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">
                検索
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="氏名で検索"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:text-base"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {PROGRAM_FILTER_OPTIONS.map((option) => {
                const active = filter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition sm:text-sm ${
                      active
                        ? "text-white"
                        : "border border-slate-200 bg-[#fafaf8] text-slate-600 hover:bg-white"
                    }`}
                    style={active ? { backgroundColor: NAVY } : undefined}
                    aria-pressed={active}
                  >
                    {option.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                        active ? "bg-white/15 text-white" : "bg-white text-slate-500"
                      }`}
                    >
                      {counts[option.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-8 space-y-3 sm:mt-10">
          {!ready ? (
            <ListSkeleton rows={4} />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              illustration="journey"
              title={
                items.length === 0
                  ? "表示できるクライアントがありません"
                  : "条件に一致するプログラムがありません"
              }
              description={
                items.length === 0
                  ? "クライアントを登録すると、ここに改善プログラムが表示されます。"
                  : "検索条件やフィルターを変更してください。"
              }
              primaryAction={
                items.length === 0
                  ? { label: "クライアント一覧へ", href: "/clients" }
                  : undefined
              }
            />
          ) : (
            filteredItems.map((item) => {
              const badge = statusBadgeStyle(item.status);
              return (
                <article
                  key={item.clientId}
                  className="group flex flex-col gap-5 rounded-[24px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-42px_rgba(15,23,42,0.32)] sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2
                        className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                        style={{ color: NAVY }}
                      >
                        {item.name}
                      </h2>
                      <span
                        className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          color: badge.color,
                          backgroundColor: badge.bg,
                          borderColor: badge.border,
                        }}
                      >
                        {PROGRAM_STATUS_LABELS[item.status]}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      <MetricCell
                        label="最新睡眠スコア"
                        value={
                          item.latestSleepScore != null
                            ? String(item.latestSleepScore)
                            : "—"
                        }
                        large
                      />
                      <MetricCell
                        label="開始日"
                        value={formatProgramDate(item.startDate)}
                      />
                      <MetricCell label="現在のフェーズ" value={item.currentPhase} />
                      <MetricCell
                        label="次回フォロー日"
                        value={formatProgramDate(item.nextFollowUpDate)}
                      />
                      <MetricCell
                        label="進捗状況"
                        value={item.progressLabel}
                        className="sm:col-span-2 lg:col-span-2"
                      />
                    </div>
                  </div>

                  <Link
                    href={`/programs/${item.clientId}`}
                    className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full px-7 py-3.5 text-[15px] font-semibold text-white transition duration-300 group-hover:-translate-y-0.5 sm:text-sm"
                    style={{ backgroundColor: NAVY }}
                  >
                    プログラムを見る
                  </Link>
                </article>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

function MetricCell({
  label,
  value,
  large,
  className,
}: {
  label: string;
  value: string;
  large?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-[#fafaf8] px-4 py-3 ${className ?? ""}`}
    >
      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 sm:tracking-[0.16em]">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold tracking-[-0.03em] ${
          large ? "text-2xl tracking-[-0.04em]" : "text-[15px] sm:text-base"
        }`}
        style={{ color: NAVY }}
      >
        {value}
      </p>
    </div>
  );
}
