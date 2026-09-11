"use client";

import Link from "next/link";
import { GOLD_LIGHT } from "@/components/ui/tokens";
import type { SleepContent } from "@/lib/sleep-content/types";

function FeaturedCard({ article }: { article: SleepContent }) {
  return (
    <Link
      href={`/sleep/science/${article.slug}`}
      className="flex h-full flex-col overflow-hidden rounded-2xl border-2 backdrop-blur-[2px]"
      style={{
        background:
          "linear-gradient(152deg, rgba(48,58,78,0.42) 0%, rgba(12,22,40,0.58) 52%, rgba(8,16,30,0.66) 100%)",
        borderColor: GOLD_LIGHT,
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
            textShadow: "0 1px 12px rgba(0,0,0,0.45)",
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
