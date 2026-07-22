"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ClientTagChips } from "@/components/ClientTagsEditor";
import InstructorNav from "@/components/InstructorNav";
import SchemaSetupBanner from "@/components/SchemaSetupBanner";
import { matchesClientSearch } from "@/lib/client-search";
import {
  PREDEFINED_CLIENT_TAGS,
  clientHasTag,
  toggleClientTag,
} from "@/lib/client-tags";
import {
  formatDisplayDate,
  getClientListItems,
  type ClientListItem,
} from "@/lib/repositories/client-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.75 14.5a5.75 5.75 0 1 1 0-11.5 5.75 5.75 0 0 1 0 11.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M13.1 13.1 16.5 16.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm2.47-10.53a.75.75 0 0 1 0 1.06L11.06 10l1.41 1.47a.75.75 0 1 1-1.08 1.04L10 11.06l-1.39 1.45a.75.75 0 1 1-1.08-1.04L8.94 10 7.53 8.53a.75.75 0 0 1 1.08-1.06L10 8.94l1.39-1.47a.75.75 0 0 1 1.08 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const refresh = async () => {
      try {
        setClients(await getClientListItems());
      } catch (error) {
        console.error("[clients] getClientListItems failed:", error);
        setClients([]);
      }
    };
    void refresh();
    setReady(true);

    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
    };
  }, []);

  const availableTagFilters = useMemo(() => {
    const used = new Set<string>();
    for (const client of clients) {
      for (const tag of client.tags) {
        used.add(tag);
      }
    }
    const predefined = new Set<string>(PREDEFINED_CLIENT_TAGS);
    const custom = [...used]
      .filter((tag) => !predefined.has(tag))
      .sort((a, b) => a.localeCompare(b, "ja"));
    return [...PREDEFINED_CLIENT_TAGS, ...custom];
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (
        tagFilters.length > 0 &&
        !tagFilters.every((tag) => clientHasTag(client.tags, tag))
      ) {
        return false;
      }
      if (!deferredQuery.trim()) return true;
      return matchesClientSearch(client.searchText, deferredQuery);
    });
  }, [clients, deferredQuery, tagFilters]);

  const hasQuery = query.trim().length > 0;
  const hasFilters = hasQuery || tagFilters.length > 0;
  const isFiltering = deferredQuery !== query;

  const clearFilters = () => {
    setQuery("");
    setTagFilters([]);
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="CLIENTS" />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
        <SchemaSetupBanner />

        <header className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            CLIENT DIRECTORY
          </p>
          <h1
            className="mt-4 text-[1.85rem] font-semibold tracking-[-0.05em] sm:mt-5 sm:text-4xl lg:text-5xl"
            style={{ color: NAVY }}
          >
            クライアント一覧
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
            分析結果は自動で保存され、こちらで確認できます。
            氏名・電話・メール・タグ・メモで素早く探せます。
          </p>
          <Link
            href="/clients/new"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-[#faf7f1] px-6 py-2.5 text-[13px] font-semibold transition hover:bg-[#f5efe4] sm:text-sm"
            style={{ color: GOLD }}
          >
            新規クライアント登録
          </Link>
        </header>

        <div className="mx-auto mt-8 w-full max-w-xl sm:mt-10">
          <label className="relative block">
            <span className="sr-only">クライアントを検索</span>
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <SearchIcon className="h-[18px] w-[18px]" />
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="氏名、電話、メール、タグ、メモ"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              className="w-full rounded-full border border-black/[0.04] bg-[#ebebf0] py-3.5 pl-11 pr-11 text-[15px] text-[#071426] outline-none transition placeholder:text-slate-400/90 focus:border-transparent focus:bg-white focus:shadow-[0_0_0_4px_rgba(49,95,104,0.14),0_10px_30px_-18px_rgba(15,23,42,0.35)] sm:text-[16px] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            {hasQuery ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition hover:text-slate-600"
                aria-label="検索をクリア"
              >
                <ClearIcon className="h-5 w-5" />
              </button>
            ) : null}
          </label>

          {ready && clients.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-center text-[11px] font-medium tracking-[0.12em] text-slate-400">
                タグで絞り込み
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {availableTagFilters.map((tag) => {
                  const selected = clientHasTag(tagFilters, tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setTagFilters((current) => toggleClientTag(current, tag))
                      }
                      aria-pressed={selected}
                      className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
                      style={
                        selected
                          ? {
                              borderColor: "rgba(138,106,45,0.45)",
                              backgroundColor: "rgba(138,106,45,0.12)",
                              color: GOLD,
                            }
                          : {
                              borderColor: "rgba(15,23,42,0.08)",
                              backgroundColor: "#fff",
                              color: "#64748b",
                            }
                      }
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {ready && clients.length > 0 ? (
            <p className="mt-3 text-center text-[12px] tabular-nums text-slate-400">
              {hasFilters
                ? `${filteredClients.length} / ${clients.length} 件`
                : `${clients.length} 件`}
              {isFiltering ? " …" : ""}
            </p>
          ) : null}
        </div>

        <div
          className={`mt-6 space-y-3 sm:mt-8 ${isFiltering ? "opacity-70" : "opacity-100"} transition-opacity duration-150`}
        >
          {!ready ? (
            <p className="py-16 text-center text-sm text-slate-400">読み込み中...</p>
          ) : clients.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <p className="text-base font-semibold" style={{ color: NAVY }}>
                まだクライアントがいません
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                新規登録するか、新しい分析を完了するとここに追加されます。
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/clients/new"
                  className="inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: NAVY }}
                >
                  新規クライアント登録
                </Link>
                <Link
                  href="/analysis/new"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold transition hover:bg-slate-50"
                  style={{ color: NAVY }}
                >
                  新しい分析を作成
                </Link>
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
              <p className="text-base font-semibold" style={{ color: NAVY }}>
                該当するクライアントが見つかりません
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                別のキーワードやタグで試すか、条件をクリアしてください。
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold transition hover:bg-slate-50"
                style={{ color: NAVY }}
              >
                条件をクリア
              </button>
            </div>
          ) : (
            filteredClients.map((client) => (
              <article
                key={client.id}
                className="group flex flex-col gap-4 rounded-[24px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-42px_rgba(15,23,42,0.32)] sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2
                      className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                      style={{ color: NAVY }}
                    >
                      {client.name}
                    </h2>
                    <p className="text-[11px] font-medium tracking-[0.12em] text-slate-400">
                      登録 {formatDisplayDate(client.registeredAt)}
                    </p>
                  </div>

                  <ClientTagChips
                    tags={client.tags}
                    className="mt-2.5"
                    onTagClick={(tag) =>
                      setTagFilters((current) =>
                        clientHasTag(current, tag)
                          ? current
                          : toggleClientTag(current, tag),
                      )
                    }
                  />

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
                    <div className="rounded-2xl bg-[#fafaf8] px-4 py-3">
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                        最新睡眠スコア
                      </p>
                      <p
                        className="mt-1 text-2xl font-semibold tracking-[-0.04em]"
                        style={{ color: NAVY }}
                      >
                        {client.latestSleepScore ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#fafaf8] px-4 py-3">
                      <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                        最新分析日
                      </p>
                      <p
                        className="mt-1 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                        style={{ color: NAVY }}
                      >
                        {formatDisplayDate(client.latestAnalysisDate)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Link
                    href={`/clients/${client.id}/profile`}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-[#faf7f1] px-6 py-3.5 text-[15px] font-semibold transition hover:bg-[#f5efe4] sm:text-sm"
                    style={{ color: GOLD }}
                  >
                    プロフィール
                  </Link>
                  <Link
                    href={`/analysis/new?clientId=${encodeURIComponent(client.id)}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-[15px] font-semibold transition hover:bg-slate-50 sm:text-sm"
                    style={{ color: NAVY }}
                  >
                    新しい分析
                  </Link>
                  <Link
                    href={`/clients/${client.id}`}
                    className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full px-7 py-3.5 text-[15px] font-semibold text-white transition duration-300 group-hover:-translate-y-0.5 sm:text-sm"
                    style={{ backgroundColor: NAVY }}
                  >
                    詳細を見る
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
