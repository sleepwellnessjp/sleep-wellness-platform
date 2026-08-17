"use client";

import { useRouter } from "next/navigation";
import SleepContentForm from "@/components/sleep-content/SleepContentForm";
import AdminShell from "@/components/AdminShell";

export default function AdminNewSleepContentPage() {
  const router = useRouter();

  return (
    <AdminShell
      title="新しいコンテンツを登録"
      description="入眠・睡眠学・インタビューのコンテンツを追加します。"
    >
      <SleepContentForm
        submitLabel="登録して公開"
        draftLabel="下書き保存"
        onSubmit={async (content, status) => {
          const response = await fetch("/api/admin/sleep-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, status }),
          });
          const json = (await response.json()) as { error?: string };
          if (!response.ok) {
            throw new Error(json.error ?? "登録に失敗しました");
          }
          router.push("/admin/sleep-content");
          router.refresh();
        }}
      />
    </AdminShell>
  );
}
