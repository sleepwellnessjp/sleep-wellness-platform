"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { formatEventDateLabel } from "@/lib/instructor-activities/format";
import type { InstructorActivity } from "@/lib/instructor-activities/types";

function statusLabel(status: InstructorActivity["status"]): string {
  if (status === "published") return "公開中";
  if (status === "archived") return "非公開";
  return "下書き";
}

function previewHref(item: InstructorActivity): string {
  if (item.status === "published" && item.slug) {
    return `/instructor-activities/${item.slug}`;
  }
  return `/admin/instructor-activities/${item.id}/preview`;
}

export default function AdminInstructorActivitiesPage() {
  const [activities, setActivities] = useState<InstructorActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/instructor-activities", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        activities?: InstructorActivity[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setActivities(json.activities ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const patchStatus = async (
    id: string,
    status: InstructorActivity["status"],
  ) => {
    const response = await fetch(`/api/admin/instructor-activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "更新に失敗しました");
      return;
    }
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("このイベントを削除しますか？")) return;
    const response = await fetch(`/api/admin/instructor-activities/${id}`, {
      method: "DELETE",
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "削除に失敗しました");
      return;
    }
    await load();
  };

  return (
    <AdminShell
      title="認定講師イベント管理"
      description="認定インストラクターのイベントを本部で登録・一覧確認・公開切替・編集・削除できます。"
      actions={
        <Link
          href="/admin/instructor-activities/new"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white sm:w-auto"
          style={{ backgroundColor: NAVY }}
        >
          ＋ 新しいイベントを登録
        </Link>
      }
    >
      <SectionCard>
        <h2 className="text-base font-semibold" style={{ color: NAVY }}>
          全イベント
        </h2>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">読み込み中…</p>
        ) : activities.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            登録されたイベントはまだありません。上のボタンから登録できます。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {activities.map((item) => (
              <li key={item.id} className="py-4">
                <p
                  className="text-[11px] font-semibold tracking-[0.16em]"
                  style={{ color: GOLD }}
                >
                  {item.instructorName}
                </p>
                <p className="mt-1 font-semibold" style={{ color: NAVY }}>
                  {formatEventDateLabel(item.eventDate)} {item.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {statusLabel(item.status)}
                  {item.featured ? " · トップページ掲載" : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/instructor-activities/${item.id}/edit`}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                    style={{ color: NAVY }}
                  >
                    編集
                  </Link>
                  <Link
                    href={previewHref(item)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                    style={{ color: NAVY }}
                  >
                    プレビュー
                  </Link>
                  {item.status === "published" ? (
                    <button
                      type="button"
                      onClick={() => void patchStatus(item.id, "draft")}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                      style={{ color: NAVY }}
                    >
                      非公開
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void patchStatus(item.id, "published")}
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
