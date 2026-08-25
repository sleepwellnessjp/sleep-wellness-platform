"use client";

import Link from "next/link";
import type { SleepContent } from "@/lib/sleep-content/types";

const CARD_NAVY = "#2F4666";

function FeaturedCard({ article }: { article: SleepContent }) {
  return (
    <Link
      href={`/sleep/science/${article.slug}`}
      className="block w-full overflow-hidden rounded-2xl"
      style={{
        background: CARD_NAVY,
        border: `1px solid rgba(184,148,95,0.3)`,
      }}
    >
      {/* カバー画像（円形） */}
      <div className="flex justify-center" style={{ paddingTop: "16px" }}>
        {/* width/height を同値・borderRadius 50% で確実に円形にする */}
        <div
          style={{
            width: "48%",
            aspectRatio: "1 / 1",
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {article.coverImageUrl ? (
            <img
              src={article.coverImageUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "rgba(184,148,95,0.15)",
              }}
            />
          )}
        </div>
      </div>

      {/* テキスト — 高さはコンテンツに従う */}
      <div
        className="px-3 pt-3 md:px-4 md:pt-4"
        style={{ paddingBottom: "16px" }}
      >
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.02em] text-white">
          {article.title}
        </h3>
        {article.summary ? (
          <p className="mt-1.5 hidden text-[13px] leading-5 text-white/70 md:line-clamp-1 md:block">
            {article.summary}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function ArticleGrid({ articles }: { articles: SleepContent[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
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
