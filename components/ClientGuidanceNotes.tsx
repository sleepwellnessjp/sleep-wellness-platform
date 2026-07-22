"use client";

import { useEffect, useState } from "react";
import {
  createGuidanceNote,
  defaultGuidanceNoteDate,
  deleteGuidanceNote,
  formatGuidanceNoteDate,
  listGuidanceNotes,
  sortGuidanceNotesChronological,
  updateGuidanceNote,
  type GuidanceNote,
} from "@/lib/repositories/client-guidance-notes-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

const textareaClass =
  "w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3 text-[15px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

type Props = {
  clientId: string;
};

export default function ClientGuidanceNotes({ clientId }: Props) {
  const [notes, setNotes] = useState<GuidanceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [draftDate, setDraftDate] = useState(defaultGuidanceNoteDate);
  const [draftContent, setDraftContent] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await listGuidanceNotes(clientId);
        if (!cancelled) setNotes(next);
      } catch (err) {
        console.error("[ClientGuidanceNotes] load failed:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "指導メモの取得に失敗しました。",
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

  const startEdit = (note: GuidanceNote) => {
    setEditingId(note.id);
    setEditDate(note.noteDate);
    setEditContent(note.content);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDate("");
    setEditContent("");
  };

  const handleAdd = async () => {
    const content = draftContent.trim();
    if (!content || adding) return;

    setAdding(true);
    setError(null);
    try {
      const created = await createGuidanceNote(clientId, {
        content,
        noteDate: draftDate,
      });
      setNotes((current) =>
        sortGuidanceNotesChronological([...current, created]),
      );
      setDraftContent("");
      setDraftDate(defaultGuidanceNoteDate());
    } catch (err) {
      console.error("[ClientGuidanceNotes] create failed:", err);
      setError(
        err instanceof Error ? err.message : "指導メモの追加に失敗しました。",
      );
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async (noteId: string) => {
    const content = editContent.trim();
    if (!content || busyId) return;

    setBusyId(noteId);
    setError(null);
    try {
      const updated = await updateGuidanceNote(clientId, noteId, {
        content,
        noteDate: editDate,
      });
      setNotes((current) =>
        sortGuidanceNotesChronological(
          current.map((note) => (note.id === noteId ? updated : note)),
        ),
      );
      cancelEdit();
    } catch (err) {
      console.error("[ClientGuidanceNotes] update failed:", err);
      setError(
        err instanceof Error ? err.message : "指導メモの更新に失敗しました。",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (busyId) return;
    if (!window.confirm("この指導メモを削除しますか？")) return;

    setBusyId(noteId);
    setError(null);
    try {
      await deleteGuidanceNote(clientId, noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
      if (editingId === noteId) cancelEdit();
    } catch (err) {
      console.error("[ClientGuidanceNotes] delete failed:", err);
      setError(
        err instanceof Error ? err.message : "指導メモの削除に失敗しました。",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <p className="mb-5 max-w-xl text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
        指導内容を日付付きで残せます。時系列で表示され、あとから編集・削除できます。
      </p>

      {loading ? (
        <p className="text-sm text-slate-400">読み込み中...</p>
      ) : notes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#8a6a2d]/30 bg-[#faf7f1]/60 px-5 py-8 text-center text-sm text-slate-500">
          指導メモはまだありません。下のフォームから追加してください。
        </p>
      ) : (
        <ol className="relative space-y-0 border-l border-slate-200 pl-5 sm:pl-6">
          {notes.map((note) => {
            const isEditing = editingId === note.id;
            const isBusy = busyId === note.id;

            return (
              <li key={note.id} className="relative pb-6 last:pb-0">
                <span
                  className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white sm:-left-[1.65rem]"
                  style={{ backgroundColor: GOLD }}
                  aria-hidden
                />
                {isEditing ? (
                  <div className="rounded-2xl border border-slate-200 bg-[#fafaf8] p-4">
                    <label className="block">
                      <span className="text-[12px] font-semibold text-slate-500">
                        日付
                      </span>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(event) => setEditDate(event.target.value)}
                        disabled={isBusy}
                        className={`${inputClass} mt-1.5 max-w-[11rem]`}
                      />
                    </label>
                    <label className="mt-3 block">
                      <span className="text-[12px] font-semibold text-slate-500">
                        内容
                      </span>
                      <textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        disabled={isBusy}
                        rows={3}
                        className={`${textareaClass} mt-1.5`}
                        placeholder="例：飲酒量を減らす提案"
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(note.id)}
                        disabled={isBusy || !editContent.trim()}
                        className="inline-flex min-h-9 items-center justify-center rounded-full px-4 py-1.5 text-[12px] font-semibold text-white transition disabled:opacity-50"
                        style={{ backgroundColor: NAVY }}
                      >
                        {isBusy ? "保存中..." : "保存"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isBusy}
                        className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <time
                        dateTime={note.noteDate}
                        className="text-[15px] font-semibold tracking-[-0.02em]"
                        style={{ color: NAVY }}
                      >
                        {formatGuidanceNoteDate(note.noteDate)}
                      </time>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(note)}
                          disabled={Boolean(busyId)}
                          className="text-[12px] font-medium text-slate-400 transition hover:text-[#8a6a2d] disabled:opacity-50"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(note.id)}
                          disabled={isBusy}
                          className="text-[12px] font-medium text-slate-400 transition hover:text-rose-600 disabled:opacity-50"
                        >
                          {isBusy ? "削除中..." : "削除"}
                        </button>
                      </div>
                    </div>
                    <p
                      className="mt-1.5 whitespace-pre-wrap text-[14px] leading-7 text-slate-700 sm:text-[15px]"
                    >
                      {note.content}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 rounded-2xl border border-slate-100 bg-[#fafaf8] p-4 sm:p-5">
        <p
          className="text-[11px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          ADD NOTE
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[11rem_1fr]">
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-500">日付</span>
            <input
              type="date"
              value={draftDate}
              onChange={(event) => setDraftDate(event.target.value)}
              disabled={adding}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-500">内容</span>
            <textarea
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              disabled={adding}
              rows={2}
              className={`${textareaClass} mt-1.5`}
              placeholder="例：飲酒量を減らす提案"
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={adding || !draftContent.trim()}
            className="inline-flex min-h-10 items-center justify-center rounded-full px-5 py-2 text-[13px] font-semibold text-white transition disabled:opacity-50"
            style={{ backgroundColor: NAVY }}
          >
            {adding ? "追加中..." : "メモを追加"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
