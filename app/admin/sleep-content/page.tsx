"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  SLEEP_CONTENT_CATEGORIES,
  SLEEP_CONTENT_CATEGORY_LABELS,
  SLEEP_CONTENT_KIND_LABELS,
  SLEEP_CONTENT_SUBCATEGORIES,
  SLEEP_CONTENT_SUBCATEGORY_LABELS,
  type SleepContent,
  type SleepContentCategory,
  type SleepContentStatus,
  type SleepContentSubcategory,
} from "@/lib/sleep-content/types";

function statusLabel(status: SleepContentStatus): string {
  if (status === "published") return "公開中";
  if (status === "archived") return "非公開";
  return "下書き";
}

export default function AdminSleepContentPage() {
  const [contents, setContents] = useState<SleepContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | SleepContentCategory>(
    "all",
  );
  const [subcategoryFilter, setSubcategoryFilter] = useState<
    "all" | SleepContentSubcategory
  >("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/sleep-content", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        contents?: SleepContent[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setContents(json.contents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return contents
      .filter((item) =>
        categoryFilter === "all" ? true : item.category === categoryFilter,
      )
      .filter((item) => {
        if (subcategoryFilter === "all") return true;
        return item.subcategory === subcategoryFilter;
      })
      .slice()
      .sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        const subA = a.subcategory ?? "";
        const subB = b.subcategory ?? "";
        if (subA !== subB) return subA.localeCompare(subB);
        return a.sortOrder - b.sortOrder;
      });
  }, [contents, categoryFilter, subcategoryFilter]);

  const showSubcategoryFilter =
    categoryFilter === "all" || categoryFilter === "science";

  const patchStatus = async (id: string, status: SleepContentStatus) => {
    const response = await fetch(`/api/admin/sleep-content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "更新に失敗しました");
      return;
    }
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("このコンテンツを削除しますか？")) return;
    const response = await fetch(`/api/admin/sleep-content/${id}`, {
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
      title="睡眠コンテンツ"
      description="入眠・睡眠学・インタビューの公開コンテンツを登録・編集・公開切替できます。"
      actions={
        <Link
          href="/admin/sleep-content/new"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white sm:w-auto"
          style={{ backgroundColor: NAVY }}
        >
          ＋ 新しいコンテンツを登録
        </Link>
      }
    >
      <SectionCard>
        <h2 className="text-base font-semibold" style={{ color: NAVY }}>
          全コンテンツ
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select
            value={categoryFilter}
            onChange={(event) => {
              const value = event.target.value as "all" | SleepContentCategory;
              setCategoryFilter(value);
              if (value !== "all" && value !== "science") {
                setSubcategoryFilter("all");
              }
            }}
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
            aria-label="カテゴリ絞り込み"
          >
            <option value="all">すべてのカテゴリ</option>
            {SLEEP_CONTENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {SLEEP_CONTENT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
          {showSubcategoryFilter ? (
            <select
              value={subcategoryFilter}
              onChange={(event) =>
                setSubcategoryFilter(
                  event.target.value as "all" | SleepContentSubcategory,
                )
              }
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
              aria-label="サブカテゴリ絞り込み"
            >
              <option value="all">すべてのサブカテゴリ</option>
              {SLEEP_CONTENT_SUBCATEGORIES.map((subcategory) => (
                <option key={subcategory} value={subcategory}>
                  {SLEEP_CONTENT_SUBCATEGORY_LABELS[subcategory]}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">読み込み中…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            該当するコンテンツはありません。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {filtered.map((item) => (
              <li key={item.id} className="py-4">
                <p
                  className="text-[11px] font-semibold tracking-[0.16em]"
                  style={{ color: GOLD }}
                >
                  {SLEEP_CONTENT_CATEGORY_LABELS[item.category]}
                  {item.subcategory
                    ? ` / ${SLEEP_CONTENT_SUBCATEGORY_LABELS[item.subcategory]}`
                    : ""}
                  {` · ${SLEEP_CONTENT_KIND_LABELS[item.kind]}`}
                  {` · 並び ${item.sortOrder}`}
                </p>
                <p className="mt-1 font-semibold" style={{ color: NAVY }}>
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {statusLabel(item.status)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/sleep-content/${item.id}/edit`}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                    style={{ color: NAVY }}
                  >
                    編集
                  </Link>
                  {item.status === "published" ? (
                    <button
                      type="button"
                      onClick={() => void patchStatus(item.id, "draft")}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                      style={{ color: NAVY }}
                    >
                      非公開
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void patchStatus(item.id, "published")}
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
