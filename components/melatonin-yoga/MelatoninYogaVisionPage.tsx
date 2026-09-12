"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/site/SiteHeader";
import { GOLD, GOLD_LIGHT, NAVY } from "@/components/ui/tokens";

const SERIF =
  '"Hiragino Mincho ProN", "Hiragino Mincho Pro", "Yu Mincho", "YuMincho", "Noto Serif JP", "Shippori Mincho", serif';

const PAPER = "#f5f2ec";
const COURSE_HREF = "/academy/certified-instructor";

/** 麻の葉（SleepCheck / 記事カバーと同定義） */
const ASANOHA_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="84" viewBox="0 0 72 84">
    <g fill="none" stroke="${GOLD}" stroke-width="1.1">
      <path d="M36 6 L62 21 V51 L36 66 L10 51 V21 Z"/>
      <path d="M36 6 V66 M10 21 L62 51 M62 21 L10 51"/>
    </g>
  </svg>`,
);

const PLATFORM_CARDS = [
  "学び続ける場所",
  "実践する場所",
  "仲間とつながる場所",
  "新しい仕事をつくる場所",
] as const;

const ORIGIN_LABELS = [
  { title: "早坂信哉先生との共著", sub: "睡眠研究" },
  { title: "SOXAIとの実証", sub: "ウェアラブル" },
  { title: "日本の「間（ま）」の思想", sub: "文化" },
] as const;

const GROWTH_STEPS = [
  { value: "3", filled: true },
  { value: "10", filled: false },
  { value: "30", filled: false },
  { value: "100", filled: false },
] as const;

/**
 * メラトニンヨガ™が目指すところ — 長文ビジョンページ。
 * 背景は main 一枚の連続グラデーション（段差なし）。iOS は body:has で地色同期。
 */
export default function MelatoninYogaVisionPage() {
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        setShowStickyCta(false);
        return;
      }
      setShowStickyCta(window.scrollY / scrollable >= 0.4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <main
      data-melatonin-yoga-vision=""
      className="relative isolate min-h-screen text-[#F5F2EA]"
      style={{
        background: [
          "linear-gradient(",
          "180deg,",
          "#070f1c 0%,",
          "#0c1628 8%,",
          "#121e34 18%,",
          "#1a2740 28%,",
          "#2a3348 40%,",
          "#4a4a48 52%,",
          "#8a8478 64%,",
          "#c8c0b4 76%,",
          `${PAPER} 88%,`,
          `${PAPER} 100%`,
          ")",
        ].join(" "),
      }}
    >
      {/* 麻の葉ラティス（不透明度 3〜5%） */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,${ASANOHA_SVG}")`,
          backgroundSize: "72px 84px",
        }}
      />

      <div className="relative z-10">
        <SiteHeader
          surface="night"
          className="absolute inset-x-0 top-0 z-20"
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

        {/* ⓪ ヒーロー — min-height 88svh（ヘッダーはオーバーレイ）。下に次セクションがわずかに覗く */}
        <section className="relative flex min-h-[88svh] flex-col items-center justify-center px-4 pb-[calc(var(--sw-sleep-tabbar-clearance)+24px+56px)] pt-[calc(env(safe-area-inset-top,0px)+5.5rem)] sm:px-8 lg:px-10 lg:pb-24">
          <h1
            className="w-full max-w-[22.5rem] text-center font-medium text-[#F5F2EA] sm:max-w-xl lg:max-w-3xl"
            style={{
              fontFamily: SERIF,
              textShadow: "0 2px 24px rgba(0,0,0,0.35)",
            }}
          >
            <span className="block whitespace-nowrap text-[1.2rem] leading-[1.6] tracking-[0.06em] sm:text-[1.85rem] sm:leading-[1.5] lg:text-[2.35rem] lg:leading-[1.45]">
              睡眠を文化にする。
            </span>
            <span className="mt-1 block whitespace-nowrap text-[0.95rem] leading-[1.6] tracking-[0.02em] sm:mt-2 sm:text-[1.85rem] sm:leading-[1.5] sm:tracking-[0.04em] lg:text-[2.35rem] lg:leading-[1.45]">
              その中心に、インストラクターがいる。
            </span>
          </h1>
          <div
            className="pointer-events-none absolute bottom-[calc(var(--sw-sleep-tabbar-clearance)+24px)] left-1/2 z-[5] -translate-x-1/2 lg:bottom-10"
            aria-hidden
          >
            <div className="vision-scroll-cue" />
          </div>
        </section>

        <div className="relative z-[6] mx-auto -mt-10 max-w-3xl px-6 pb-[calc(var(--sw-sleep-page-bottom-pad)+3.5rem)] sm:-mt-12 sm:px-8 lg:max-w-5xl lg:px-10 lg:pb-[5rem]">
          {/* ① 起源 */}
          <section className="pt-0">
            <div className="space-y-6 text-[15px] leading-8 text-white/82 sm:text-base sm:leading-8">
              <p>メラトニンヨガ™は、ひとつのヨガメソッドから始まりました。</p>

              <div className="grid gap-0 border-y border-[rgba(216,179,106,0.35)] py-1 sm:grid-cols-3">
                {ORIGIN_LABELS.map((item, index) => (
                  <div
                    key={item.title}
                    className={`px-1 py-5 text-center sm:px-4 sm:py-6 ${
                      index < ORIGIN_LABELS.length - 1
                        ? "border-b border-[rgba(216,179,106,0.28)] sm:border-b-0 sm:border-r"
                        : ""
                    }`}
                  >
                    <p
                      className="text-[13px] font-medium leading-relaxed tracking-[0.02em] text-[#F5F2EA] sm:text-sm"
                      style={{ fontFamily: SERIF }}
                    >
                      {item.title}
                    </p>
                    <p
                      className="mt-2 text-[10px] font-semibold tracking-[0.22em]"
                      style={{ color: GOLD_LIGHT }}
                    >
                      {item.sub}
                    </p>
                  </div>
                ))}
              </div>

              <p>
                眠るためだけのヨガではなく、睡眠を通してその人の生活や心身の状態に向き合うこと。睡眠研究者・早坂信哉先生との共著、スマートリングメーカーSOXAIとの実証、そして日本の「間（ま）」の思想。科学と身体感覚と文化を一本につなぐ試みとして、このメソッドは生まれました。
              </p>
              <p>
                その考え方を、より多くの人へ届けるために。メラトニンヨガ™認定インストラクター養成コースが始まりました。
              </p>
              <p>
                認定インストラクターが学び続け、クライアントの睡眠と継続的に向き合い、それぞれの地域や活動の場で睡眠ウェルネスを広げていく。その活動を支える場所として誕生したのが、Sleep
                Wellness Platformです。
              </p>
            </div>

            <blockquote
              className="mt-16 mb-6 border-l-2 pl-5 sm:mt-20 sm:mb-8 sm:pl-7"
              style={{ borderColor: GOLD }}
            >
              <p
                className="text-[1.05rem] font-medium leading-[1.85] tracking-[0.02em] text-[#F5F2EA] sm:text-[1.2rem] sm:leading-[1.9]"
                style={{ fontFamily: SERIF }}
              >
                創始者が築いたのは、土台です。
                <br />
                ここから先の主役は、これから各地で活動していく一人ひとりのインストラクターです。
              </p>
            </blockquote>
          </section>

          {/* ② データ */}
          <section className="mt-24 sm:mt-32">
            <h2
              className="text-[1.35rem] font-medium leading-snug tracking-[0.02em] text-[#F5F2EA] sm:text-2xl"
              style={{ fontFamily: SERIF }}
            >
              感覚だけではなく、データとともに睡眠を見る
            </h2>

            {/* 画像未提供: 1カラム。後から差し込めるスロットのみ */}
            <div className="mt-10 hidden" data-vision-report-slot="" aria-hidden />

            <div className="mt-8 space-y-6 text-[15px] leading-8 text-white/82 sm:text-base sm:leading-8">
              <p>
                Sleep
                Wellness Platformでは、認定インストラクターが睡眠について学ぶだけでなく、クライアントの睡眠を分析し、継続的なサポートに活用することができます。
              </p>
              <p>
                SOXAIやOura
                Ringなどのウェアラブルデバイスから得られる睡眠データに加え、手入力にも対応。Apple
                WatchやGarminなど、さまざまなデバイスのデータを活用できます。
              </p>
              <p>
                大切なのは、数字を評価することではありません。睡眠時間、睡眠の質、生活習慣、心身の状態を継続して見ながら、「この人の睡眠をより良くするために、私たちに何ができるのか」を一緒に考えていくことです。
              </p>

              <aside
                className="rounded-sm border px-5 py-5 sm:px-6 sm:py-6"
                style={{
                  background: PAPER,
                  borderColor: "rgba(138, 106, 45, 0.55)",
                  color: NAVY,
                }}
              >
                <p className="text-[14px] leading-7 sm:text-[15px] sm:leading-8">
                  これは診断や医療行為ではありません。日々の生活を整えるために、データを手がかりとして伴走する。その線引きを明確に持つことも、プロフェッショナルの条件だと考えています。
                </p>
              </aside>

              <p>
                睡眠分析を入口として、一定期間クライアントと向き合い、ヨガ、呼吸、生活習慣を組み合わせながらサポートしていく。これからのインストラクターに必要なのは、単発のレッスンを提供する力だけではなく、人生の土台である「睡眠」に伴走できる力です。
              </p>
            </div>

            <p
              className="mt-10 border border-[rgba(216,179,106,0.28)] bg-white/[0.04] px-4 py-3 text-center text-[11px] font-semibold tracking-[0.14em] text-white/75 sm:text-xs sm:tracking-[0.18em]"
            >
              SOXAI ／ Oura Ring ／ Apple Watch ／ Garmin ／ 手入力
            </p>
          </section>

          {/* ③ プラットフォーム */}
          <section className="mt-24 sm:mt-32">
            <h2
              className="text-[1.35rem] font-medium leading-snug tracking-[0.02em] text-[#F5F2EA] sm:text-2xl"
              style={{ fontFamily: SERIF }}
            >
              資格を取って終わりではない
            </h2>
            <p className="mt-8 text-[15px] leading-8 text-white/82 sm:text-base sm:leading-8">
              Sleep
              Wellness Platformは、認定資格を取得した人を管理するための場所ではありません。
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {PLATFORM_CARDS.map((label) => (
                <div
                  key={label}
                  className="flex min-h-[5.5rem] items-center justify-center border border-[rgba(216,179,106,0.4)] bg-white/[0.06] px-3 py-5 text-center sm:min-h-[6.5rem] sm:px-4"
                >
                  <p
                    className="text-[13px] font-medium leading-relaxed tracking-[0.04em] text-[#F5F2EA] sm:text-sm"
                    style={{ fontFamily: SERIF }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 space-y-6 text-[15px] leading-8 text-white/82 sm:text-base sm:leading-8">
              <p>
                認定インストラクターは、プラットフォーム上でクライアントの睡眠データを管理し、経過を記録しながら継続サポートを組み立てられます。
                <Link
                  href="/sleep/science"
                  className="underline decoration-[rgba(216,179,106,0.55)] underline-offset-4 transition hover:text-[#F5F2EA]"
                >
                  睡眠学の継続学習コンテンツ
                </Link>
                、
                <Link
                  href="/recipes"
                  className="underline decoration-[rgba(216,179,106,0.55)] underline-offset-4 transition hover:text-[#F5F2EA]"
                >
                  睡眠のための料理
                </Link>
                、
                <Link
                  href="/sleep/sound"
                  className="underline decoration-[rgba(216,179,106,0.55)] underline-offset-4 transition hover:text-[#F5F2EA]"
                >
                  入眠のための音楽
                </Link>
                、語りかけの技術。一般の方に睡眠を身近に感じてもらうためのコンテンツを増やしながら、インストラクター自身も知識と実践の幅を広げていきます。
              </p>
              <p>
                そして、一人では届かなかった場所へ、みんなで睡眠ウェルネスを届けていく。共通の場所を中心に、それぞれの個性を生かして活動していく。私たちが目指しているのは、そういうコミュニティです。
              </p>
            </div>

            <p className="mt-10">
              <Link
                href={COURSE_HREF}
                className="text-[14px] font-medium tracking-[0.02em] text-[#F5F2EA]/90 underline decoration-[rgba(216,179,106,0.45)] underline-offset-4 transition hover:text-white sm:text-[15px]"
              >
                メラトニンヨガ™認定インストラクター養成コースの詳細を見る →
              </Link>
            </p>
          </section>

          {/* ④ ヨガシーン */}
          <section className="mt-24 sm:mt-32">
            <h2
              className="text-[1.35rem] font-medium leading-snug tracking-[0.02em] text-[#F5F2EA] sm:text-2xl"
              style={{ fontFamily: SERIF }}
            >
              日本のヨガシーンに、新しい価値を
            </h2>

            <aside className="mt-10 border border-[rgba(216,179,106,0.35)] bg-black/15 px-5 py-7 sm:px-8 sm:py-9">
              <p
                className="text-[11px] font-semibold tracking-[0.22em]"
                style={{ color: GOLD_LIGHT }}
              >
                講師
              </p>
              <p
                className="mt-3 text-[1.35rem] font-medium tracking-[0.04em] text-[#F5F2EA] sm:text-[1.6rem]"
                style={{ fontFamily: SERIF }}
              >
                綿本哲先生
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/70 sm:text-sm">
                ヨガワークス代表／ヨガフェスタ主催者
              </p>
              <p className="mt-5 text-[15px] leading-8 text-white/82 sm:text-base sm:leading-8">
                メラトニンヨガ™養成コースでは、ヨガワークス代表でありヨガフェスタ主催者である綿本哲社長が講師として登壇します。父・綿本昇先生から子へ受け継がれたヨガの極意とヨガ哲学を、受講者へ直接伝えていきます。
              </p>
            </aside>

            <p className="mt-8 text-[15px] leading-8 text-white/80 sm:text-base sm:leading-8">
              メラトニンヨガ™自体も、綿本社長の哲学書『間の書』を取り入れ、メソッドとしてアップデートを重ねてきました。睡眠科学、ウェアラブルデータ、そして日本古来の身体観と「間」の思想。それらが交わる場所に、このメソッドはあります。
            </p>

            <div
              className="mt-10 border px-5 py-5 sm:px-6"
              style={{
                borderColor: "rgba(138, 106, 45, 0.5)",
                background: "rgba(245, 242, 236, 0.12)",
              }}
            >
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[#F5F2EA]/75">
                2026
              </p>
              <p className="mt-3 text-[14px] leading-7 text-[#F5F2EA]/92 sm:text-[15px] sm:leading-8">
                2026年のヨガフェスタ横浜では、3名のメラトニンヨガ™認定インストラクターがそれぞれのクラスで登壇します。
              </p>
            </div>

            <div className="mt-14 flex items-center justify-center gap-2 sm:gap-4">
              {GROWTH_STEPS.map((step, index) => (
                <div key={step.value} className="flex items-center gap-2 sm:gap-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold tracking-tight sm:h-[4.5rem] sm:w-[4.5rem] sm:text-2xl"
                    style={
                      step.filled
                        ? {
                            background: GOLD,
                            color: NAVY,
                          }
                        : {
                            border: `1.5px solid ${GOLD_LIGHT}`,
                            color: GOLD_LIGHT,
                            background: "transparent",
                          }
                    }
                  >
                    {step.value}
                  </div>
                  {index < GROWTH_STEPS.length - 1 ? (
                    <span
                      className="text-sm sm:text-base"
                      style={{ color: GOLD_LIGHT }}
                      aria-hidden
                    >
                      →
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between px-1 text-[10px] tracking-[0.18em] text-white/55 sm:px-4 sm:text-[11px]">
              <span>今</span>
              <span>これから</span>
            </div>

            <div className="mt-10 space-y-6 text-[15px] leading-8 text-white/82 sm:text-base sm:leading-8">
              <p>今は3人。しかし、これは始まりです。</p>
              <p>
                これから10人、30人、100人と、さまざまな地域、さまざまなフィールドで活躍するインストラクターを増やしていきたい。目指しているのは、メラトニンヨガ™を教えられるインストラクターではありません。
              </p>
              <p>
                世界基準の睡眠ウェルネスを日本に広げ、そして日本から生まれた睡眠ウェルネスを世界へ発信できるインストラクターです。
              </p>
            </div>
          </section>

          {/* ⑤ キャリア */}
          <section className="mt-24 text-[#071426] sm:mt-32">
            <h2
              className="text-[1.3rem] font-medium leading-snug tracking-[0.01em] sm:text-2xl"
              style={{ fontFamily: SERIF }}
            >
              Yoga Instructorから、Sleep Wellness Professionalへ
            </h2>

            <div className="mt-8 space-y-6 text-[15px] leading-8 text-[#071426]/78 sm:text-base sm:leading-8">
              <p>
                ヨガを教える。その先に、睡眠を伝える。生活を支える。人の人生に長く寄り添う。
              </p>
              <p>
                ヨガインストラクターという仕事の可能性は、まだ大きく広げられます。
              </p>
            </div>

            <div className="mt-12 grid gap-0 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
              <div className="bg-[#e8e6e1]/85 px-5 py-7 sm:px-6 sm:py-8">
                <p
                  className="text-[11px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  Yoga Instructor
                </p>
                <ul className="mt-5 space-y-4 text-[14px] leading-7 text-[#071426]/75 sm:text-[15px] sm:leading-8">
                  <li>クラスの本数と時間で収入が決まる働き方</li>
                  <li>スタジオに来られる人、オンラインやYouTubeで見る人</li>
                </ul>
              </div>

              <div
                className="flex items-center justify-center py-3 md:px-3 md:py-0"
                aria-hidden
              >
                <span
                  className="text-xl font-light md:hidden"
                  style={{ color: GOLD }}
                >
                  ↓
                </span>
                <span
                  className="hidden text-xl font-light md:inline"
                  style={{ color: GOLD }}
                >
                  →
                </span>
              </div>

              <div
                className="border px-5 py-7 sm:px-6 sm:py-8"
                style={{
                  background: NAVY,
                  borderColor: GOLD,
                }}
              >
                <p
                  className="text-[11px] font-semibold tracking-[0.14em]"
                  style={{ color: GOLD_LIGHT }}
                >
                  Sleep Wellness Professional
                </p>
                <ul className="mt-5 space-y-4 text-[14px] leading-7 text-[#F5F2EA]/88 sm:text-[15px] sm:leading-8">
                  <li>一人のクライアントと数ヶ月単位で向き合う働き方</li>
                  <li className="text-[12px] leading-6 sm:text-[15px] sm:leading-8">
                    ヨガに興味がある人だけでなく、眠れずに悩む人、夜勤で生活が乱れた人、更年期に差しかかった人
                  </li>
                </ul>
              </div>
            </div>

            <aside
              className="mt-8 border-t pt-5 sm:mt-10 sm:pt-6"
              style={{ borderColor: GOLD }}
            >
              <p className="text-[12px] leading-6 text-[#071426]/72 sm:text-[13px] sm:leading-7">
                日本では成人の20.6%が、睡眠で休養を十分にとれていない。
                <br />
                6時間未満の睡眠は男性37.0%、女性39.9%。
              </p>
              <p className="mt-2 text-[10px] leading-5 text-[#071426]/45 sm:text-[11px]">
                厚生労働省「令和4年 国民健康・栄養調査」
              </p>
            </aside>

            <div className="mt-10 space-y-6 text-[15px] leading-8 text-[#071426]/78 sm:text-base sm:leading-8">
              <p>
                自分自身の経験や個性を生かしながら、ヨガ、睡眠、データ、食、音楽をつなぎ、自分にしかできない活動をつくっていく。
              </p>
              <p>Sleep Wellness Platformは、その挑戦を支える場所です。</p>
              <p>
                資格を取るためだけではなく、これからのキャリアをつくるために。一人で活動するのではなく、仲間とともに新しい文化をつくるために。
              </p>
            </div>
          </section>

          {/* ⑥ クロージング */}
          <section className="mt-28 text-center text-[#071426] sm:mt-36">
            <p
              className="text-[11px] font-semibold tracking-[0.28em] sm:text-xs"
              style={{ color: GOLD }}
            >
              Sleep as the Foundation of Life.
            </p>
            <h2
              className="mt-5 text-[1.55rem] font-medium tracking-[0.04em] sm:text-[2rem]"
              style={{ fontFamily: SERIF }}
            >
              睡眠を、人生の土台へ。
            </h2>

            <div className="mx-auto mt-10 max-w-2xl space-y-6 text-left text-[15px] leading-8 text-[#071426]/78 sm:mt-12 sm:text-center sm:text-base sm:leading-8">
              <p>
                睡眠について学ぶことが特別なことではなく、食事や運動と同じように、誰もが日常の中で睡眠を考える。そんな社会をつくることが、私たちの目標です。
              </p>
              <p>
                その文化を広げていく主役は、これから各地で活動していくインストラクター一人ひとりです。
              </p>
              <p>メソッドを学ぶ人から、文化をつくる人へ。</p>
              <p>
                Sleep
                Wellness Platformとともに、次の時代の睡眠ウェルネスをつくっていきませんか。
              </p>
            </div>

            <Link
              href={COURSE_HREF}
              className="mt-12 inline-flex min-h-12 max-w-full items-center justify-center rounded-full px-6 py-3 text-center text-[13px] font-semibold leading-snug text-white transition hover:opacity-90 sm:mt-14 sm:px-8 sm:text-sm"
              style={{ background: NAVY }}
            >
              メラトニンヨガ™認定インストラクター養成コースの詳細を見る
            </Link>
          </section>

          {/* ⑦ 監修・創始 */}
          <section className="mt-24 border-t border-[rgba(7,20,38,0.12)] pt-12 text-[#071426] sm:mt-28 sm:pt-14">
            <h2
              className="text-center text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              監修・創始
            </h2>

            <div className="mx-auto mt-8 flex max-w-xl flex-col items-center text-center">
              <div className="relative h-16 w-16 overflow-hidden rounded-full sm:h-[4.5rem] sm:w-[4.5rem]">
                <Image
                  src="/taka-photo-v2.jpg"
                  alt="若林貴久"
                  fill
                  className="object-cover object-[center_20%]"
                  sizes="72px"
                />
              </div>
              <p
                className="mt-5 text-[15px] font-medium tracking-[0.04em] sm:text-base"
                style={{ fontFamily: SERIF }}
              >
                若林貴久（TAKA）
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-[#071426]/65 sm:text-[13px]">
                ヨガ料理研究家／睡眠ウェルネスプロデューサー
                <br />
                Sleep Wellness Institute Japan 代表
                <br />
                メラトニンヨガ™・間のヨガ™ 創始者／E-RYT500
              </p>
              <p className="mt-6 text-[12px] leading-7 text-[#071426]/62 sm:text-[13px] sm:leading-7">
                睡眠研究者・早坂信哉先生との共著（入浴ヨガ）、スマートリングメーカーSOXAIとの実証的な共同企画、ヨガジャーナル日本版での連載、RYT200養成コース監修。科学・身体・文化をつなぐ視点から、睡眠ウェルネスの体系化に取り組んでいる。
              </p>
            </div>
          </section>
        </div>

        <Footer />
      </div>

      {/* SP固定CTA — タブバーの上 */}
      <div
        className={`pointer-events-none fixed inset-x-0 z-[70] px-3 transition duration-300 lg:hidden ${
          showStickyCta
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0"
        }`}
        style={{
          bottom: "var(--sw-sleep-tabbar-clearance)",
        }}
        aria-hidden={!showStickyCta}
      >
        <Link
          href={COURSE_HREF}
          className={`pointer-events-auto mx-auto flex min-h-11 max-w-md items-center justify-center rounded-full border px-4 text-[13px] font-semibold tracking-[0.02em] text-[#071426] shadow-[0_8px_24px_rgba(7,20,38,0.18)] ${
            showStickyCta ? "" : "pointer-events-none"
          }`}
          style={{
            background: PAPER,
            borderColor: "rgba(138, 106, 45, 0.45)",
          }}
          tabIndex={showStickyCta ? 0 : -1}
        >
          養成コースを見る →
        </Link>
      </div>
    </main>
  );
}
