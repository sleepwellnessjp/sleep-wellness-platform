"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import RecipeForm from "@/components/recipes/RecipeForm";
import type { Recipe } from "@/lib/recipes/types";

export default function AdminRecipeEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    void fetch(`/api/admin/recipes/${params.id}`, { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          recipe?: Recipe;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setRecipe(json.recipe ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      });
  }, [params.id]);

  return (
    <AdminShell
      title="レシピを編集"
      description="料理名・材料・作り方・公開状態を更新できます。"
    >
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!recipe && !error ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : null}
      {recipe ? (
        <RecipeForm
          initial={recipe}
          submitLabel="保存する"
          onSubmit={async (payload) => {
            const response = await fetch(`/api/admin/recipes/${recipe.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipe: payload }),
            });
            const json = (await response.json()) as { error?: string };
            if (!response.ok) {
              throw new Error(json.error ?? "更新に失敗しました");
            }
            router.push("/admin/recipes");
            router.refresh();
          }}
        />
      ) : null}
    </AdminShell>
  );
}
