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
      }}
    >
      {/* カバー画像（円形） */}
      <div className="flex justify-center" style={{ paddingTop: "24px" }}>
        {/* width/height を同値・borderRadius 50% で確実に円形にする */}
        <div
          style={{
            width: "55%",
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
                background: `rgba(184,148,95,0.15)`,
              }}
            />
          )}
        </div>
      </div>

      {/* テキスト — 高さはコンテンツに従う、下部24px余白 */}
      <div className="px-4 pt-4" style={{ paddingBottom: "24px" }}>
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

function ScrollStrip({ articles }: { articles: SleepContent[] }) {
  return (
    <div
      className="flex gap-3 featured-scroll-strip"
      style={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollSnapType: "x mandatory",
        paddingLeft: "20px",
        paddingRight: "20px",
      }}
    >
      {articles.map((article) => (
        <FeaturedCard key={article.id} article={article} />
      ))}
      {/* 最後のカードの右余白スペーサー */}
      <div className="flex-shrink-0" style={{ width: "4px" }} aria-hidden />
    </div>
  );
}

/** 注目の記事（全記事）横スクロール帯 */
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
      <ScrollStrip articles={articles} />
    </section>
  );
}

/** カテゴリ別横スクロール帯（見出しなし — page 側で見出しを出す） */
export function CategoryScrollStrip({ articles }: { articles: SleepContent[] }) {
  if (articles.length === 0) return null;
  return <ScrollStrip articles={articles} />;
}
