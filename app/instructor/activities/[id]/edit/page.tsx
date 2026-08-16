"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ActivityForm from "@/components/instructor-activities/ActivityForm";
import InstructorNav from "@/components/InstructorNav";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type { InstructorActivity } from "@/lib/instructor-activities/types";

export default function EditInstructorActivityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <p
          className="text-[11px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          EDIT EVENT
        </p>
        <h1
          className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          イベントを編集
        </h1>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {!activity && !error ? (
          <p className="mt-4 text-sm text-slate-500">読み込み中…</p>
        ) : null}
        {activity ? (
          <div className="mt-6">
            <ActivityForm
              instructorName={activity.instructorName}
              initial={activity}
              submitLabel="公開する"
              onSubmit={async (payload, status) => {
                const response = await fetch(
                  `/api/instructor/activities/${activity.id}`,
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
                router.push("/instructor/activities");
                router.refresh();
              }}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
