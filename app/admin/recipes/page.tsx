"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type { Recipe } from "@/lib/recipes/types";

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/recipes", { cache: "no-store" });
      const json = (await response.json()) as {
        recipes?: Recipe[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setRecipes(json.recipes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(
    () =>
      recipes
        .slice()
        .sort((a, b) =>
          a.sortOrder === b.sortOrder
            ? a.title.localeCompare(b.title, "ja")
            : a.sortOrder - b.sortOrder,
        ),
    [recipes],
  );

  const patchPublished = async (id: string, isPublished: boolean) => {
    const response = await fetch(`/api/admin/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "更新に失敗しました");
      return;
    }
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("このレシピを削除しますか？")) return;
    const response = await fetch(`/api/admin/recipes/${id}`, {
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
      title="睡眠レシピ"
      description="睡眠レシピの登録・編集・公開切替ができます。"
      actions={
        <Link
          href="/admin/recipes/new"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white sm:w-auto"
          style={{ backgroundColor: NAVY }}
        >
          ＋ 新しいレシピを登録
        </Link>
      }
    >
      <SectionCard>
        <h2 className="text-base font-semibold" style={{ color: NAVY }}>
          全レシピ
        </h2>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">読み込み中…</p>
        ) : sorted.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">レシピはまだありません。</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {sorted.map((item) => (
              <li key={item.id} className="py-4">
                <p
                  className="text-[11px] font-semibold tracking-[0.16em]"
                  style={{ color: GOLD }}
                >
                  並び {item.sortOrder}
                  {` · ${item.isPublished ? "公開中" : "非公開"}`}
                </p>
                <p className="mt-1 font-semibold" style={{ color: NAVY }}>
                  {item.title}
                </p>
                {item.servings ? (
                  <p className="mt-1 text-sm text-slate-500">{item.servings}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/recipes/${item.id}`}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                    style={{ color: NAVY }}
                  >
                    編集
                  </Link>
                  {item.isPublished ? (
                    <button
                      type="button"
                      onClick={() => void patchPublished(item.id, false)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                      style={{ color: NAVY }}
                    >
                      非公開
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void patchPublished(item.id, true)}
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
