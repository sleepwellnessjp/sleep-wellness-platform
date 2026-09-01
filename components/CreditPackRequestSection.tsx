"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CREDIT_PACK_MAX_SETS,
  CREDIT_PACK_MIN_SETS,
  CREDIT_REQUEST_STATUS_LABELS,
  creditsForSets,
  yenForSets,
} from "@/lib/platform/credit-pack-constants";
import type { CreditRequestRecord } from "@/lib/platform/credit-request-types";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

const BANK_TRANSFER_INFO =
  process.env.NEXT_PUBLIC_BANK_TRANSFER_INFO?.trim() ?? "";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatYen(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

export default function CreditPackRequestSection() {
  const [requests, setRequests] = useState<CreditRequestRecord[]>([]);
  const [sets, setSets] = useState(CREDIT_PACK_MIN_SETS);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/credit-requests", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        requests?: CreditRequestRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "申請情報の取得に失敗しました");
      }
      setRequests(json.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "申請情報の取得に失敗しました");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingRequest = useMemo(
    () => requests.find((item) => item.status === "pending") ?? null,
    [requests],
  );

  const selectedCredits = creditsForSets(sets);
  const selectedYen = yenForSets(sets);

  const submit = async () => {
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/platform/credit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sets, note }),
      });
      const json = (await response.json()) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "申請に失敗しました");
      }
      setMessage("申請を受け付けました。振込確認後にクレジットが反映されます。");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "申請に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="credit-pack-request"
      className="scroll-mt-24 rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 sm:px-7 sm:py-8"
    >
      <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
        <h2
          className="text-lg font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          分析回数の追加パック
        </h2>
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          CREDIT PACK
        </p>
      </div>

      <p className="text-sm leading-7 text-slate-600">
        1セット = 10回分（1,000円）。振込確認後、管理者がクレジットを付与します。
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">読み込み中…</p>
      ) : pendingRequest ? (
        <div className="mt-5 rounded-2xl border border-[#9a7b12]/25 bg-[#faf7f1] px-4 py-4">
          <p className="text-sm font-semibold text-[#7a5f0f]">
            申請中です。振込確認後に反映されます。
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {pendingRequest.sets}セット（{pendingRequest.credits}回 /{" "}
            {formatYen(pendingRequest.amountYen)}）— 申請日時{" "}
            {formatDateTime(pendingRequest.requestedAt)}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="credit-pack-sets"
              className="block text-sm font-semibold text-slate-700"
            >
              セット数
            </label>
            <select
              id="credit-pack-sets"
              value={sets}
              onChange={(event) => setSets(Number(event.target.value))}
              className="mt-2 min-h-12 w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
            >
              {Array.from(
                { length: CREDIT_PACK_MAX_SETS - CREDIT_PACK_MIN_SETS + 1 },
                (_, index) => CREDIT_PACK_MIN_SETS + index,
              ).map((value) => (
                <option key={value} value={value}>
                  {value}セット — {creditsForSets(value)}回 /{" "}
                  {formatYen(yenForSets(value))}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-slate-500">
              選択中: {selectedCredits}回 / {formatYen(selectedYen)}
            </p>
          </div>

          <div>
            <label
              htmlFor="credit-pack-note"
              className="block text-sm font-semibold text-slate-700"
            >
              備考（任意）
            </label>
            <textarea
              id="credit-pack-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="振込名義など"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
            />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
              振込先
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {BANK_TRANSFER_INFO ||
                "振込先は管理者にお問い合わせください"}
            </p>
          </div>

          {error && (
            <p className="rounded-2xl border border-[#a33a3a]/20 bg-[#a33a3a]/06 px-4 py-3 text-sm text-[#a33a3a]">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-2xl border border-[#0f6b5c]/20 bg-[#0f6b5c]/06 px-4 py-3 text-sm text-[#0f6b5c]">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="inline-flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: NAVY }}
          >
            {submitting ? "送信中…" : "申請する"}
          </button>
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-8 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-700">申請履歴</h3>
          <ul className="mt-3 space-y-2">
            {requests.slice(0, 8).map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 rounded-xl bg-[#fafaf8] px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-semibold" style={{ color: NAVY }}>
                    {item.sets}セット（{item.credits}回）
                  </span>
                  <span className="ml-2 text-slate-500">
                    {formatYen(item.amountYen)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                  <span>{CREDIT_REQUEST_STATUS_LABELS[item.status]}</span>
                  <span>{formatDateTime(item.requestedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
