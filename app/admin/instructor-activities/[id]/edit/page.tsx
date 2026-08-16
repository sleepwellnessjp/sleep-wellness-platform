"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ActivityForm from "@/components/instructor-activities/ActivityForm";
import AdminShell from "@/components/AdminShell";
import type { InstructorActivity } from "@/lib/instructor-activities/types";

export default function AdminInstructorActivityEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
      title="イベントを編集"
      description="本部として、認定インストラクターが登録したイベントを編集できます。講師の紐づけは変更しません。"
    >
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!activity && !error ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : null}
      {activity ? (
        <ActivityForm
          instructorName={activity.instructorName}
          initial={activity}
          showFeatured
          submitLabel="公開する"
          onSubmit={async (payload, status) => {
            const response = await fetch(
              `/api/admin/instructor-activities/${activity.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activity: payload, status }),
              },
            );
            const json = (await response.json()) as { error?: string };
            if (!response.ok) {
              throw new Error(json.error ?? "更新に失敗しました");
            }
            router.push("/admin/instructor-activities");
            router.refresh();
          }}
        />
      ) : null}
    </AdminShell>
  );
}
