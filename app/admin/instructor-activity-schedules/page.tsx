"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { formatScheduleDateLabel } from "@/lib/instructor-activity-schedules/format";
import type { InstructorActivitySchedule } from "@/lib/instructor-activity-schedules/types";

export default function AdminInstructorActivitySchedulesPage() {
  const [schedules, setSchedules] = useState<InstructorActivitySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/instructor-activity-schedules", {
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

  const patchPublished = async (id: string, published: boolean) => {
    const response = await fetch(
      `/api/admin/instructor-activity-schedules/${id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      },
    );
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "更新に失敗しました");
      return;
    }
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("この活動予定を削除しますか？")) return;
    const response = await fetch(
      `/api/admin/instructor-activity-schedules/${id}`,
      { method: "DELETE", credentials: "include" },
    );
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "削除に失敗しました");
      return;
    }
    await load();
  };

  return (
    <AdminShell
      title="認定インストラクターの活動予定"
      description="全認定インストラクターの活動予定を本部で確認・代理登録・編集・削除・公開切替できます。"
      actions={
        <Link
          href="/admin/instructor-activity-schedules/new"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white sm:w-auto"
          style={{ backgroundColor: NAVY }}
        >
          ＋ 活動予定を代理登録
        </Link>
      }
    >
      <SectionCard>
        <h2 className="text-base font-semibold" style={{ color: NAVY }}>
          全活動予定
        </h2>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">読み込み中…</p>
        ) : schedules.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            登録された活動予定はまだありません。上のボタンから登録できます。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {schedules.map((item) => (
              <li key={item.id} className="py-4">
                <p
                  className="text-[11px] font-semibold tracking-[0.16em]"
                  style={{ color: GOLD }}
                >
                  {item.instructorName}
                </p>
                <p className="mt-1 font-semibold" style={{ color: NAVY }}>
                  {formatScheduleDateLabel(item.activityDate)} {item.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.published ? "公開中" : "非公開"}
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
                  <Link
                    href={`/admin/instructor-activity-schedules/${item.id}/edit`}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                    style={{ color: NAVY }}
                  >
                    編集
                  </Link>
                  {item.published ? (
                    <button
                      type="button"
                      onClick={() => void patchPublished(item.id, false)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                      style={{ color: NAVY }}
                    >
                      非公開
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void patchPublished(item.id, true)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                      style={{ color: NAVY }}
                    >
                      公開
                    </button>
                  )}
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
    </AdminShell>
  );
}
