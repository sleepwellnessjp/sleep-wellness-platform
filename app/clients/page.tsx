"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import {
  CLIENT_MANAGEMENT_PAGE_SIZE,
  GENDER_LABELS,
  clientInitials,
  filterClientManagementItems,
  formatManagementDate,
  getClientManagementList,
  type ClientManagementItem,
} from "@/lib/client-management";

const NAVY = "#0F172A";
const SURFACE = "#FFFFFF";
const MUTED = "#64748B";
const BORDER = "rgba(15, 23, 42, 0.08)";
const CARD_SHADOW =
  "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 40px -24px rgba(15, 23, 42, 0.18)";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 4.5v11M4.5 10h11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClientAvatar({ client }: { client: ClientManagementItem }) {
  if (client.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={client.avatarUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded-full object-cover"
        style={{ backgroundColor: "#F1F5F9" }}
      />
    );
  }

  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold tracking-[-0.02em] text-white"
      style={{ backgroundColor: NAVY }}
      aria-hidden="true"
    >
      {clientInitials(client.name)}
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientManagementItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [sleepScoreQuery, setSleepScoreQuery] = useState("");
  const [assignedDayQuery, setAssignedDayQuery] = useState("");
  const [page, setPage] = useState(1);

  const deferredName = useDeferredValue(nameQuery);
  const deferredScore = useDeferredValue(sleepScoreQuery);
  const deferredDay = useDeferredValue(assignedDayQuery);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getClientManagementList();
        if (!cancelled) {
          setClients(result.clients);
          setTotalCount(result.totalCount);
        }
      } catch (error) {
        console.error("[clients] getClientManagementList failed:", error);
        if (!cancelled) {
          setClients([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClients = useMemo(
    () =>
      filterClientManagementItems(clients, {
        nameQuery: deferredName,
        sleepScoreQuery: deferredScore,
        assignedDayQuery: deferredDay,
      }),
    [clients, deferredName, deferredScore, deferredDay],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / CLIENT_MANAGEMENT_PAGE_SIZE),
  );

  useEffect(() => {
    setPage(1);
  }, [deferredName, deferredScore, deferredDay]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * CLIENT_MANAGEMENT_PAGE_SIZE;
    return filteredClients.slice(start, start + CLIENT_MANAGEMENT_PAGE_SIZE);
  }, [filteredClients, page]);

  const isFiltering =
    deferredName !== nameQuery ||
    deferredScore !== sleepScoreQuery ||
    deferredDay !== assignedDayQuery;

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE, color: NAVY }}>
      <InstructorNav eyebrow="CLIENTS" />

      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10 sm:py-16 lg:py-20">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              className="text-[1.85rem] font-semibold tracking-[-0.04em] sm:text-[2.35rem]"
              style={{ color: NAVY }}
            >
              Client Management
            </h1>
            <p className="mt-3 text-[15px] leading-7" style={{ color: MUTED }}>
              担当クライアントの睡眠スコアとフォロー予定を一覧で確認します。
            </p>
          </div>
          <Link
            href="/clients/new"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY, boxShadow: CARD_SHADOW }}
          >
            <PlusIcon className="h-4 w-4" />
            新規クライアント
          </Link>
        </header>

        <section
          className="mt-10 rounded-3xl border bg-white p-5 sm:mt-12 sm:p-6"
          style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          aria-label="検索"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span
                className="text-[11px] font-medium tracking-[0.12em]"
                style={{ color: MUTED }}
              >
                名前検索
              </span>
              <input
                type="search"
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                placeholder="氏名"
                autoComplete="off"
                className="mt-2 w-full rounded-2xl border bg-[#F8FAFC] px-4 py-3 text-[15px] outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-[#0F172A]/08"
                style={{ borderColor: BORDER, color: NAVY }}
              />
            </label>
            <label className="block">
              <span
                className="text-[11px] font-medium tracking-[0.12em]"
                style={{ color: MUTED }}
              >
                睡眠スコア検索
              </span>
              <input
                type="search"
                inputMode="numeric"
                value={sleepScoreQuery}
                onChange={(event) => setSleepScoreQuery(event.target.value)}
                placeholder="例: 70"
                autoComplete="off"
                className="mt-2 w-full rounded-2xl border bg-[#F8FAFC] px-4 py-3 text-[15px] outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-[#0F172A]/08"
                style={{ borderColor: BORDER, color: NAVY }}
              />
            </label>
            <label className="block">
              <span
                className="text-[11px] font-medium tracking-[0.12em]"
                style={{ color: MUTED }}
              >
                担当日検索
              </span>
              <input
                type="search"
                value={assignedDayQuery}
                onChange={(event) => setAssignedDayQuery(event.target.value)}
                placeholder="例: 2026-07-25"
                autoComplete="off"
                className="mt-2 w-full rounded-2xl border bg-[#F8FAFC] px-4 py-3 text-[15px] outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-[#0F172A]/08"
                style={{ borderColor: BORDER, color: NAVY }}
              />
            </label>
          </div>
        </section>

        <section className="mt-10 sm:mt-12" aria-labelledby="client-list-title">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2
              id="client-list-title"
              className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
              style={{ color: NAVY }}
            >
              クライアント一覧
            </h2>
            {ready ? (
              <span className="text-[13px] tabular-nums" style={{ color: MUTED }}>
                {filteredClients.length} / {totalCount}名
              </span>
            ) : null}
          </div>

          {!ready ? (
            <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="読み込み中">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-3xl bg-slate-100"
                />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <div
              className="rounded-3xl border px-6 py-16 text-center"
              style={{ borderColor: BORDER }}
            >
              <p className="text-[15px] font-medium" style={{ color: NAVY }}>
                該当するクライアントがいません
              </p>
              <p className="mt-2 text-sm" style={{ color: MUTED }}>
                検索条件を変更するか、新規クライアントを登録してください。
              </p>
            </div>
          ) : (
            <ul
              className={`grid gap-4 sm:grid-cols-2 ${isFiltering ? "opacity-70" : "opacity-100"} transition-opacity duration-150`}
            >
              {pageItems.map((client) => (
                <li key={client.id}>
                  <article
                    className="flex h-full flex-col rounded-3xl border bg-white p-5 transition hover:-translate-y-0.5 sm:p-6"
                    style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
                  >
                    <div className="flex items-start gap-4">
                      <ClientAvatar client={client} />
                      <div className="min-w-0 flex-1">
                        <h3
                          className="truncate text-[16px] font-semibold tracking-[-0.02em]"
                          style={{ color: NAVY }}
                        >
                          {client.name}
                        </h3>
                        <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
                          {client.age != null ? `${client.age}歳` : "年齢未設定"}
                          {" · "}
                          {GENDER_LABELS[client.gender]}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className="text-[11px] font-medium tracking-[0.12em]"
                          style={{ color: MUTED }}
                        >
                          睡眠スコア
                        </p>
                        <p
                          className="mt-0.5 text-[1.5rem] font-semibold tracking-[-0.04em] tabular-nums"
                          style={{ color: NAVY }}
                        >
                          {client.sleepScore ?? "—"}
                        </p>
                      </div>
                    </div>

                    <dl
                      className="mt-5 grid grid-cols-2 gap-3 border-t pt-4"
                      style={{ borderColor: BORDER }}
                    >
                      <div>
                        <dt
                          className="text-[11px] font-medium tracking-[0.08em]"
                          style={{ color: MUTED }}
                        >
                          前回分析日
                        </dt>
                        <dd
                          className="mt-1 text-[13px] font-medium"
                          style={{ color: NAVY }}
                        >
                          {formatManagementDate(client.lastAnalysisDate)}
                        </dd>
                      </div>
                      <div>
                        <dt
                          className="text-[11px] font-medium tracking-[0.08em]"
                          style={{ color: MUTED }}
                        >
                          次回フォロー日
                        </dt>
                        <dd
                          className="mt-1 text-[13px] font-medium"
                          style={{ color: NAVY }}
                        >
                          {formatManagementDate(client.nextFollowUpDate)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p
                          className="text-[11px] font-medium tracking-[0.08em]"
                          style={{ color: MUTED }}
                        >
                          Sleep Journey
                        </p>
                        <p
                          className="text-[12px] font-semibold tabular-nums"
                          style={{ color: NAVY }}
                        >
                          {client.journeyProgress}%
                        </p>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-valuenow={client.journeyProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${client.name}の Sleep Journey 進捗`}
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, client.journeyProgress))}%`,
                            backgroundColor: NAVY,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-1 items-end">
                      <Link
                        href={`/clients/${encodeURIComponent(client.id)}`}
                        className="inline-flex min-h-10 w-full items-center justify-center rounded-2xl border text-[14px] font-semibold transition hover:bg-slate-50"
                        style={{ borderColor: BORDER, color: NAVY }}
                      >
                        詳細
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        {ready ? (
          <footer
            className="mt-12 flex flex-col items-center justify-between gap-5 border-t pt-8 sm:flex-row"
            style={{ borderColor: BORDER }}
          >
            <p className="text-[14px] tabular-nums" style={{ color: MUTED }}>
              全{filteredClients.length}名
            </p>
            <nav
              className="flex items-center gap-2"
              aria-label="ページネーション"
            >
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-[13px] font-semibold transition enabled:hover:bg-slate-50 disabled:opacity-40"
                style={{ borderColor: BORDER, color: NAVY }}
              >
                前へ
              </button>
              <span
                className="min-w-[4.5rem] text-center text-[13px] tabular-nums"
                style={{ color: MUTED }}
              >
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-[13px] font-semibold transition enabled:hover:bg-slate-50 disabled:opacity-40"
                style={{ borderColor: BORDER, color: NAVY }}
              >
                次へ
              </button>
            </nav>
          </footer>
        ) : null}
      </div>
    </main>
  );
}
