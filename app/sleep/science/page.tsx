import type { Metadata } from "next";
import Link from "next/link";
import { CategoryScrollStrip } from "@/components/sleep-content/FeaturedScrollStrip";
import ScienceSectionHeading from "@/components/sleep-content/ScienceSectionHeading";
import Footer from "@/components/Footer";
import JapanNightBackdrop from "@/components/site/JapanNightBackdrop";
import SiteHeader from "@/components/site/SiteHeader";
import { GOLD } from "@/components/ui/tokens";
import { listPublishedScienceArticles } from "@/lib/sleep-content/service";
import {
  SLEEP_CONTENT_SUBCATEGORIES,
  SLEEP_CONTENT_SUBCATEGORY_LABELS,
  type SleepContent,
  type SleepContentSubcategory,
} from "@/lib/sleep-content/types";

export const metadata: Metadata = {
  title: "睡眠学 | Sleep Wellness Institute Japan",
  description:
    "自律神経、ホルモン、暮らし、仕事まで。睡眠の基礎をわかりやすく解説します。",
};

export const dynamic = "force-dynamic";

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
    <main
      data-sleep-science-dawn=""
      className="relative isolate min-h-screen text-[#F5F2EA]"
    >
      <JapanNightBackdrop variant="firstView" atmosphere="predawn" />
      {/* 夜明け前: 上空の薄明かり → 藍。入眠音より明るい */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        aria-hidden
        style={{
          background: [
            "linear-gradient(185deg, rgba(214,224,240,0.34) 0%, rgba(140,168,210,0.22) 18%, rgba(70,100,150,0.28) 42%, rgba(32,52,92,0.42) 68%, rgba(18,32,58,0.5) 100%)",
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(255,236,214,0.16) 0%, transparent 55%)",
          ].join(", "),
        }}
      />

      <div className="relative z-10">
        <SiteHeader
          surface="night"
          actions={
            <Link
              href="/contact"
              className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold text-[#071426] transition hover:opacity-90 sm:text-sm"
              style={{ background: GOLD }}
            >
              お問い合わせ
            </Link>
          }
        />

        <section>
          <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD, textShadow: "0 1px 10px rgba(0,0,0,0.35)" }}
            >
              SLEEP SCIENCE
            </p>
            <h1
              className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.045em] text-[#F5F2EA] sm:text-4xl lg:text-[2.75rem]"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.4)" }}
            >
              睡眠学
            </h1>
            <p
              className="mt-5 max-w-2xl text-[15px] leading-8 text-white/75 sm:text-base sm:leading-8"
              style={{ textShadow: "0 1px 12px rgba(0,0,0,0.35)" }}
            >
              自律神経、ホルモン、暮らし、仕事まで。睡眠の基礎をわかりやすく解説します。
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-12 pb-[var(--sw-sleep-page-bottom-pad)] sm:px-8 sm:py-16 lg:px-10 lg:pb-[5rem] lg:py-20">
          {filterOptions.length > 0 ? (
            <div className="mb-8 flex flex-wrap gap-2">
              <Link
                href="/sleep/science"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  subFilter === "all"
                    ? "bg-[#F5F2EA] text-[#071426]"
                    : "border border-white/25 bg-white/10 text-[#F5F2EA] hover:bg-white/15"
                }`}
              >
                すべて
              </Link>
              {filterOptions.map((subcategory) => (
                <Link
                  key={subcategory}
                  href={`/sleep/science?sub=${subcategory}`}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    subFilter === subcategory
                      ? "bg-[#F5F2EA] text-[#071426]"
                      : "border border-white/25 bg-white/10 text-[#F5F2EA] hover:bg-white/15"
                  }`}
                >
                  {SLEEP_CONTENT_SUBCATEGORY_LABELS[subcategory]}
                </Link>
              ))}
            </div>
          ) : null}

          {visibleSections.length === 0 ? (
            <p className="rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-8 text-center text-sm text-white/60">
              公開中の記事はまだありません。
            </p>
          ) : (
            <div className="space-y-10">
              {visibleSections.map((section) => (
                <section key={section.subcategory}>
                  <ScienceSectionHeading
                    subcategory={section.subcategory}
                    label={SLEEP_CONTENT_SUBCATEGORY_LABELS[section.subcategory]}
                    tone="onDark"
                  />
                  <CategoryScrollStrip articles={section.articles} />
                </section>
              ))}
            </div>
          )}
        </div>

        <Footer />
      </div>
    </main>
  );
}
