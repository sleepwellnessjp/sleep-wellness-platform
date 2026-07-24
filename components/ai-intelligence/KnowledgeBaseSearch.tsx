"use client";

import { useState, type FormEvent } from "react";
import AiSourceBadge from "@/components/ai-intelligence/AiSourceBadge";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  AI_INTELLIGENCE_ROUTES,
  KNOWLEDGE_CATEGORY_LABELS,
  type KnowledgeBaseAnswer,
} from "@/lib/ai-intelligence";

const SUGGESTIONS = [
  "メラトニンヨガ",
  "睡眠効率",
  "認定講師カウンセリング",
  "HRV",
  "季節変動",
] as const;

export default function KnowledgeBaseSearch({
  initialAnswer = null,
}: {
  initialAnswer?: KnowledgeBaseAnswer | null;
}) {
  const [query, setQuery] = useState(initialAnswer?.query ?? "メラトニンヨガ");
  const [answer, setAnswer] = useState<KnowledgeBaseAnswer | null>(
    initialAnswer,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(nextQuery: string) {
    const q = nextQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(AI_INTELLIGENCE_ROUTES.api.knowledge, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = (await res.json()) as {
        answer?: KnowledgeBaseAnswer;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "検索に失敗しました");
      setAnswer(json.answer ?? null);
      setQuery(q);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "検索に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={onSubmit}
        className="rounded-[22px] border border-[#8a6a2d]/22 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-4 py-5 sm:px-6"
      >
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          KNOWLEDGE BASE
        </p>
        <h3
          className="mt-1.5 text-[1.1rem] font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          Sleep Wellness ナレッジ検索
        </h3>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          Method / メラトニンヨガ™ / 睡眠科学 / 認定テキスト / 研究論文
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="キーワードを入力"
            className="min-h-11 flex-1 rounded-2xl border border-[#071426]/12 bg-white px-4 text-[14px] outline-none focus:border-[#8a6a2d]/50"
            style={{ color: NAVY }}
            aria-label="ナレッジ検索"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: NAVY }}
          >
            {loading ? "検索中…" : "検索"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void runSearch(s)}
              className="rounded-full border border-[#8a6a2d]/25 bg-white px-3 py-1.5 text-[12px] font-medium"
              style={{ color: GOLD }}
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {error ? (
        <p className="text-[14px] text-[#a33a3a]" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !answer ? <SoftSkeleton variant="card" /> : null}

      {answer ? (
        <div className="rounded-[22px] border border-[#071426]/08 bg-white px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
            AI 回答
          </p>
          <p className="mt-2 text-[14px] leading-7 text-slate-700">
            {answer.answer}
          </p>

          <ul className="mt-6 space-y-3">
            {answer.results.map((hit) => (
              <li
                key={hit.id}
                className="rounded-2xl border border-[#071426]/06 bg-[#fafaf8] px-4 py-3.5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold" style={{ color: NAVY }}>
                    {hit.title}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    関連度 {Math.round(hit.relevance * 100)}%
                  </p>
                </div>
                <p
                  className="mt-1 text-[11px] font-semibold tracking-[0.1em]"
                  style={{ color: GOLD }}
                >
                  {KNOWLEDGE_CATEGORY_LABELS[hit.category]}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-slate-600">
                  {hit.snippet}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <AiSourceBadge source={answer.source} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
