"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  CLIENT_GOAL_CATEGORIES,
  GOAL_CATEGORY_LABELS,
  GOAL_STATUS_LABELS,
} from "@/lib/client-portal/constants";
import type {
  ClientGoalCategory,
  ClientGoalProgress,
} from "@/lib/client-portal/types";

const inputClass =
  "box-border w-full max-w-full min-w-0 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:py-3 sm:text-[15px]";

type Props = {
  clientId: string;
};

export default function ClientGoalsManager({ clientId }: Props) {
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<ClientGoalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ClientGoalCategory>("sleep");
  const [targetOn, setTargetOn] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/client-portal/goals?clientId=${encodeURIComponent(clientId)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          goals?: ClientGoalProgress[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "目標の取得に失敗しました。");
        }
        if (!cancelled) setItems(payload.goals ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "目標の取得に失敗しました。",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    setError(null);
    try {
      const response = await fetch("/api/client-portal/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          title: trimmed,
          description,
          category,
          targetOn: targetOn || null,
        }),
      });
      const payload = (await response.json()) as {
        goal?: ClientGoalProgress;
        error?: string;
      };
      if (!response.ok || !payload.goal) {
        throw new Error(payload.error || "目標の追加に失敗しました。");
      }
      setItems((current) => [payload.goal!, ...current]);
      setTitle("");
      setDescription("");
      setCategory("sleep");
      setTargetOn("");
      success("目標を保存しました");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "目標の追加に失敗しました。";
      setError(msg);
      toastError(msg);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="min-w-0 overflow-x-hidden">
      <p className="mb-4 max-w-xl text-[13px] leading-6 text-slate-500 sm:mb-5 sm:text-[14px] sm:leading-7">
        クライアントマイページの「目標」に表示されます。
      </p>

      {loading ? (
        <SoftSkeleton variant="homework" />
      ) : error && items.length === 0 ? (
        <ErrorState compact message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          compact
          illustration="homework"
          title="目標はまだありません"
          description="下のフォームから追加すると、クライアント画面に表示されます。"
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-slate-100 bg-[#fafaf8] p-3.5 sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex min-h-7 items-center rounded-full border border-[#8a6a2d]/25 bg-white px-2.5 text-[11px] font-semibold text-[#8a6a2d]">
                  {GOAL_CATEGORY_LABELS[item.category]}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {GOAL_STATUS_LABELS[item.status]}
                </span>
              </div>
              <p
                className="mt-2 text-[15px] font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                {item.title}
              </p>
              {item.description ? (
                <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-slate-600">
                  {item.description}
                </p>
              ) : null}
              <p className="mt-2 text-[12px] text-slate-400">
                進捗 {item.progressPercent}%
                {item.targetOn ? ` · 目標日 ${item.targetOn}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 min-w-0 rounded-2xl border border-slate-100 bg-[#fafaf8] p-3.5 sm:mt-6 sm:p-5">
        <p
          className="text-[11px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          ADD GOAL
        </p>
        <div className="mt-3 space-y-3">
          <label className="block min-w-0">
            <span className="text-[12px] font-semibold text-slate-500">
              目標タイトル
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={adding}
              className={`${inputClass} mt-1.5`}
              placeholder="例：睡眠スコア 75 を目指す"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-[12px] font-semibold text-slate-500">説明</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={adding}
              rows={2}
              className={`${inputClass} mt-1.5 resize-none`}
              placeholder="達成条件や確認ポイント"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="text-[12px] font-semibold text-slate-500">
                カテゴリ
              </span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as ClientGoalCategory)
                }
                disabled={adding}
                className={`${inputClass} mt-1.5`}
              >
                {CLIENT_GOAL_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {GOAL_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="text-[12px] font-semibold text-slate-500">
                目標日（任意）
              </span>
              <input
                type="date"
                value={targetOn}
                onChange={(event) => setTargetOn(event.target.value)}
                disabled={adding}
                className={`${inputClass} mt-1.5`}
              />
            </label>
          </div>
        </div>
        <div className="mt-3 flex sm:justify-end">
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={adding || !title.trim()}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 py-3 text-[14px] font-semibold text-white transition active:opacity-90 disabled:opacity-50 sm:min-h-10 sm:w-auto sm:py-2 sm:text-[13px]"
            style={{ backgroundColor: NAVY }}
          >
            {adding ? "追加中..." : "目標を追加"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 break-words text-sm font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
