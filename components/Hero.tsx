import Image from "next/image";
import Link from "next/link";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { HOME_TOP_HREF } from "@/lib/home-intro";

export default function Hero() {
  return (
    <section
      data-swij-hero=""
      className="relative z-10 flex max-sm:min-h-[52svh] sm:min-h-[68vh] lg:min-h-[72vh]"
    >
      {/* スマホ: ロゴ帯・ハンバーガーを月の下へ（重なり回避） / PCは従来位置 */}
      <div className="absolute left-5 right-5 top-[calc(env(safe-area-inset-top,0px)+2.25rem)] z-20 flex items-center justify-between max-sm:top-[calc(env(safe-area-inset-top,0px)+7rem)] sm:left-8 sm:right-8 sm:top-8 lg:left-12 lg:right-12 lg:top-10">
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

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-5 pt-32 pb-8 sm:px-8 sm:pb-36 lg:px-10 lg:pb-44 max-sm:items-start max-sm:pt-[calc(env(safe-area-inset-top,0px)+10.5rem)] max-sm:pb-4">
        <div className="mx-auto w-full max-w-3xl animate-fade-up text-center sm:max-w-2xl lg:max-w-[42rem] max-sm:max-w-none">
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
