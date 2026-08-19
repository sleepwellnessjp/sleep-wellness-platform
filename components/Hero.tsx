import Image from "next/image";
import Link from "next/link";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { HOME_TOP_HREF } from "@/lib/home-intro";

export default function Hero() {
  return (
    <section
      data-swij-hero=""
      className="relative z-10 flex flex-col sm:block"
    >
      {/* PC: absolute ヘッダー（ロゴ左 + メニュー右） */}
      <div className="absolute left-8 right-8 top-8 z-20 hidden items-center justify-between sm:flex lg:left-12 lg:right-12 lg:top-10">
        <Link
          href={HOME_TOP_HREF}
          className="inline-flex items-center"
        >
          <Image
            src="/swij-logo-horizontal-on-dark.png"
            alt="Sleep Wellness Institute Japan"
            width={200}
            height={50}
            priority
            className="h-auto w-[168px] bg-transparent lg:w-[188px]"
          />
        </Link>
        <SiteNavMenu tone="light" />
      </div>

      {/* モバイル: ハンバーガーのみ右上固定 */}
      <div
        className="absolute right-4 z-30 sm:hidden"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <SiteNavMenu tone="light" />
      </div>

      {/* コンテンツ: ロゴ中央 → METHOD™ → 見出し → 説明文（すべて通常フロー） */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-5 pb-12 pt-32 sm:px-8 sm:pb-36 lg:px-10 lg:pb-44 max-sm:items-start max-sm:pb-8 max-sm:pt-0">
        <div
          className="mx-auto w-full max-w-3xl animate-fade-up text-center sm:max-w-2xl lg:max-w-[42rem] max-sm:max-w-none"
          style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 1.5rem), 1.5rem)" }}
        >
          {/* モバイル中央ロゴ */}
          <Link
            href={HOME_TOP_HREF}
            className="mb-6 inline-block sm:hidden"
          >
            <Image
              src="/swij-logo-horizontal-on-dark.png"
              alt="Sleep Wellness Institute Japan"
              width={400}
              height={100}
              priority
              className="mx-auto h-auto w-[34vw] max-w-[140px] bg-transparent"
            />
          </Link>

          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a] sm:text-xs max-sm:tracking-[0.32em]">
            SLEEP WELLNESS METHOD™
          </p>

          <h1 className="mt-4 text-[clamp(1.55rem,4.2vw+0.45rem,3.55rem)] font-semibold leading-[1.1] tracking-[-0.04em] text-white sm:mt-7 sm:leading-[1.06] lg:leading-[1.05] max-sm:tracking-[-0.03em]">
            睡眠を、
            <br />
            <span className="whitespace-nowrap">日本の新しい文化へ。</span>
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-white/72 sm:mt-9 sm:text-lg sm:leading-9 max-sm:max-w-sm max-sm:text-[14px] max-sm:leading-7 max-sm:text-white/70">
            データから優先順位を決め、昼と夜の実践で整える。
            <br className="hidden sm:block" />
            Sleep Wellness Institute Japan の Method です。
          </p>
        </div>
      </div>
    </section>
  );
}
