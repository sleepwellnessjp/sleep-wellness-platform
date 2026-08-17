"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SleepContentForm from "@/components/sleep-content/SleepContentForm";
import AdminShell from "@/components/AdminShell";
import type { SleepContent } from "@/lib/sleep-content/types";

export default function AdminSleepContentEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [content, setContent] = useState<SleepContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    void fetch(`/api/admin/sleep-content/${params.id}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const json = (await response.json()) as {
          content?: SleepContent;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setContent(json.content ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      });
  }, [params.id]);

  return (
    <AdminShell
      title="コンテンツを編集"
      description="タイトルや本文、公開状態を更新できます。slug は変更できません。"
    >
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!content && !error ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : null}
      {content ? (
        <SleepContentForm
          initial={content}
          slugLocked
          submitLabel="公開する"
          onSubmit={async (payload, status) => {
            const response = await fetch(
              `/api/admin/sleep-content/${content.id}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: payload, status }),
              },
            );
            const json = (await response.json()) as { error?: string };
            if (!response.ok) {
              throw new Error(json.error ?? "更新に失敗しました");
            }
            router.push("/admin/sleep-content");
            router.refresh();
          }}
        />
      ) : null}
    </AdminShell>
  );
}
