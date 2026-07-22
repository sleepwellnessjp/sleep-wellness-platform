"use client";

import { useMemo, useState } from "react";
import {
  applySuggestionToMenuItems,
  buildImprovementSuggestions,
  isSuggestionAppliedToMenu,
  type ImprovementPriority,
  type ImprovementSuggestion,
} from "@/lib/improvement-suggestions";
import { formatImprovementStars } from "@/lib/improvement-priority";
import type { StoredAnalysis } from "@/lib/client-store";
import {
  createCustomMenuItem,
  formatProgramDate,
  type ProgramMenuItem,
} from "@/lib/repositories/program-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

const PRIORITY_STYLE: Record<
  ImprovementPriority,
  { color: string; bg: string; border: string }
> = {
  今すぐ改善: {
    color: "#a33a3a",
    bg: "rgba(163, 58, 58, 0.08)",
    border: "rgba(163, 58, 58, 0.22)",
  },
  今週改善: {
    color: "#b45a1a",
    bg: "rgba(180, 90, 26, 0.08)",
    border: "rgba(180, 90, 26, 0.24)",
  },
  余裕があれば: {
    color: "#315f68",
    bg: "rgba(49, 95, 104, 0.08)",
    border: "rgba(49, 95, 104, 0.2)",
  },
};

function SuggestionCard({
  suggestion,
  applied,
  onAdd,
}: {
  suggestion: ImprovementSuggestion;
  applied: boolean;
  onAdd: () => void;
}) {
  const priorityStyle = PRIORITY_STYLE[suggestion.priority];

  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)] backdrop-blur-sm transition duration-300 hover:shadow-[0_28px_60px_-36px_rgba(15,23,42,0.28)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-[#fafaf8] opacity-90" />
      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold tracking-[0.2em]"
              style={{ color: GOLD }}
            >
              {suggestion.metricKey.toUpperCase()}
            </p>
            <h3
              className="mt-1 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
              style={{ color: NAVY }}
            >
              {suggestion.title}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
              style={{
                color: priorityStyle.color,
                backgroundColor: priorityStyle.bg,
                borderColor: priorityStyle.border,
              }}
            >
              <span className="mr-1.5 tracking-[0.06em]" aria-hidden>
                {formatImprovementStars(suggestion.stars)}
              </span>
              {suggestion.priority}
            </span>
            <span className="rounded-full bg-[#071426]/5 px-3 py-1 text-[13px] font-semibold tracking-[-0.02em] text-[#071426]">
              {suggestion.currentValue}
            </span>
          </div>
        </div>

        <dl className="mt-5 space-y-4">
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
              改善理由
            </dt>
            <dd className="mt-1.5 text-[15px] leading-7 text-slate-600 sm:text-sm sm:leading-6">
              {suggestion.reason}
            </dd>
          </div>

          <div>
            <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
              おすすめ改善方法
            </dt>
            <dd className="mt-2">
              <ul className="space-y-2">
                {suggestion.recommendedMethods.map((method) => (
                  <li
                    key={method}
                    className="flex gap-2.5 text-[15px] leading-6 text-slate-600 sm:text-sm"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: GOLD }}
                      aria-hidden
                    />
                    <span>{method}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>

          <div>
            <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
              期待される改善
            </dt>
            <dd className="mt-1.5 rounded-2xl border border-[#315f68]/12 bg-[#f4f7f7] px-4 py-3 text-[14px] leading-6 text-[#315f68] sm:text-sm">
              {suggestion.expectedImprovement}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onAdd}
          disabled={applied}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-white px-5 text-[15px] font-semibold tracking-[-0.02em] text-[#071426] shadow-[0_8px_24px_-16px_rgba(15,23,42,0.25)] transition duration-300 hover:-translate-y-0.5 hover:border-[#315f68]/30 hover:bg-[#fafaf8] disabled:translate-y-0 disabled:cursor-default disabled:opacity-60 sm:w-auto sm:min-w-[220px] sm:text-sm"
        >
          {applied ? (
            <>
              <span className="text-[#0f6b5c]">✓</span>
              改善メニューに追加済み
            </>
          ) : (
            <>改善プログラムへ追加</>
          )}
        </button>
      </div>
    </article>
  );
}

export default function ImprovementSuggestionCards({
  analysis,
  analysisDate,
  menuItems,
  onMenuItemsChange,
}: {
  analysis: StoredAnalysis | null;
  analysisDate: string | null;
  menuItems: ProgramMenuItem[];
  onMenuItemsChange: (items: ProgramMenuItem[]) => void;
}) {
  const suggestions = useMemo(
    () => buildImprovementSuggestions(analysis),
    [analysis],
  );
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const handleAdd = (suggestion: ImprovementSuggestion) => {
    const updated = applySuggestionToMenuItems(
      menuItems,
      suggestion,
      createCustomMenuItem,
    );
    onMenuItemsChange(updated);
    setAddedIds((current) => new Set(current).add(suggestion.id));
  };

  const isApplied = (suggestion: ImprovementSuggestion) =>
    addedIds.has(suggestion.id) ||
    isSuggestionAppliedToMenu(menuItems, suggestion);

  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-white to-[#fafaf8] px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8">
      <div className="mb-6 border-b border-slate-100 pb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2
              className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
              style={{ color: NAVY }}
            >
              AI改善提案
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-500 sm:text-sm">
              効果が高い順に最大5件。すべてを一度に変える必要はありません。カードから改善メニューへ追加できます。
            </p>
          </div>
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            AI SUGGESTIONS
          </p>
        </div>
        {analysisDate && (
          <p className="mt-3 text-[13px] text-slate-400">
            分析日: {formatProgramDate(analysisDate)}
          </p>
        )}
      </div>

      {!analysis ? (
        <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center">
          <p className="text-[15px] font-medium text-slate-500">
            分析データがありません
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            睡眠分析を実施すると、ここに改善提案が表示されます。
          </p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-[22px] border border-[#0f6b5c]/15 bg-[#0f6b5c]/5 px-6 py-12 text-center">
          <p
            className="text-[15px] font-semibold"
            style={{ color: "#0f6b5c" }}
          >
            現時点では重点的な改善項目はありません
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            睡眠スコア・睡眠時間・深睡眠・睡眠効率・中途覚醒・HRV・SpO₂
            はいずれも良好な範囲です。現在の習慣を維持しましょう。
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              applied={isApplied(suggestion)}
              onAdd={() => handleAdd(suggestion)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
