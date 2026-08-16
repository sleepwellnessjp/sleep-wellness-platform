"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { FOCUS_RING } from "@/components/ui/tokens";
import { HOME_TOP_HREF } from "@/lib/home-intro";

/**
 * 「間の書 要約版」専用リーダー。
 *
 * 通常の Web 記事ではなく、「間の書」そのものを静かに読み進める体験を意図している。
 * ・生成り〜白を基調に、墨色とネイビー、ごく少量のゴールド
 * ・十分な余白と段落間の「間」
 * ・スクロールに合わせた、ごく控えめなフェードイン（motion 低減・noscript 対応）
 *
 * 既存 globals.css / イントロ / トップページには一切依存・変更しないよう、
 * スタイルはこのコンポーネント内にスコープした <style>（mns- 接頭辞）で完結させる。
 */
const INK = "#2a251d"; // 墨
const INK_SOFT = "rgba(42,37,29,0.72)";
const NAVY = "#071426";
const GOLD = "#8a6a2d";
const PAPER = "#f7f3ea"; // 生成り
const SERIF =
  '"Hiragino Mincho ProN", "Hiragino Mincho Pro", "Yu Mincho", "YuMincho", "Noto Serif JP", "Shippori Mincho", serif';

export default function MaNoShoReader() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      for (const el of els) el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <main
      className="mns-root"
      style={{
        minHeight: "100vh",
        background: PAPER,
        color: INK,
        fontFamily: SERIF,
      }}
    >
      <style>{`
        .mns-reveal {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 1000ms cubic-bezier(0.22, 0.61, 0.36, 1),
            transform 1000ms cubic-bezier(0.22, 0.61, 0.36, 1);
          will-change: opacity, transform;
        }
        .mns-reveal.is-in {
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .mns-reveal { opacity: 1; transform: none; transition: none; }
        }

        /* スマホのみ: 上部ナビ + 本文を約 1cm 下げる（PC は従来どおり） */
        .mns-topbar {
          display: none;
        }
        @media (max-width: 639px) {
          .mns-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            position: relative;
            z-index: 40;
            box-sizing: border-box;
            width: 100%;
            padding:
              calc(env(safe-area-inset-top, 0px) + 0.75rem)
              1rem
              0.5rem;
          }
          .mns-article {
            padding-top: calc(clamp(3.5rem, 12vw, 7rem) + 1cm) !important;
          }
        }
      `}</style>
      <noscript>
        {/* JS 無効時も本文が確実に読めるようにする */}
        <style>{`.mns-reveal{opacity:1 !important;transform:none !important;}`}</style>
      </noscript>

      {/* スマホ専用: 左「トップページへ戻る」 / 右ハンバーガー（PC非表示） */}
      <div className="mns-topbar" data-mns-topbar="">
        <Link
          href={HOME_TOP_HREF}
          className={`inline-flex w-fit min-h-11 items-center rounded-full px-3 text-[12px] font-semibold transition hover:bg-[rgba(7,20,38,0.04)] ${FOCUS_RING}`}
          style={{ color: GOLD, fontFamily: "system-ui, sans-serif" }}
        >
          ← トップページへ戻る
        </Link>
        <SiteNavMenu />
      </div>

      <article
        className="mns-article"
        style={{
          maxWidth: "40rem",
          margin: "0 auto",
          padding: "clamp(3.5rem, 12vw, 7rem) 1.5rem clamp(3rem, 9vw, 5.5rem)",
        }}
      >
        {/* ページ上部 */}
        <header data-reveal className="mns-reveal" style={{ textAlign: "center" }}>
          <h1
            style={{
              margin: 0,
              color: NAVY,
              fontSize: "clamp(2.1rem, 8vw, 2.9rem)",
              fontWeight: 600,
              letterSpacing: "0.16em",
              lineHeight: 1.2,
            }}
          >
            間の書
          </h1>
          <p
            style={{
              margin: "1rem 0 0",
              color: GOLD,
              fontSize: "clamp(0.62rem, 2.6vw, 0.72rem)",
              fontWeight: 600,
              letterSpacing: "0.42em",
              paddingLeft: "0.42em",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            THE BOOK OF MA
          </p>
          <p
            style={{
              margin: "1.6rem 0 0",
              color: INK,
              fontSize: "clamp(1rem, 4.2vw, 1.18rem)",
              fontWeight: 500,
              letterSpacing: "0.08em",
              lineHeight: 1.7,
            }}
          >
            和が拓くウェルネスの哲学
          </p>
        </header>

        {/* 表紙画像（正式な『間の書』表紙・縦横比を保ち全体表示） */}
        <div
          data-reveal
          className="mns-reveal"
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "clamp(2.6rem, 9vw, 3.6rem) 0 0",
          }}
        >
          <Image
            src="/ma-no-sho-cover.png"
            alt="間の書 ― 和が拓くウェルネスの哲学"
            width={690}
            height={1024}
            priority
            style={{
              width: "clamp(190px, 56vw, 260px)",
              height: "auto",
              display: "block",
              borderRadius: "4px",
              boxShadow: "0 26px 60px -26px rgba(7,20,38,0.5)",
            }}
          />
        </div>

        {/* 細いゴールドの区切り */}
        <div
          data-reveal
          className="mns-reveal"
          aria-hidden="true"
          style={{
            width: "44px",
            height: "1px",
            margin: "clamp(2.8rem, 9vw, 3.8rem) auto",
            background: "rgba(138,106,45,0.5)",
          }}
        />

        {/* 本文（一字一句そのまま・省略なし） */}
        <div
          style={{
            fontSize: "clamp(1rem, 4.2vw, 1.08rem)",
            lineHeight: 2.15,
            letterSpacing: "0.02em",
            color: INK,
          }}
        >
          <p
            data-reveal
            className="mns-reveal"
            style={{
              margin: 0,
              textAlign: "center",
              color: NAVY,
              fontWeight: 600,
              letterSpacing: "0.06em",
              lineHeight: 1.9,
            }}
          >
            『間の書 ― 和が拓くウェルネスの哲学』
            <br />
            <span
              style={{
                display: "inline-block",
                marginTop: "0.5rem",
                color: GOLD,
                fontSize: "0.82em",
                fontWeight: 500,
                letterSpacing: "0.14em",
              }}
            >
              指導者養成講座 公式テキスト
            </span>
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{ margin: "clamp(3.2rem, 10vw, 4.4rem) 0 0" }}
          >
            「最近、しんどい」
            <br />
            ——それはあなたが壊れているのではなく、チューニングがずれているだけ。
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{ margin: "clamp(2rem, 7vw, 2.8rem) 0 0" }}
          >
            本書はその原因を、たった一文字で示します。
          </p>

          {/* 単独で見せる一文 */}
          <p
            data-reveal
            className="mns-reveal"
            style={{
              margin: "clamp(2.6rem, 9vw, 3.6rem) 0",
              textAlign: "center",
              color: NAVY,
              fontSize: "clamp(1.7rem, 8vw, 2.3rem)",
              fontWeight: 600,
              letterSpacing: "0.12em",
              lineHeight: 1.5,
            }}
          >
            「間（ま）」です。
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{ margin: "clamp(2.6rem, 9vw, 3.6rem) 0 0" }}
          >
            現代人は、即レス文化、効率化、SNSの中で、
            <br />
            時間・空間・仲間・世間・人間という五つの「間」を奪われ続けています。
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{ margin: "clamp(2rem, 7vw, 2.8rem) 0 0" }}
          >
            しかし日本語を話す私たちは、
            <br />
            「居間」「床の間」「人間」
            <br />
            ——あらゆる「あいだ」に名前をつけ、
            <br />
            引き算の美学で余白を守ってきた民族。
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{
              margin: "clamp(2.4rem, 8vw, 3.2rem) 0 0",
              textAlign: "center",
              color: NAVY,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            間を生きる道具を、実はまだ手放していないのです。
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{ margin: "clamp(3.2rem, 10vw, 4.4rem) 0 0" }}
          >
            本書は、脳科学・文化史・言語学・インド哲学の四つの視点から
            <br />
            「間」を解き明かし、それを取り戻す実践を三段階で示します。
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{ margin: "clamp(2rem, 7vw, 2.8rem) 0 0" }}
          >
            味噌汁を冷ます「フー」やため息といった、
            <br />
            今すぐできる気づきから、
            <br />
            呼吸法と自律訓練法の毎日10分、
            <br />
            そしてアーサナ・瞑想を経て「空」の境地へ。
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{ margin: "clamp(2rem, 7vw, 2.8rem) 0 0" }}
          >
            眠りを「毎晩訪れる間の回復装置」として捉え直す視点は、
            <br />
            睡眠とウェルネスの意味を根本から書き換えます。
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{ margin: "clamp(3.2rem, 10vw, 4.4rem) 0 0" }}
          >
            おりんの一打ちが
            <br />
            「甲・乙・聞」の三音で構成されるように、
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{ margin: "clamp(2rem, 7vw, 2.8rem) 0 0" }}
          >
            本書もまた、
          </p>

          {/* 三部構成 */}
          <div
            data-reveal
            className="mns-reveal"
            style={{
              margin: "clamp(2rem, 7vw, 2.8rem) 0 0",
              textAlign: "center",
              color: NAVY,
              fontWeight: 600,
              letterSpacing: "0.08em",
              lineHeight: 2.4,
            }}
          >
            <div>診断（奪われている）</div>
            <div>発掘（持っていた）</div>
            <div>実践（取り戻す）</div>
          </div>

          <p
            data-reveal
            className="mns-reveal"
            style={{
              margin: "clamp(2rem, 7vw, 2.8rem) 0 0",
              textAlign: "center",
            }}
          >
            の三部で響き合う一冊。
          </p>

          <p
            data-reveal
            className="mns-reveal"
            style={{ margin: "clamp(3.2rem, 10vw, 4.4rem) 0 0" }}
          >
            技術の先にある「なぜ」に答える、
            <br />
            指導者のための哲学書です。
          </p>
        </div>

        {/* 細いゴールドの区切り */}
        <div
          data-reveal
          className="mns-reveal"
          aria-hidden="true"
          style={{
            width: "44px",
            height: "1px",
            margin: "clamp(3.4rem, 11vw, 4.6rem) auto clamp(2rem, 7vw, 2.6rem)",
            background: "rgba(138,106,45,0.5)",
          }}
        />

        {/* ページ下部：著者 */}
        <p
          data-reveal
          className="mns-reveal"
          style={{
            margin: 0,
            textAlign: "center",
            color: INK_SOFT,
            fontSize: "clamp(0.9rem, 3.6vw, 1rem)",
            letterSpacing: "0.14em",
          }}
        >
          著者　綿本 哲
        </p>

        {/* 最下部：戻る導線 */}
        <div
          style={{
            marginTop: "clamp(4rem, 13vw, 6rem)",
            textAlign: "center",
          }}
        >
          <Link
            href={HOME_TOP_HREF}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5em",
              color: GOLD,
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              fontFamily: "system-ui, sans-serif",
              textDecoration: "none",
              borderBottom: "1px solid rgba(138,106,45,0.35)",
              paddingBottom: "2px",
            }}
          >
            <span aria-hidden>←</span>
            Sleep Wellness Platformへ戻る
          </Link>
        </div>
      </article>
    </main>
  );
}
