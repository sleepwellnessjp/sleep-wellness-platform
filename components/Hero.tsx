import Image from "next/image";
import Link from "next/link";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import JapanNightBackdrop from "@/components/site/JapanNightBackdrop";
import SleepWordsBanner from "@/components/home/SleepWordsBanner";
import { HOME_TOP_HREF } from "@/lib/home-intro";

type HeroProps = {
  dashboardHref?: string | null;
};

export default function Hero({ dashboardHref = null }: HeroProps) {
  return (
    <section
      data-swij-hero=""
      className="relative flex min-h-[90vh] overflow-hidden bg-[#040c18] sm:min-h-screen"
    >
      {/* 日本の夜の世界観（完成イメージ方向・1枚貼り付けではない） */}
      <JapanNightBackdrop />

      {/* スマホ: ロゴ帯・ハンバーガーを月の下へ（重なり回避） / PCは従来位置 */}
      <div className="absolute left-5 right-5 top-[calc(env(safe-area-inset-top,0px)+2.25rem)] z-20 flex items-center justify-between max-sm:top-[calc(env(safe-area-inset-top,0px)+9.5rem)] sm:left-8 sm:right-8 sm:top-8 lg:left-12 lg:right-12 lg:top-10">
        <Link
          href={HOME_TOP_HREF}
          className="inline-flex min-h-11 min-w-11 items-center py-1.5 pr-2 sm:min-h-0 sm:py-0 sm:pr-0"
        >
          <Image
            src="/swij-logo-horizontal-on-dark.png"
            alt="Sleep Wellness Institute Japan"
            width={200}
            height={50}
            priority
            className="h-auto w-[148px] bg-transparent sm:w-[168px] lg:w-[188px]"
          />
        </Link>
        <SiteNavMenu tone="light" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-5 pt-32 pb-28 sm:px-8 sm:pb-36 lg:px-10 lg:pb-44 max-sm:items-start max-sm:pt-[calc(env(safe-area-inset-top,0px)+14rem)] max-sm:pb-[calc(var(--sw-beta-chrome-offset)+2.25rem)]">
        <div className="mx-auto w-full max-w-3xl animate-fade-up text-center sm:max-w-2xl lg:max-w-[42rem] max-sm:max-w-none">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a] sm:text-xs max-sm:tracking-[0.32em]">
            SLEEP WELLNESS METHOD™
          </p>

          <h1 className="mt-6 text-[clamp(1.7rem,4.6vw+0.55rem,3.55rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:mt-7 sm:leading-[1.06] lg:leading-[1.05] max-sm:mt-7 max-sm:tracking-[-0.03em]">
            睡眠を、
            <br />
            <span className="whitespace-nowrap">日本の新しい文化へ。</span>
          </h1>

          <p className="mx-auto mt-7 max-w-lg text-base leading-8 text-white/72 sm:mt-9 sm:text-lg sm:leading-9 max-sm:mt-8 max-sm:max-w-sm max-sm:text-[15px] max-sm:leading-8 max-sm:text-white/70">
            データから優先順位を決め、昼と夜の実践で整える。
            <br className="hidden sm:block" />
            Sleep Wellness Institute Japan の Method です。
          </p>

          {/* スマホ: 縦積みフル幅 / PC: 既存の2列（中央寄せ・右の行灯と重なりすぎない幅） */}
          <div className="mx-auto mt-9 grid w-full max-w-md grid-cols-1 gap-x-4 gap-y-2 sm:mt-11 sm:w-fit sm:max-w-none sm:grid-cols-2 max-sm:mt-10 max-sm:w-full max-sm:max-w-none max-sm:grid-cols-1 max-sm:gap-y-4">
            {dashboardHref ? (
              <Link
                href={dashboardHref}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-[#071426] transition duration-500 hover:-translate-y-0.5 hover:bg-[#f4f4f4] sm:text-base"
              >
                認定講師専用ページ
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-[#071426] transition duration-500 hover:-translate-y-0.5 hover:bg-[#f4f4f4] sm:text-base"
              >
                認定講師専用ページ
              </Link>
            )}

            <Link
              href={
                dashboardHref
                  ? "/analysis/new"
                  : "/login?redirect=%2Fanalysis%2Fnew"
              }
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 text-sm font-semibold text-white backdrop-blur-sm transition duration-500 hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/18 sm:text-base"
            >
              クライアントの分析
            </Link>

            <span className="hidden sm:block" aria-hidden="true" />
            <p className="px-1 text-center text-[11px] leading-5 text-white/50 sm:text-xs sm:leading-5 max-sm:mt-1 max-sm:pt-1">
              認定講師専用
            </p>
          </div>

          <p className="mt-8 max-sm:mt-8 max-sm:mb-2">
            <Link
              href="/academy/certified-instructor"
              className="text-sm font-medium text-white/65 transition hover:text-white"
            >
              認定講師になる →
            </Link>
          </p>

          {/* 「認定講師になる →」直下：睡眠のための言葉 */}
          <div className="mx-auto mt-5 w-full max-w-md sm:mt-6 sm:max-w-lg max-sm:mt-5">
            <SleepWordsBanner tone="onDark" />
          </div>
        </div>
      </div>
    </section>
  );
}
