import type { Metadata } from "next";
import Link from "next/link";
import FeaturedScrollStrip, { CategoryScrollStrip } from "@/components/sleep-content/FeaturedScrollStrip";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import { listPublishedScienceArticles } from "@/lib/sleep-content/service";
import {
  SLEEP_CONTENT_SUBCATEGORIES,
  type SleepContent,
  type SleepContentSubcategory,
} from "@/lib/sleep-content/types";

export const metadata: Metadata = {
  title: "睡眠学 | Sleep Wellness Institute Japan",
  description:
    "自律神経、ホルモン、暮らし、仕事まで。睡眠の基礎をわかりやすく解説します。",
};

export const dynamic = "force-dynamic";

const SCIENCE_SUBCATEGORY_LABELS: Record<SleepContentSubcategory, string> = {
  basic: "基礎",
  practice: "実践",
  life: "暮らし",
  women: "女性のための",
  men: "男性のための",
  work: "仕事と睡眠",
};

type Search = { searchParams: Promise<{ sub?: string }> };

function isSubcategory(value: string): value is SleepContentSubcategory {
  return (SLEEP_CONTENT_SUBCATEGORIES as readonly string[]).includes(value);
}

function groupBySubcategory(
  articles: SleepContent[],
): { subcategory: SleepContentSubcategory; articles: SleepContent[] }[] {
  return SLEEP_CONTENT_SUBCATEGORIES.flatMap((subcategory) => {
    const items = articles.filter((item) => item.subcategory === subcategory);
    if (items.length === 0) return [];
    return [{ subcategory, articles: items }];
  });
}

export default async function SleepSciencePage({ searchParams }: Search) {
  const params = await searchParams;
  const subFilter =
    params.sub && isSubcategory(params.sub) ? params.sub : "all";
  const articles = await listPublishedScienceArticles();
  const sections = groupBySubcategory(articles);
  const visibleSections =
    subFilter === "all"
      ? sections
      : sections.filter((section) => section.subcategory === subFilter);
  const filterOptions = sections.map((section) => section.subcategory);

  return (
    <PublicIntroLayout
      eyebrow="SLEEP SCIENCE"
      title="睡眠学"
      lead="自律神経、ホルモン、暮らし、仕事まで。睡眠の基礎をわかりやすく解説します。"
      contentClassName="pb-[var(--sw-sleep-page-bottom-pad)] sm:pb-[5rem]"
    >
      {/* 注目の記事（横スクロール帯）
          PublicIntroLayout の px-6 を打ち消して全幅に戻す */}
      <div className="-mx-6 sm:-mx-8 lg:-mx-10">
        <FeaturedScrollStrip articles={articles} />
      </div>

      {filterOptions.length > 0 ? (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/sleep/science"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              subFilter === "all"
                ? "bg-[#071426] text-white"
                : "border border-slate-200 text-[#071426]"
            }`}
          >
            すべて
          </Link>
          {filterOptions.map((subcategory) => (
            <Link
              key={subcategory}
              href={`/sleep/science?sub=${subcategory}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                subFilter === subcategory
                  ? "bg-[#071426] text-white"
                  : "border border-slate-200 text-[#071426]"
              }`}
            >
              {SCIENCE_SUBCATEGORY_LABELS[subcategory]}
            </Link>
          ))}
        </div>
      ) : null}

      {visibleSections.length === 0 ? (
        <p className="rounded-2xl border border-[#071426]/08 bg-white px-5 py-8 text-center text-sm text-slate-500">
          公開中の記事はまだありません。
        </p>
      ) : (
        <div className="space-y-10">
          {visibleSections.map((section) => (
            <section key={section.subcategory}>
              <h2 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-[#071426]">
                {SCIENCE_SUBCATEGORY_LABELS[section.subcategory]}
              </h2>
              {/* カテゴリ別横スクロール帯（コンテナのpaddingを打ち消して全幅） */}
              <div className="-mx-6 sm:-mx-8 lg:-mx-10">
                <CategoryScrollStrip articles={section.articles} />
              </div>
            </section>
          ))}
        </div>
      )}
    </PublicIntroLayout>
  );
}
