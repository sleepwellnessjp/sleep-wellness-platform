"use client";

import { useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { formatScheduleDateLabel } from "@/lib/instructor-activity-schedules/format";
import type {
  InstructorActivitySchedule,
  InstructorActivityScheduleInput,
} from "@/lib/instructor-activity-schedules/types";

const EMPTY_FORM: InstructorActivityScheduleInput = {
  activityDate: "",
  title: "",
  summary: "",
  externalUrl: "",
};

const labelClass = "block text-[12px] font-semibold text-slate-600";
const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] text-[#071426] outline-none focus:border-[#8a6a2d]";

export default function InstructorActivitySchedulesPage() {
  const [schedules, setSchedules] = useState<InstructorActivitySchedule[]>([]);
  const [form, setForm] = useState<InstructorActivityScheduleInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/instructor/activity-schedules", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await response.json()) as {
        schedules?: InstructorActivitySchedule[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setSchedules(json.schedules ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        editingId
          ? `/api/instructor/activity-schedules/${editingId}`
          : "/api/instructor/activity-schedules",
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedule: form }),
        },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "保存に失敗しました");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("この活動予定を削除しますか？")) return;
    setError(null);
    const response = await fetch(`/api/instructor/activity-schedules/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "削除に失敗しました");
      return;
    }
    if (editingId === id) resetForm();
    await load();
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p
          className="text-[11px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          SCHEDULE
        </p>
        <h1
          className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          活動予定
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          ご自身の活動予定だけを登録・編集できます。トップページには文字情報のみ、新しい予定から最大6件表示されます。
        </p>

        <SectionCard className="mt-8">
          <h2 className="text-base font-semibold" style={{ color: NAVY }}>
            {editingId ? "活動予定を編集" : "新しい活動予定"}
          </h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className={labelClass}>日付（必須）</span>
              <input
                type="date"
                className={inputClass}
                value={form.activityDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    activityDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block">
              <span className={labelClass}>活動タイトル（必須）</span>
              <input
                type="text"
                maxLength={80}
                className={inputClass}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block">
              <span className={labelClass}>短い説明（必須）</span>
              <textarea
                maxLength={160}
                rows={3}
                className={`${inputClass} py-2.5`}
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block">
              <span className={labelClass}>
                外部リンク（ホームページ / Instagram 等・必須）
              </span>
              <input
                type="url"
                inputMode="url"
                placeholder="https://"
                className={inputClass}
                value={form.externalUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    externalUrl: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {saving ? "保存中…" : editingId ? "更新する" : "登録する"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-[15px] font-semibold"
                style={{ color: NAVY }}
              >
                新規登録に戻る
              </button>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard className="mt-8">
          <h2 className="text-base font-semibold" style={{ color: NAVY }}>
            あなたの活動予定
          </h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">読み込み中…</p>
          ) : schedules.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              まだ登録された活動予定はありません。
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {schedules.map((item) => (
                <li key={item.id} className="py-4">
                  <p className="text-xs font-semibold" style={{ color: GOLD }}>
                    {formatScheduleDateLabel(item.activityDate)}
                  </p>
                  <p className="mt-1 font-semibold" style={{ color: NAVY }}>
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {item.summary}
                  </p>
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block break-all text-sm underline underline-offset-2"
                    style={{ color: GOLD }}
                  >
                    {item.externalUrl}
                  </a>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({
                          activityDate: item.activityDate,
                          title: item.title,
                          summary: item.summary,
                          externalUrl: item.externalUrl,
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                      style={{ color: NAVY }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item.id)}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                    >
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </main>
    </div>
  );
}
