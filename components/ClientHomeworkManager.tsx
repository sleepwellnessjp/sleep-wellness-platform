"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  createClientHomework,
  defaultHomeworkAssignedDate,
  defaultHomeworkDueDate,
  deleteClientHomework,
  formatHomeworkDate,
  homeworkStatusLabel,
  homeworkStatusOf,
  listClientHomeworks,
  sortHomeworksForInstructor,
  updateClientHomework,
  type ClientHomework,
} from "@/lib/repositories/client-homeworks-repository";

const inputClass =
  "box-border w-full max-w-full min-w-0 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:py-3 sm:text-[15px]";

const textareaClass =
  "box-border w-full max-w-full min-w-0 resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:py-3 sm:text-[15px]";

type Props = {
  clientId: string;
};

function StatusBadge({ homework }: { homework: ClientHomework }) {
  const status = homeworkStatusOf(homework);
  const styles =
    status === "completed"
      ? {
          background: "rgba(15, 107, 92, 0.1)",
          color: "#0f6b5c",
          border: "1px solid rgba(15, 107, 92, 0.22)",
        }
      : status === "overdue"
        ? {
            background: "rgba(163, 58, 58, 0.08)",
            color: "#a33a3a",
            border: "1px solid rgba(163, 58, 58, 0.2)",
          }
        : {
            background: "rgba(138, 106, 45, 0.1)",
            color: GOLD,
            border: "1px solid rgba(138, 106, 45, 0.25)",
          };

  return (
    <span
      className="inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold tracking-[0.04em]"
      style={styles}
    >
      {homeworkStatusLabel(status)}
    </span>
  );
}

export default function ClientHomeworkManager({ clientId }: Props) {
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<ClientHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftAssigned, setDraftAssigned] = useState(defaultHomeworkAssignedDate);
  const [draftDue, setDraftDue] = useState(defaultHomeworkDueDate);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAssigned, setEditAssigned] = useState("");
  const [editDue, setEditDue] = useState("");

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await listClientHomeworks(clientId);
        if (!cancelled) setItems(next);
      } catch (err) {
        console.error("[ClientHomeworkManager] load failed:", err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "宿題の取得に失敗しました。",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refresh();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const startEdit = (item: ClientHomework) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditAssigned(item.assignedDate);
    setEditDue(item.dueDate);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditAssigned("");
    setEditDue("");
  };

  const handleAdd = async () => {
    const title = draftTitle.trim();
    if (!title || adding) return;

    setAdding(true);
    setError(null);
    try {
      const created = await createClientHomework(clientId, {
        title,
        description: draftDescription,
        assignedDate: draftAssigned,
        dueDate: draftDue,
      });
      setItems((current) => sortHomeworksForInstructor([...current, created]));
      setDraftTitle("");
      setDraftDescription("");
      setDraftAssigned(defaultHomeworkAssignedDate());
      setDraftDue(defaultHomeworkDueDate());
      success("宿題を保存しました");
    } catch (err) {
      console.error("[ClientHomeworkManager] create failed:", err);
      const msg =
        err instanceof Error ? err.message : "宿題の追加に失敗しました。";
      setError(msg);
      toastError(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async (homeworkId: string) => {
    const title = editTitle.trim();
    if (!title || busyId) return;

    setBusyId(homeworkId);
    setError(null);
    try {
      const updated = await updateClientHomework(clientId, homeworkId, {
        title,
        description: editDescription,
        assignedDate: editAssigned,
        dueDate: editDue,
      });
      setItems((current) =>
        sortHomeworksForInstructor(
          current.map((item) => (item.id === homeworkId ? updated : item)),
        ),
      );
      cancelEdit();
      success("宿題を更新しました");
    } catch (err) {
      console.error("[ClientHomeworkManager] update failed:", err);
      const msg =
        err instanceof Error ? err.message : "宿題の更新に失敗しました。";
      setError(msg);
      toastError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (homeworkId: string) => {
    if (busyId) return;
    if (!window.confirm("この宿題を削除しますか？")) return;

    setBusyId(homeworkId);
    setError(null);
    try {
      await deleteClientHomework(clientId, homeworkId);
      setItems((current) => current.filter((item) => item.id !== homeworkId));
      if (editingId === homeworkId) cancelEdit();
    } catch (err) {
      console.error("[ClientHomeworkManager] delete failed:", err);
      setError(
        err instanceof Error ? err.message : "宿題の削除に失敗しました。",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-w-0 overflow-x-hidden">
      <p className="mb-4 max-w-xl text-[13px] leading-6 text-slate-500 sm:mb-5 sm:text-[14px] sm:leading-7">
        クライアントマイページの「今日の宿題」に表示されます。未完了・完了・期限切れを確認しながら編集できます。
      </p>

      {loading ? (
        <SoftSkeleton variant="homework" />
      ) : error && items.length === 0 ? (
        <ErrorState
          compact
          message={error}
          onRetry={() => {
            setLoading(true);
            setError(null);
            void listClientHomeworks(clientId)
              .then(setItems)
              .catch((err: unknown) => {
                setError(
                  err instanceof Error
                    ? err.message
                    : "宿題の取得に失敗しました。",
                );
              })
              .finally(() => setLoading(false));
          }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          compact
          illustration="homework"
          title="宿題はまだありません"
          description="下のフォームから追加すると、クライアントマイページに表示されます。"
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const isEditing = editingId === item.id;
            const isBusy = busyId === item.id;
            const status = homeworkStatusOf(item);
            const borderColor =
              status === "completed"
                ? "border-[#0f6b5c]/20"
                : status === "overdue"
                  ? "border-[#a33a3a]/25"
                  : "border-[#8a6a2d]/20";

            return (
              <li
                key={item.id}
                className={`min-w-0 rounded-2xl border bg-[#fafaf8] p-3.5 sm:p-5 ${borderColor}`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <label className="block min-w-0">
                      <span className="text-[12px] font-semibold text-slate-500">
                        宿題タイトル
                      </span>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        disabled={isBusy}
                        className={`${inputClass} mt-1.5`}
                      />
                    </label>
                    <label className="block min-w-0">
                      <span className="text-[12px] font-semibold text-slate-500">
                        説明
                      </span>
                      <textarea
                        value={editDescription}
                        onChange={(event) =>
                          setEditDescription(event.target.value)
                        }
                        disabled={isBusy}
                        rows={3}
                        className={`${textareaClass} mt-1.5`}
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block min-w-0">
                        <span className="text-[12px] font-semibold text-slate-500">
                          開始日
                        </span>
                        <input
                          type="date"
                          value={editAssigned}
                          onChange={(event) =>
                            setEditAssigned(event.target.value)
                          }
                          disabled={isBusy}
                          className={`${inputClass} mt-1.5`}
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className="text-[12px] font-semibold text-slate-500">
                          期限
                        </span>
                        <input
                          type="date"
                          value={editDue}
                          onChange={(event) => setEditDue(event.target.value)}
                          disabled={isBusy}
                          className={`${inputClass} mt-1.5`}
                        />
                      </label>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(item.id)}
                        disabled={isBusy || !editTitle.trim()}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 py-2.5 text-[13px] font-semibold text-white transition active:opacity-90 disabled:opacity-50 sm:min-h-9 sm:w-auto sm:py-1.5 sm:text-[12px] sm:active:opacity-100"
                        style={{ backgroundColor: NAVY }}
                      >
                        {isBusy ? "保存中..." : "保存"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isBusy}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition active:bg-slate-50 disabled:opacity-50 sm:min-h-9 sm:w-auto sm:py-1.5 sm:text-[12px] sm:hover:bg-slate-50 sm:active:bg-transparent"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge homework={item} />
                          <p
                            className="min-w-0 break-words text-[15px] font-semibold tracking-[-0.02em] sm:text-[16px]"
                            style={{ color: NAVY }}
                          >
                            {item.title}
                          </p>
                        </div>
                        {item.description ? (
                          <p className="mt-2 break-words whitespace-pre-wrap text-[14px] leading-6 text-slate-600 sm:leading-7">
                            {item.description}
                          </p>
                        ) : null}
                        <p className="mt-2 break-words text-[12px] text-slate-400">
                          {formatHomeworkDate(item.assignedDate)}
                          <span className="mx-1.5 text-slate-300">→</span>
                          {formatHomeworkDate(item.dueDate)}
                          {item.isCompleted ? (
                            <span className="ml-2 text-[#0f6b5c]">
                              · 完了済み
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          disabled={Boolean(busyId)}
                          className="inline-flex min-h-10 items-center text-[13px] font-medium text-slate-400 transition active:opacity-70 disabled:opacity-50 sm:min-h-0 sm:text-[12px] sm:hover:text-[#8a6a2d] sm:active:opacity-100"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          disabled={isBusy}
                          className="inline-flex min-h-10 items-center text-[13px] font-medium text-slate-400 transition active:opacity-70 disabled:opacity-50 sm:min-h-0 sm:text-[12px] sm:hover:text-rose-600 sm:active:opacity-100"
                        >
                          {isBusy ? "削除中..." : "削除"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 min-w-0 rounded-2xl border border-slate-100 bg-[#fafaf8] p-3.5 sm:mt-6 sm:p-5">
        <p
          className="text-[11px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          ADD HOMEWORK
        </p>
        <div className="mt-3 space-y-3">
          <label className="block min-w-0">
            <span className="text-[12px] font-semibold text-slate-500">
              宿題タイトル
            </span>
            <input
              type="text"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              disabled={adding}
              className={`${inputClass} mt-1.5`}
              placeholder="例：就寝90分前にスマホを置く"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-[12px] font-semibold text-slate-500">説明</span>
            <textarea
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              disabled={adding}
              rows={2}
              className={`${textareaClass} mt-1.5`}
              placeholder="取り組み方やポイントがあれば記入"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="text-[12px] font-semibold text-slate-500">
                開始日
              </span>
              <input
                type="date"
                value={draftAssigned}
                onChange={(event) => setDraftAssigned(event.target.value)}
                disabled={adding}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <label className="block min-w-0">
              <span className="text-[12px] font-semibold text-slate-500">
                期限
              </span>
              <input
                type="date"
                value={draftDue}
                onChange={(event) => setDraftDue(event.target.value)}
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
            disabled={adding || !draftTitle.trim()}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 py-3 text-[14px] font-semibold text-white transition active:opacity-90 disabled:opacity-50 sm:min-h-10 sm:w-auto sm:py-2 sm:text-[13px] sm:active:opacity-100"
            style={{ backgroundColor: NAVY }}
          >
            {adding ? "追加中..." : "宿題を追加"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 break-words text-sm font-medium text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
