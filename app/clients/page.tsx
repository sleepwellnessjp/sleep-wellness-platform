"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import ErrorState from "@/components/ui/ErrorState";
import {
  BORDER,
  CARD_SHADOW,
  MUTED,
  NAVY,
  SURFACE,
} from "@/components/ui/tokens";
import { userMessageFromUnknown } from "@/lib/data-access-errors";
import {
  CLIENT_MANAGEMENT_PAGE_SIZE,
  GENDER_LABELS,
  clientInitials,
  filterClientManagementItems,
  formatManagementDate,
  getClientManagementList,
  listInstructorFilterOptions,
  type ClientManagementItem,
} from "@/lib/client-management";
import { deleteClient } from "@/lib/repositories/client-repository";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [nameQuery, setNameQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [instructorQuery, setInstructorQuery] = useState("all");
  const [sleepScoreQuery, setSleepScoreQuery] = useState("");
  const [assignedDayQuery, setAssignedDayQuery] = useState("");
  const [page, setPage] = useState(1);

  const deferredName = useDeferredValue(nameQuery);
  const deferredEmail = useDeferredValue(emailQuery);
  const deferredInstructor = useDeferredValue(instructorQuery);
  const deferredScore = useDeferredValue(sleepScoreQuery);
  const deferredDay = useDeferredValue(assignedDayQuery);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await getClientManagementList();
        if (!cancelled) {
          setClients(result.clients);
          setTotalCount(result.totalCount);
          setLoadError(null);
        }
      } catch (error) {
        console.error("[clients] getClientManagementList failed:", error);
        if (!cancelled) {
          setClients([]);
          setTotalCount(0);
          setLoadError(userMessageFromUnknown(error));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void load();

    const onClientsUpdated = () => {
      void load();
    };
    window.addEventListener("swij-clients-updated", onClientsUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("swij-clients-updated", onClientsUpdated);
    };
  }, []);

  const handleDeleteClient = async (client: ClientManagementItem) => {
    if (deletingId) return;
    const confirmed = window.confirm(
      "このクライアントを削除しますか？\nこの操作は元に戻せません。",
    );
    if (!confirmed) return;

    setDeletingId(client.id);
    setActionError(null);
    try {
      await deleteClient(client.id);
      setClients((current) => current.filter((item) => item.id !== client.id));
      setTotalCount((current) => Math.max(0, current - 1));
    } catch (error) {
      console.error("[clients] deleteClient failed:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "クライアントの削除に失敗しました。",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const instructorOptions = useMemo(
    () => listInstructorFilterOptions(clients),
    [clients],
  );

  const filteredClients = useMemo(
    () =>
      filterClientManagementItems(clients, {
        nameQuery: deferredName,
        emailQuery: deferredEmail,
        instructorQuery: deferredInstructor,
        sleepScoreQuery: deferredScore,
        assignedDayQuery: deferredDay,
      }),
    [
      clients,
      deferredName,
      deferredEmail,
      deferredInstructor,
      deferredScore,
      deferredDay,
    ],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / CLIENT_MANAGEMENT_PAGE_SIZE),
  );

  useEffect(() => {
    setPage(1);
  }, [
    deferredName,
    deferredEmail,
    deferredInstructor,
    deferredScore,
    deferredDay,
  ]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * CLIENT_MANAGEMENT_PAGE_SIZE;
    return filteredClients.slice(start, start + CLIENT_MANAGEMENT_PAGE_SIZE);
  }, [filteredClients, page]);

  const isFiltering =
    deferredName !== nameQuery ||
    deferredEmail !== emailQuery ||
    deferredInstructor !== instructorQuery ||
    deferredScore !== sleepScoreQuery ||
    deferredDay !== assignedDayQuery;

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE, color: NAVY }}>
      <InstructorNav eyebrow="CLIENTS" />

      <div className="mx-auto max-w-5xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-16 sm:pb-16 lg:py-20 lg:pb-20">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <div className="min-w-0">
            <h1
              className="break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.04em] sm:text-[2.35rem] sm:leading-normal"
              style={{ color: NAVY }}
            >
              Client Management
            </h1>
            <p
              className="mt-2 text-[14px] leading-6 sm:mt-3 sm:text-[15px] sm:leading-7"
              style={{ color: MUTED }}
            >
              担当クライアントの睡眠スコアとフォロー予定を一覧で確認します。
            </p>
          </div>
          <Link
            href="/clients/new"
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-[14px] font-semibold text-white transition active:opacity-90 sm:min-h-11 sm:w-auto sm:hover:opacity-90 sm:active:opacity-100"
            style={{ backgroundColor: NAVY, boxShadow: CARD_SHADOW }}
          >
            <PlusIcon className="h-4 w-4" />
            新規クライアント
          </Link>
        </header>

        <section
          className="mt-8 rounded-3xl border bg-white p-4 sm:mt-12 sm:p-6"
          style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          aria-label="検索"
        >
          <div className="grid gap-3.5 sm:grid-cols-3 sm:gap-4">
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
                className="mt-2 min-h-12 w-full rounded-2xl border bg-[#fafaf8] px-4 py-3 text-[16px] outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-[#071426]/08 sm:min-h-0 sm:text-[15px]"
                style={{ borderColor: BORDER, color: NAVY }}
              />
            </label>
            <label className="block">
              <span
                className="text-[11px] font-medium tracking-[0.12em]"
                style={{ color: MUTED }}
              >
                メール検索
              </span>
              <input
                type="search"
                value={emailQuery}
                onChange={(event) => setEmailQuery(event.target.value)}
                placeholder="example@email.com"
                autoComplete="off"
                className="mt-2 min-h-12 w-full rounded-2xl border bg-[#fafaf8] px-4 py-3 text-[16px] outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-[#071426]/08 sm:min-h-0 sm:text-[15px]"
                style={{ borderColor: BORDER, color: NAVY }}
              />
            </label>
            <label className="block">
              <span
                className="text-[11px] font-medium tracking-[0.12em]"
                style={{ color: MUTED }}
              >
                認定講師
              </span>
              <select
                value={instructorQuery}
                onChange={(event) => setInstructorQuery(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-2xl border bg-[#fafaf8] px-4 py-3 text-[16px] outline-none transition focus:bg-white focus:ring-4 focus:ring-[#071426]/08 sm:min-h-0 sm:text-[15px]"
                style={{ borderColor: BORDER, color: NAVY }}
              >
                <option value="all">すべて</option>
                {instructorOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3.5 grid gap-3.5 sm:mt-4 sm:grid-cols-2 sm:gap-4">
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
                className="mt-2 min-h-12 w-full rounded-2xl border bg-[#fafaf8] px-4 py-3 text-[16px] outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-[#071426]/08 sm:min-h-0 sm:text-[15px]"
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
                className="mt-2 min-h-12 w-full rounded-2xl border bg-[#fafaf8] px-4 py-3 text-[16px] outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-[#071426]/08 sm:min-h-0 sm:text-[15px]"
                style={{ borderColor: BORDER, color: NAVY }}
              />
            </label>
          </div>
        </section>

        <section className="mt-8 sm:mt-12" aria-labelledby="client-list-title">
          <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6 sm:gap-4">
            <h2
              id="client-list-title"
              className="text-base font-semibold tracking-[-0.03em] sm:text-xl"
              style={{ color: NAVY }}
            >
              クライアント一覧
            </h2>
            {ready ? (
              <span
                className="shrink-0 text-[13px] tabular-nums"
                style={{ color: MUTED }}
              >
                {filteredClients.length} / {totalCount}名
              </span>
            ) : null}
          </div>

          {!ready ? (
            <div
              className="grid gap-3 sm:grid-cols-2 sm:gap-4"
              aria-busy="true"
              aria-label="読み込み中"
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-52 animate-pulse rounded-3xl bg-slate-100 sm:h-56"
                />
              ))}
            </div>
          ) : loadError ? (
            <ErrorState
              title="クライアント一覧を表示できません"
              message={loadError}
              kind="supabase"
              onRetry={() => window.location.reload()}
            />
          ) : (
            <>
              {actionError ? (
                <p
                  className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 sm:mb-6"
                  role="alert"
                >
                  {actionError}
                </p>
              ) : null}
              {filteredClients.length === 0 ? (
                <div
                  className="rounded-3xl border px-5 py-12 text-center sm:px-6 sm:py-16"
                  style={{ borderColor: BORDER }}
                >
                  <p className="text-[15px] font-medium" style={{ color: NAVY }}>
                    {totalCount === 0
                      ? "担当クライアントはまだいません"
                      : "該当するクライアントがいません"}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: MUTED }}>
                    {totalCount === 0
                      ? "新規クライアント登録から始めましょう。"
                      : "検索条件を変更するか、新規クライアントを登録してください。"}
                  </p>
                  {totalCount === 0 ? (
                    <Link
                      href="/clients/new"
                      className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[14px] font-semibold text-white transition active:opacity-90 sm:w-auto sm:min-h-11 sm:hover:opacity-90 sm:active:opacity-100"
                      style={{ backgroundColor: NAVY }}
                    >
                      新規クライアント登録
                    </Link>
                  ) : null}
                </div>
              ) : (
                <ul
                  className={`grid gap-3 sm:grid-cols-2 sm:gap-4 ${isFiltering ? "opacity-70" : "opacity-100"} transition-opacity duration-150`}
                >
                  {pageItems.map((client) => (
                    <li key={client.id}>
                      <article
                        className="flex h-full flex-col rounded-3xl border bg-white p-4 transition active:bg-slate-50 sm:p-6 sm:hover:-translate-y-0.5 sm:active:bg-white"
                        style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <ClientAvatar client={client} />
                          <div className="min-w-0 flex-1">
                            <h3
                              className="truncate text-[15px] font-semibold tracking-[-0.02em] sm:text-[16px]"
                              style={{ color: NAVY }}
                            >
                              {client.name}
                            </h3>
                            <p
                              className="mt-1 text-[12px] sm:text-[13px]"
                              style={{ color: MUTED }}
                            >
                              {client.age != null
                                ? `${client.age}歳`
                                : "年齢未設定"}
                              {" · "}
                              {GENDER_LABELS[client.gender]}
                              {client.email ? ` · ${client.email}` : ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className="text-[10px] font-medium tracking-[0.12em] sm:text-[11px]"
                              style={{ color: MUTED }}
                            >
                              睡眠スコア
                            </p>
                            <p
                              className="mt-0.5 text-[1.35rem] font-semibold tracking-[-0.04em] tabular-nums sm:text-[1.5rem]"
                              style={{ color: NAVY }}
                            >
                              {client.sleepScore ?? "—"}
                            </p>
                          </div>
                        </div>

                        <dl
                          className="mt-4 grid grid-cols-2 gap-3 border-t pt-3.5 sm:mt-5 sm:pt-4"
                          style={{ borderColor: BORDER }}
                        >
                          <div className="min-w-0">
                            <dt
                              className="text-[11px] font-medium tracking-[0.08em]"
                              style={{ color: MUTED }}
                            >
                              前回分析日
                            </dt>
                            <dd
                              className="mt-1 break-words text-[13px] font-medium"
                              style={{ color: NAVY }}
                            >
                              {formatManagementDate(client.lastAnalysisDate)}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt
                              className="text-[11px] font-medium tracking-[0.08em]"
                              style={{ color: MUTED }}
                            >
                              次回フォロー日
                            </dt>
                            <dd
                              className="mt-1 break-words text-[13px] font-medium"
                              style={{ color: NAVY }}
                            >
                              {formatManagementDate(client.nextFollowUpDate)}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-4 sm:mt-5">
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

                        <div className="mt-5 flex flex-1 items-end gap-2 sm:mt-6">
                          <Link
                            href={`/clients/${encodeURIComponent(client.id)}`}
                            className="inline-flex min-h-12 w-full flex-1 items-center justify-center rounded-2xl border text-[14px] font-semibold transition active:bg-slate-50 sm:min-h-10 sm:hover:bg-slate-50 sm:active:bg-transparent"
                            style={{ borderColor: BORDER, color: NAVY }}
                          >
                            詳細
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDeleteClient(client)}
                            disabled={Boolean(deletingId)}
                            aria-label={`${client.name}を削除`}
                            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl border px-4 text-[14px] font-semibold transition enabled:active:bg-rose-50 disabled:opacity-50 sm:min-h-10 sm:enabled:hover:bg-rose-50 sm:enabled:active:bg-transparent"
                            style={{ borderColor: BORDER, color: MUTED }}
                          >
                            {deletingId === client.id ? "削除中..." : "削除"}
                          </button>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {ready ? (
          <footer
            className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:mt-12 sm:flex-row sm:gap-5 sm:pt-8"
            style={{ borderColor: BORDER }}
          >
            <p className="text-[14px] tabular-nums" style={{ color: MUTED }}>
              全{filteredClients.length}名
            </p>
            <nav
              className="flex w-full items-center justify-center gap-2 sm:w-auto"
              aria-label="ページネーション"
            >
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border px-4 text-[13px] font-semibold transition enabled:active:bg-slate-50 disabled:opacity-40 sm:min-h-10 sm:flex-none sm:enabled:hover:bg-slate-50 sm:enabled:active:bg-transparent"
                style={{ borderColor: BORDER, color: NAVY }}
              >
                前へ
              </button>
              <span
                className="min-w-[4.5rem] shrink-0 text-center text-[13px] tabular-nums"
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
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border px-4 text-[13px] font-semibold transition enabled:active:bg-slate-50 disabled:opacity-40 sm:min-h-10 sm:flex-none sm:enabled:hover:bg-slate-50 sm:enabled:active:bg-transparent"
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
