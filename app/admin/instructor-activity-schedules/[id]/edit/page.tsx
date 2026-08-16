"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type {
  InstructorActivitySchedule,
  InstructorActivityScheduleInput,
} from "@/lib/instructor-activity-schedules/types";

const labelClass = "block text-[12px] font-semibold text-slate-600";
const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] text-[#071426] outline-none focus:border-[#8a6a2d]";

export default function AdminInstructorActivityScheduleEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [schedule, setSchedule] = useState<InstructorActivitySchedule | null>(
    null,
  );
  const [form, setForm] = useState<InstructorActivityScheduleInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    void fetch(`/api/admin/instructor-activity-schedules/${params.id}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        const json = (await response.json()) as {
          schedule?: InstructorActivitySchedule;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        const next = json.schedule ?? null;
        setSchedule(next);
        if (next) {
          setForm({
            activityDate: next.activityDate,
            title: next.title,
            summary: next.summary,
            externalUrl: next.externalUrl,
            published: next.published,
          });
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      });
  }, [params.id]);

  const save = async () => {
    if (!schedule || !form) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/instructor-activity-schedules/${schedule.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedule: form }),
        },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "更新に失敗しました");
      router.push("/admin/instructor-activity-schedules");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="活動予定を編集"
      description="本部として活動予定を編集できます。講師の紐づけは変更しません。"
    >
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!schedule && !error ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : null}
      {schedule && form ? (
        <div className="max-w-2xl space-y-4">
          <p className="text-sm" style={{ color: GOLD }}>
            {schedule.instructorName}
          </p>
          <label className="block">
            <span className={labelClass}>日付（必須）</span>
            <input
              type="date"
              className={inputClass}
              value={form.activityDate}
              onChange={(event) =>
                setForm((current) =>
                  current
                    ? { ...current, activityDate: event.target.value }
                    : current,
                )
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
                setForm((current) =>
                  current ? { ...current, title: event.target.value } : current,
                )
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
                setForm((current) =>
                  current
                    ? { ...current, summary: event.target.value }
                    : current,
                )
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
                setForm((current) =>
                  current
                    ? { ...current, externalUrl: event.target.value }
                    : current,
                )
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: NAVY }}>
            <input
              type="checkbox"
              checked={form.published !== false}
              onChange={(event) =>
                setForm((current) =>
                  current
                    ? { ...current, published: event.target.checked }
                    : current,
                )
              }
            />
            公開する（トップページに表示）
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white disabled:opacity-60"
            style={{ background: NAVY }}
          >
            {saving ? "保存中…" : "更新する"}
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
