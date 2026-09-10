"use client";

import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import RecipeForm from "@/components/recipes/RecipeForm";

export default function AdminNewRecipePage() {
  const router = useRouter();

  return (
    <AdminShell
      title="新しいレシピを登録"
      description="料理名・材料・作り方を登録します。"
    >
      <RecipeForm
        submitLabel="保存する"
        onSubmit={async (recipe) => {
          const response = await fetch("/api/admin/recipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipe }),
          });
          const json = (await response.json()) as { error?: string };
          if (!response.ok) {
            throw new Error(json.error ?? "登録に失敗しました");
          }
          router.push("/admin/recipes");
          router.refresh();
        }}
      />
    </AdminShell>
  );
}
