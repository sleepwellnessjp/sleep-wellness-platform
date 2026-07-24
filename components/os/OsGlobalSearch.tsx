"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  OS_SEARCH_CATEGORY_LABELS,
  searchOsIndex,
  type OsSearchCategory,
  type OsSearchResult,
} from "@/lib/os/search";
import { GOLD, NAVY } from "@/components/ui/tokens";

const CATEGORIES: Array<OsSearchCategory | "all"> = [
  "all",
  "client",
  "instructor",
  "material",
  "video",
  "case",
  "event",
];

export default function OsGlobalSearch({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<OsSearchCategory | "all">("all");
  const [remote, setRemote] = useState<OsSearchResult[] | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category !== "all") params.set("category", category);
      void fetch(`/api/os/search?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((json: { results?: OsSearchResult[] } | null) => {
          setRemote(json?.results ?? null);
        })
        .catch(() => {
          // local fallback below
        });
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, category]);

  const results = useMemo(() => {
    if (remote) return remote;
    return searchOsIndex(query, {
      categories: category === "all" ? undefined : [category],
    });
  }, [remote, query, category]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-x-hidden bg-[#071426]/35 px-4 py-12 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] backdrop-blur-[2px] sm:py-24 sm:pb-24 sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="全画面検索"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_40px_100px_-48px_rgba(7,20,38,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            GLOBAL SEARCH
          </p>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="クライアント・講師・資料・動画・ケース・イベント"
            className="mt-3 min-h-12 w-full border-0 bg-transparent text-[16px] font-medium tracking-[-0.03em] outline-none placeholder:text-slate-300 sm:min-h-0 sm:text-[1.15rem]"
            style={{ color: NAVY }}
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain border-b border-slate-100 px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:px-6">
          {CATEGORIES.map((item) => {
            const active = category === item;
            const label =
              item === "all" ? "すべて" : OS_SEARCH_CATEGORY_LABELS[item];
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 py-2 text-[11px] font-semibold transition active:opacity-90 sm:min-h-0 sm:px-3 sm:py-1.5 sm:active:opacity-100 ${
                  active
                    ? "text-white"
                    : "bg-slate-50 text-slate-500 sm:hover:bg-slate-100"
                }`}
                style={active ? { backgroundColor: NAVY } : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>

        <ul className="max-h-[min(22rem,50vh)] overflow-y-auto py-2">
          {results.length === 0 ? (
            <li className="px-6 py-10 text-center text-[13px] text-slate-400">
              一致する結果がありません
            </li>
          ) : (
            results.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex min-h-14 items-start justify-between gap-4 px-4 py-3.5 transition active:bg-slate-50 sm:min-h-0 sm:px-6 sm:hover:bg-slate-50 sm:active:bg-transparent"
                >
                  <div className="min-w-0">
                    <p
                      className="text-[10px] font-semibold tracking-[0.16em]"
                      style={{ color: GOLD }}
                    >
                      {OS_SEARCH_CATEGORY_LABELS[item.category]}
                    </p>
                    <p
                      className="mt-1 truncate text-[15px] font-semibold tracking-[-0.02em]"
                      style={{ color: NAVY }}
                    >
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-slate-500">
                      {item.subtitle}
                    </p>
                  </div>
                  <span className="mt-4 text-slate-300" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 sm:px-6">
          <span className="hidden sm:inline">Esc で閉じる</span>
          <span className="sm:hidden" />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center font-semibold text-slate-500 transition active:text-[#071426] sm:min-h-0 sm:hover:text-[#071426] sm:active:text-slate-500"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
