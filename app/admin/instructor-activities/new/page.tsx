"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ActivityForm from "@/components/instructor-activities/ActivityForm";
import AdminShell from "@/components/AdminShell";
import type { AssignableInstructorOption } from "@/lib/instructor-activities/types";

export default function AdminNewInstructorActivityPage() {
  const router = useRouter();
  const [instructors, setInstructors] = useState<AssignableInstructorOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/instructor-activities/instructors", {
      cache: "no-store",
    })
      .then(async (response) => {
        const json = (await response.json()) as {
          instructors?: AssignableInstructorOption[];
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

  return (
    <AdminShell
      title="新しいイベントを登録"
      description="担当の認定インストラクターを選んで登録します。公開すると活動一覧と詳細ページに表示され、トップページ掲載をONにすると「認定インストラクター関連情報」に優先表示されます。"
    >
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">認定講師を読み込み中…</p>
      ) : null}
      {!loading && !error && instructors.length === 0 ? (
        <p className="text-sm text-slate-500">
          登録できる認定講師がありません。先に認定講師を登録してください。
        </p>
      ) : null}
      {instructors.length > 0 ? (
        <ActivityForm
          instructorName="認定インストラクター"
          instructorOptions={instructors}
          showFeatured
          submitLabel="登録して公開"
          draftLabel="下書き保存"
          onSubmit={async (activity, status) => {
            const response = await fetch("/api/admin/instructor-activities", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                activity,
                status,
                instructorId: activity.instructorId,
              }),
            });
            const json = (await response.json()) as { error?: string };
            if (!response.ok) {
              throw new Error(json.error ?? "登録に失敗しました");
            }
            router.push("/admin/instructor-activities");
            router.refresh();
          }}
        />
      ) : null}
    </AdminShell>
  );
}
