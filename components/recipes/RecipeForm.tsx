"use client";

import { FormEvent, useState } from "react";
import { NAVY } from "@/components/ui/tokens";
import type {
  Recipe,
  RecipeIngredientGroup,
  RecipeInput,
} from "@/lib/recipes/types";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#8a6a2d] focus:ring-4 focus:ring-[#8a6a2d]/15";
const labelClass = "text-sm font-semibold text-[#071426]";
const secondaryBtn =
  "rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#071426]";

type FormState = {
  title: string;
  lead: string;
  servings: string;
  imagePath: string;
  imageUrl: string;
  ingredientGroups: RecipeIngredientGroup[];
  steps: string[];
  onePoint: string;
  isPublished: boolean;
  sortOrder: string;
};

function emptyGroup(): RecipeIngredientGroup {
  return { label: "", items: [{ name: "", amount: "" }] };
}

function emptyForm(): FormState {
  return {
    title: "",
    lead: "",
    servings: "",
    imagePath: "",
    imageUrl: "",
    ingredientGroups: [emptyGroup()],
    steps: [""],
    onePoint: "",
    isPublished: false,
    sortOrder: "0",
  };
}

function fromRecipe(recipe: Recipe): FormState {
  return {
    title: recipe.title,
    lead: recipe.lead,
    servings: recipe.servings,
    imagePath: recipe.imagePath,
    imageUrl: recipe.imageUrl,
    ingredientGroups:
      recipe.ingredientGroups.length > 0
        ? recipe.ingredientGroups.map((group) => ({
            label: group.label ?? "",
            items:
              group.items.length > 0
                ? group.items.map((item) => ({ ...item }))
                : [{ name: "", amount: "" }],
          }))
        : [emptyGroup()],
    steps: recipe.steps.length > 0 ? [...recipe.steps] : [""],
    onePoint: recipe.onePoint,
    isPublished: recipe.isPublished,
    sortOrder: String(recipe.sortOrder),
  };
}

function toInput(form: FormState): RecipeInput {
  const sortOrder = Number.parseInt(form.sortOrder, 10);
  return {
    title: form.title,
    lead: form.lead,
    servings: form.servings,
    imagePath: form.imagePath,
    ingredientGroups: form.ingredientGroups.map((group) => ({
      label: group.label?.trim() ? group.label : undefined,
      items: group.items,
    })),
    steps: form.steps,
    onePoint: form.onePoint,
    isPublished: form.isPublished,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

export default function RecipeForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Recipe | null;
  submitLabel: string;
  onSubmit: (recipe: RecipeInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    initial ? fromRecipe(initial) : emptyForm(),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateGroup = (
    groupIndex: number,
    updater: (group: RecipeIngredientGroup) => RecipeIngredientGroup,
  ) => {
    setForm((prev) => ({
      ...prev,
      ingredientGroups: prev.ingredientGroups.map((group, index) =>
        index === groupIndex ? updater(group) : group,
      ),
    }));
  };

  const uploadImage = async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/admin/recipes/image", {
      method: "POST",
      body,
    });
    const json = (await response.json()) as {
      path?: string;
      url?: string;
      error?: string;
    };
    if (!response.ok || !json.path || !json.url) {
      throw new Error(json.error ?? "画像のアップロードに失敗しました");
    }
    setField("imagePath", json.path);
    setField("imageUrl", json.url);
  };

  const onPickImage = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await uploadImage(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像の処理に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit(toInput(form));
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
      <label className="block">
        <span className={labelClass}>料理名（必須）</span>
        <input
          className={inputClass}
          value={form.title}
          onChange={(event) => setField("title", event.target.value)}
          required
        />
      </label>

      <div>
        <p className={labelClass}>写真</p>
        <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[#8a6a2d]/40 bg-[#fbf9f4] px-4 py-4 text-sm font-semibold text-[#8a6a2d]">
          画像を選択
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={(event) => {
              void onPickImage(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {form.imageUrl ? (
          <img
            src={form.imageUrl}
            alt="レシピ写真プレビュー"
            className="mt-3 max-h-56 w-full rounded-2xl object-contain bg-slate-50"
          />
        ) : null}
        {form.imagePath ? (
          <p className="mt-2 break-all text-xs text-slate-500">{form.imagePath}</p>
        ) : null}
        {form.imagePath ? (
          <button
            type="button"
            className={`${secondaryBtn} mt-2`}
            onClick={() => {
              setField("imagePath", "");
              setField("imageUrl", "");
            }}
          >
            写真をクリア
          </button>
        ) : null}
      </div>

      <label className="block">
        <span className={labelClass}>リード文</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={form.lead}
          onChange={(event) => setField("lead", event.target.value)}
          placeholder="2〜3行の紹介文"
        />
      </label>

      <label className="block">
        <span className={labelClass}>何人前</span>
        <input
          className={inputClass}
          value={form.servings}
          onChange={(event) => setField("servings", event.target.value)}
          placeholder="例：2人分"
        />
      </label>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={labelClass}>材料</p>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                ingredientGroups: [...prev.ingredientGroups, emptyGroup()],
              }))
            }
          >
            グループを追加
          </button>
        </div>
        {form.ingredientGroups.map((group, groupIndex) => (
          <div
            key={`group-${groupIndex}`}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500">
                  グループ名（任意）
                </span>
                <input
                  className={inputClass}
                  value={group.label ?? ""}
                  onChange={(event) =>
                    updateGroup(groupIndex, (current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder="例：スパイス / 調味料"
                />
              </label>
              <button
                type="button"
                className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    ingredientGroups:
                      prev.ingredientGroups.length <= 1
                        ? [emptyGroup()]
                        : prev.ingredientGroups.filter(
                            (_, index) => index !== groupIndex,
                          ),
                  }))
                }
              >
                グループ削除
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {group.items.map((item, itemIndex) => (
                <li
                  key={`item-${groupIndex}-${itemIndex}`}
                  className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    className={inputClass}
                    value={item.name}
                    onChange={(event) =>
                      updateGroup(groupIndex, (current) => ({
                        ...current,
                        items: current.items.map((row, index) =>
                          index === itemIndex
                            ? { ...row, name: event.target.value }
                            : row,
                        ),
                      }))
                    }
                    placeholder="材料名"
                  />
                  <input
                    className={inputClass}
                    value={item.amount}
                    onChange={(event) =>
                      updateGroup(groupIndex, (current) => ({
                        ...current,
                        items: current.items.map((row, index) =>
                          index === itemIndex
                            ? { ...row, amount: event.target.value }
                            : row,
                        ),
                      }))
                    }
                    placeholder="分量"
                  />
                  <button
                    type="button"
                    className={`${secondaryBtn} mt-2`}
                    onClick={() =>
                      updateGroup(groupIndex, (current) => ({
                        ...current,
                        items:
                          current.items.length <= 1
                            ? [{ name: "", amount: "" }]
                            : current.items.filter(
                                (_, index) => index !== itemIndex,
                              ),
                      }))
                    }
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${secondaryBtn} mt-3`}
              onClick={() =>
                updateGroup(groupIndex, (current) => ({
                  ...current,
                  items: [...current.items, { name: "", amount: "" }],
                }))
              }
            >
              材料行を追加
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={labelClass}>作り方</p>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() =>
              setForm((prev) => ({ ...prev, steps: [...prev.steps, ""] }))
            }
          >
            手順を追加
          </button>
        </div>
        <ol className="space-y-3">
          {form.steps.map((step, stepIndex) => (
            <li key={`step-${stepIndex}`} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">
                  手順 {stepIndex + 1}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={secondaryBtn}
                    disabled={stepIndex === 0}
                    onClick={() =>
                      setForm((prev) => {
                        if (stepIndex === 0) return prev;
                        const next = [...prev.steps];
                        const current = next[stepIndex] ?? "";
                        next[stepIndex] = next[stepIndex - 1] ?? "";
                        next[stepIndex - 1] = current;
                        return { ...prev, steps: next };
                      })
                    }
                  >
                    上へ
                  </button>
                  <button
                    type="button"
                    className={secondaryBtn}
                    disabled={stepIndex >= form.steps.length - 1}
                    onClick={() =>
                      setForm((prev) => {
                        if (stepIndex >= prev.steps.length - 1) return prev;
                        const next = [...prev.steps];
                        const current = next[stepIndex] ?? "";
                        next[stepIndex] = next[stepIndex + 1] ?? "";
                        next[stepIndex + 1] = current;
                        return { ...prev, steps: next };
                      })
                    }
                  >
                    下へ
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        steps:
                          prev.steps.length <= 1
                            ? [""]
                            : prev.steps.filter((_, index) => index !== stepIndex),
                      }))
                    }
                  >
                    削除
                  </button>
                </div>
              </div>
              <textarea
                className={`${inputClass} min-h-20 resize-y`}
                value={step}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    steps: prev.steps.map((row, index) =>
                      index === stepIndex ? event.target.value : row,
                    ),
                  }))
                }
                placeholder="手順の説明"
              />
            </li>
          ))}
        </ol>
      </div>

      <label className="block">
        <span className={labelClass}>ワンポイント（任意）</span>
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={form.onePoint}
          onChange={(event) => setField("onePoint", event.target.value)}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300"
            checked={form.isPublished}
            onChange={(event) => setField("isPublished", event.target.checked)}
          />
          <span className={labelClass}>公開する</span>
        </label>
        <label className="block">
          <span className={labelClass}>並び順</span>
          <input
            className={inputClass}
            type="number"
            value={form.sortOrder}
            onChange={(event) => setField("sortOrder", event.target.value)}
          />
        </label>
      </div>

      {uploading ? (
        <p className="text-xs text-slate-500">画像を保存しています…</p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving || uploading}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white disabled:opacity-60 sm:w-auto"
        style={{ backgroundColor: NAVY }}
      >
        {saving ? "保存中…" : submitLabel}
      </button>
    </form>
  );
}
