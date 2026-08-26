"use client";

import Link from "next/link";
import type { SleepContent } from "@/lib/sleep-content/types";

const CARD_NAVY = "#2F4666";

function FeaturedCard({ article }: { article: SleepContent }) {
  return (
    <Link
      href={`/sleep/science/${article.slug}`}
      className="flex h-full flex-col overflow-hidden rounded-2xl"
      style={{
        background: CARD_NAVY,
        border: "1px solid rgba(184,148,95,0.3)",
      }}
    >
      {/* カバー画像（円形・カード上部中央） */}
      <div className="flex shrink-0 justify-center pt-4">
        <div
          aria-hidden
          className="overflow-hidden rounded-full bg-cover bg-center bg-no-repeat"
          style={{
            width: "44%",
            aspectRatio: "1 / 1",
            ...(article.coverImageUrl
              ? {
                  backgroundImage: `url(${JSON.stringify(article.coverImageUrl)})`,
                }
              : { background: "rgba(184,148,95,0.15)" }),
          }}
        />
      </div>

      {/* タイトル — 白文字・左寄せ・カード下部 */}
      <div className="flex min-h-[5.25rem] flex-1 flex-col px-3 pb-4 pt-3 md:min-h-[5.5rem] md:px-4 md:pt-4">
        <h3
          className="mt-auto text-left text-[15px] font-semibold tracking-[-0.02em] text-white"
          style={{
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {article.title}
        </h3>
        {article.summary ? (
          <p className="mt-1.5 hidden text-left text-[13px] leading-5 text-white/70 md:line-clamp-1 md:block">
            {article.summary}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function ArticleGrid({ articles }: { articles: SleepContent[] }) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
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
