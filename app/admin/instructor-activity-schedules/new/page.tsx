"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type { ScheduleInstructorOption } from "@/lib/instructor-activity-schedules/types";
import type { InstructorActivityScheduleInput } from "@/lib/instructor-activity-schedules/types";

const labelClass = "block text-[12px] font-semibold text-slate-600";
const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] text-[#071426] outline-none focus:border-[#8a6a2d]";

export default function AdminNewInstructorActivitySchedulePage() {
  const router = useRouter();
  const [instructors, setInstructors] = useState<ScheduleInstructorOption[]>(
    [],
  );
  const [instructorId, setInstructorId] = useState("");
  const [form, setForm] = useState<InstructorActivityScheduleInput>({
    activityDate: "",
    title: "",
    summary: "",
    externalUrl: "",
    published: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/instructor-activity-schedules/instructors", {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        const json = (await response.json()) as {
          instructors?: ScheduleInstructorOption[];
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "講師一覧の取得に失敗しました");
        setInstructors(json.instructors ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "講師一覧の取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/instructor-activity-schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructorId,
          schedule: {
            ...form,
            instructorId,
            published: form.published !== false,
          },
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "登録に失敗しました");
      router.push("/admin/instructor-activity-schedules");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="活動予定を代理登録"
      description="担当の認定インストラクターを選んで活動予定を登録します。公開するとトップページの「認定インストラクターの活動予定」に文字のみ表示されます。"
    >
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">認定講師を読み込み中…</p>
      ) : null}
      {!loading && instructors.length === 0 && !error ? (
        <p className="text-sm text-slate-500">
          登録できる認定講師がありません。先に認定講師を登録してください。
        </p>
      ) : null}
      {instructors.length > 0 ? (
        <div className="max-w-2xl space-y-4">
          <label className="block">
            <span className={labelClass}>担当認定インストラクター（必須）</span>
            <select
              className={inputClass}
              value={instructorId}
              onChange={(event) => setInstructorId(event.target.value)}
            >
              <option value="">選択してください</option>
              {instructors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.email ? `（${item.email}）` : ""}
                </option>
              ))}
            </select>
          </label>
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
                setForm((current) => ({ ...current, title: event.target.value }))
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
          <label className="flex items-center gap-2 text-sm" style={{ color: NAVY }}>
            <input
              type="checkbox"
              checked={form.published !== false}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  published: event.target.checked,
                }))
              }
            />
            公開する（トップページに表示）
          </label>
          <p className="text-[12px]" style={{ color: GOLD }}>
            公開した予定は文字情報のみ、最大6件がトップページに表示されます。
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white disabled:opacity-60"
            style={{ background: NAVY }}
          >
            {saving ? "保存中…" : "登録する"}
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}
