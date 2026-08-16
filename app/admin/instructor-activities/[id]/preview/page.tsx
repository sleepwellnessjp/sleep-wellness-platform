"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ActivityDetailView from "@/components/instructor-activities/ActivityDetailView";
import AdminShell from "@/components/AdminShell";
import { NAVY } from "@/components/ui/tokens";
import type { InstructorActivity } from "@/lib/instructor-activities/types";

export default function AdminInstructorActivityPreviewPage() {
  const params = useParams<{ id: string }>();
  const [activity, setActivity] = useState<InstructorActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    void fetch(`/api/admin/instructor-activities/${params.id}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const json = (await response.json()) as {
          activity?: InstructorActivity;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setActivity(json.activity ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      });
  }, [params.id]);

  return (
    <AdminShell
      title="イベントプレビュー"
      description="一般公開前の表示確認です。下書きは講師本人と本部のみが見られます。"
    >
      {activity && activity.status !== "published" ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          下書きです。一般ページには表示されていません。
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!activity && !error ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : null}
      {activity ? (
        <div>
          <ActivityDetailView activity={activity} showBack={false} />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/admin/instructor-activities/${activity.id}/edit`}
              className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-white"
              style={{ background: NAVY }}
            >
              編集する
            </Link>
            <Link
              href="/admin/instructor-activities"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-semibold"
              style={{ color: NAVY }}
            >
              一覧へ戻る
            </Link>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
