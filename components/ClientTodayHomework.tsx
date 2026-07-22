"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  filterTodaysHomeworks,
  formatHomeworkDate,
  homeworkStatusLabel,
  homeworkStatusOf,
  listClientHomeworks,
  setOwnHomeworkCompletion,
  type ClientHomework,
} from "@/lib/repositories/client-homeworks-repository";

type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  clientId: string;
  onHomeworksChange?: (items: ClientHomework[]) => void;
};

function StatusChip({ homework }: { homework: ClientHomework }) {
  const status = homeworkStatusOf(homework);
  const styles =
    status === "completed"
      ? { color: "#0f6b5c", background: "rgba(15, 107, 92, 0.1)" }
      : status === "overdue"
        ? { color: "#a33a3a", background: "rgba(163, 58, 58, 0.08)" }
        : { color: GOLD, background: "rgba(138, 106, 45, 0.1)" };

  return (
    <span
      className="inline-flex min-h-6 items-center rounded-full px-2 text-[10px] font-semibold tracking-[0.04em]"
      style={styles}
    >
      {homeworkStatusLabel(status)}
    </span>
  );
}

export default function ClientTodayHomework({
  clientId,
  onHomeworksChange,
}: Props) {
  const { success, error: toastError } = useToast();
  const [allItems, setAllItems] = useState<ClientHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listClientHomeworks(clientId);
      setAllItems(next);
    } catch (err) {
      console.error("[ClientTodayHomework] load failed:", err);
      setError(
        err instanceof Error ? err.message : "宿題の取得に失敗しました。",
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await listClientHomeworks(clientId);
        if (!cancelled) setAllItems(next);
      } catch (err) {
        console.error("[ClientTodayHomework] load failed:", err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "宿題の取得に失敗しました。",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    onHomeworksChange?.(allItems);
  }, [allItems, onHomeworksChange]);

  const todays = filterTodaysHomeworks(allItems);

  const handleToggle = async (item: ClientHomework) => {
    if (busyId) return;
    const nextCompleted = !item.isCompleted;

    setBusyId(item.id);
    setSaveStates((current) => ({ ...current, [item.id]: "saving" }));
    setError(null);

    setAllItems((current) =>
      current.map((hw) =>
        hw.id === item.id
          ? {
              ...hw,
              isCompleted: nextCompleted,
              completedAt: nextCompleted
                ? hw.completedAt ?? new Date().toISOString()
                : null,
            }
          : hw,
      ),
    );

    try {
      const saved = await setOwnHomeworkCompletion(
        item.id,
        nextCompleted,
        clientId,
      );
      setAllItems((current) =>
        current.map((hw) => (hw.id === saved.id ? saved : hw)),
      );
      setSaveStates((current) => ({ ...current, [item.id]: "saved" }));
      success(nextCompleted ? "宿題を完了しました" : "宿題を未完了に戻しました");
      window.setTimeout(() => {
        setSaveStates((current) =>
          current[item.id] === "saved"
            ? { ...current, [item.id]: "idle" }
            : current,
        );
      }, 1600);
    } catch (err) {
      console.error("[ClientTodayHomework] toggle failed:", err);
      setAllItems((current) =>
        current.map((hw) =>
          hw.id === item.id
            ? {
                ...hw,
                isCompleted: item.isCompleted,
                completedAt: item.completedAt,
              }
            : hw,
        ),
      );
      setSaveStates((current) => ({ ...current, [item.id]: "error" }));
      const msg =
        err instanceof Error ? err.message : "宿題の保存に失敗しました。";
      setError(msg);
      toastError(msg);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <SoftSkeleton variant="homework" />;
  }

  if (error && todays.length === 0) {
    return (
      <ErrorState compact message={error} onRetry={() => void refresh()} />
    );
  }

  if (todays.length === 0) {
    return (
      <EmptyState
        compact
        illustration="homework"
        title="宿題はまだありません"
        description="認定講師が宿題を設定すると、ここに今日の行動目標が表示されます。"
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-[13px] leading-6 text-slate-500 sm:text-[14px]">
        認定講師が設定した行動目標です。できたらチェックを入れてください。
      </p>
      <ul className="space-y-3">
        {todays.map((item) => {
          const status = homeworkStatusOf(item);
          const saveState = saveStates[item.id] ?? "idle";
          const border =
            status === "completed"
              ? "border-[#0f6b5c]/20 bg-gradient-to-br from-[rgba(15,107,92,0.05)] to-white"
              : status === "overdue"
                ? "border-[#a33a3a]/22 bg-white"
                : "border-[#071426]/08 bg-[#fafaf8]";

          return (
            <li key={item.id}>
              <label
                className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-4 transition sm:px-5 ${border} ${
                  busyId === item.id ? "opacity-70" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.isCompleted}
                  disabled={busyId === item.id}
                  onChange={() => void handleToggle(item)}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 accent-[#0f6b5c]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusChip homework={item} />
                    <span
                      className={`text-[15px] font-semibold tracking-[-0.02em] sm:text-[16px] ${
                        item.isCompleted ? "text-slate-400 line-through" : ""
                      }`}
                      style={item.isCompleted ? undefined : { color: NAVY }}
                    >
                      {item.title}
                    </span>
                  </span>
                  {item.description ? (
                    <span className="mt-1.5 block whitespace-pre-wrap text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
                      {item.description}
                    </span>
                  ) : null}
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-400">
                    <span>期限 {formatHomeworkDate(item.dueDate)}</span>
                    {saveState === "saving" ? (
                      <span style={{ color: GOLD }}>保存中...</span>
                    ) : null}
                    {saveState === "saved" ? (
                      <span style={{ color: "#0f6b5c" }}>保存しました</span>
                    ) : null}
                    {saveState === "error" ? (
                      <span className="text-rose-600">保存に失敗</span>
                    ) : null}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error ? (
        <div className="mt-3">
          <ErrorState
            compact
            message={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : null}
    </div>
  );
}
