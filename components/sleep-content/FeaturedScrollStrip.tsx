"use client";

import Link from "next/link";
import type { SleepContent } from "@/lib/sleep-content/types";

function FeaturedCard({ article }: { article: SleepContent }) {
  return (
    <Link
      href={`/sleep/science/${article.slug}`}
      aria-label={article.title}
      className="flex w-[150px] shrink-0 flex-col items-center gap-3"
    >
      <div
        aria-hidden
        className="shrink-0 self-center overflow-hidden rounded-full bg-cover bg-center bg-no-repeat"
        style={{
          width: 120,
          height: 120,
          ...(article.coverImageUrl
            ? {
                backgroundImage: `url(${JSON.stringify(article.coverImageUrl)})`,
              }
            : null),
        }}
      />
      <h3 className="line-clamp-2 w-full text-center text-sm font-semibold leading-snug tracking-[-0.02em] text-[#071426]">
        {article.title}
      </h3>
    </Link>
  );
}

function ArticleGrid({ articles }: { articles: SleepContent[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-6 sm:justify-start">
      {articles.map((article) => (
        <FeaturedCard key={article.id} article={article} />
      ))}
    </div>
  );
}

/** カテゴリ別記事グリッド（見出しなし — page 側で見出しを出す） */
export function CategoryScrollStrip({ articles }: { articles: SleepContent[] }) {
  if (articles.length === 0) return null;
  return <ArticleGrid articles={articles} />;
}
