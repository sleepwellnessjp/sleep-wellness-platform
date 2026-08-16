"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ActivityDetailView from "@/components/instructor-activities/ActivityDetailView";
import InstructorNav from "@/components/InstructorNav";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type { InstructorActivity } from "@/lib/instructor-activities/types";

export default function InstructorActivityPreviewPage() {
  const params = useParams<{ id: string }>();
  const [activity, setActivity] = useState<InstructorActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    void fetch(`/api/instructor/activities/${params.id}`, { cache: "no-store" })
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
    <div className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p
          className="text-[11px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          PREVIEW
        </p>
        <h1
          className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          イベントプレビュー
        </h1>
        {activity && activity.status !== "published" ? (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            これは下書きプレビューです。一般ページにはまだ表示されません。
          </p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {!activity && !error ? (
          <p className="mt-4 text-sm text-slate-500">読み込み中…</p>
        ) : null}
        {activity ? (
          <div className="mt-6">
            <ActivityDetailView activity={activity} showBack={false} />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/instructor/activities/${activity.id}/edit`}
                className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-white"
                style={{ background: NAVY }}
              >
                編集する
              </Link>
              <Link
                href="/instructor/activities"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 px-6 text-sm font-semibold"
                style={{ color: NAVY }}
              >
                管理画面へ戻る
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
