"use client";

import Link from "next/link";
import type { SleepContent } from "@/lib/sleep-content/types";

const GOLD = "#B8945F";
const CARD_NAVY = "#2F4666";

function FeaturedCard({ article }: { article: SleepContent }) {
  return (
    <Link
      href={`/sleep/science/${article.slug}`}
      className="block flex-shrink-0 rounded-2xl overflow-hidden"
      style={{
        width: "72vw",
        maxWidth: "280px",
        scrollSnapAlign: "start",
        background: CARD_NAVY,
        border: `1px solid rgba(184,148,95,0.3)`,
        aspectRatio: "3 / 4",
      }}
    >
      {/* カバー画像（円形） */}
      <div className="flex justify-center" style={{ paddingTop: "24px" }}>
        <div
          className="overflow-hidden rounded-full"
          style={{
            width: "55%",
            aspectRatio: "1 / 1",
          }}
        >
          {article.coverImageUrl ? (
            <img
              src={article.coverImageUrl}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `rgba(184,148,95,0.15)` }}
            />
          )}
        </div>
      </div>

      {/* テキスト */}
      <div className="px-4 pt-4 pb-5">
        <h3
          className="font-semibold leading-snug tracking-[-0.02em]"
          style={{ fontSize: "16px", color: "#ffffff" }}
        >
          {article.title}
        </h3>
        {article.summary ? (
          <p
            className="mt-1.5 leading-5"
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.7)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {article.summary}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export default function FeaturedScrollStrip({
  articles,
}: {
  articles: SleepContent[];
}) {
  if (articles.length === 0) return null;

  return (
    <section className="mb-10">
      <h2
        className="mb-3 px-5 text-[11px] font-semibold tracking-[0.28em]"
        style={{ color: GOLD }}
      >
        注目の記事
      </h2>

      {/* スクロールコンテナ */}
      <div
        className="flex gap-3 featured-scroll-strip"
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
          paddingLeft: "20px",
          paddingRight: "20px",
          /* 最後のカードの右余白を確保するために padding-right では届かないため
             after 疑似要素で代用（CSS で対応） */
        }}
      >
        {articles.map((article) => (
          <FeaturedCard key={article.id} article={article} />
        ))}
        {/* 最後のカードの右余白スペーサー */}
        <div className="flex-shrink-0" style={{ width: "4px" }} aria-hidden />
      </div>
    </section>
  );
}
