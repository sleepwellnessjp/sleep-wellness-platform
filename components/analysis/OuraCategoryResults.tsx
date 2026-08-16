"use client";

import {
  countOuraPresentItems,
  type OuraDisplayCategory,
} from "@/lib/oura-display-categories";

type OuraCategoryResultsProps = {
  categories: readonly OuraDisplayCategory[];
  imageCount?: number;
  /** コンパクト表示（確認画面向け） */
  compact?: boolean;
};

/**
 * Oura 専用: 取得できた項目だけを7カテゴリー表示。
 * 未取得・取得できず・N/A 等は一切出さない。
 */
export default function OuraCategoryResults({
  categories,
  imageCount,
  compact = false,
}: OuraCategoryResultsProps) {
  const presentCount = countOuraPresentItems(categories);

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
        <p className="text-[14px] font-semibold text-[#071426]">Ouraデータ</p>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          まだ表示できる数値がありません。スクリーンショットを追加して解析してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl border border-[#315f68]/20 bg-white ${
          compact ? "px-4 py-3.5" : "px-4 py-4 sm:px-5"
        }`}
      >
        <p className="text-[14px] font-semibold text-[#071426]">
          取得できたOuraデータ
        </p>
        <p className="mt-1 text-[13px] text-slate-600">
          {imageCount != null ? `${imageCount}枚の画像を解析しました · ` : ""}
          {presentCount}項目を整理しました
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categories.map((category) => (
          <section
            key={category.id}
            className="rounded-2xl border border-slate-200 bg-[#fafaf8] p-4 sm:p-5"
          >
            <h3 className="text-[13px] font-semibold tracking-wide text-[#071426] sm:text-sm">
              {category.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {category.items.map((item) => (
                <li
                  key={item.key}
                  className="flex items-baseline justify-between gap-3 border-b border-slate-200/70 pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="min-w-0 text-[13px] text-slate-600">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-right text-[14px] font-semibold text-[#071426]">
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
