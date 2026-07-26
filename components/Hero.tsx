import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[88vh] overflow-hidden bg-[#071426] sm:min-h-screen">
      <div className="absolute inset-0">
        <Image
          src="/melatonin-yoga.jpg"
          alt="Melatonin Yoga"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#071426]/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071426]/95 via-[#071426]/75 to-[#071426]/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071426]/40 via-transparent to-[#071426]/90" />
      </div>

      <div className="absolute left-6 top-6 z-20 animate-fade-in sm:left-8 sm:top-8 lg:left-12 lg:top-10">
        <Image
          src="/swij-logo-horizontal.png"
          alt="Sleep Wellness Institute Japan"
          width={190}
          height={48}
          priority
          className="h-auto w-[150px] sm:w-[170px] lg:w-[190px]"
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 pt-28 pb-28 sm:px-8 lg:px-10 lg:pb-32">
        <div className="max-w-4xl animate-fade-up">
          <h1 className="text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.06em] text-white sm:text-6xl lg:text-8xl">
            睡眠を、
            <br />
            日本の新しい文化へ。
          </h1>

          <p className="mt-8 max-w-xl text-base leading-8 text-white/75 sm:mt-10 sm:text-lg lg:text-xl lg:leading-9">
            睡眠科学・ヨガ・データ分析を融合した、
            <br className="hidden sm:block" />
            日本初の Sleep Wellness Platform。
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:mt-12 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/analysis/new"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#071426] transition duration-500 hover:-translate-y-1 hover:bg-[#f4f4f4] hover:shadow-[0_20px_40px_-20px_rgba(255,255,255,0.45)] sm:text-base"
            >
              睡眠分析を受ける
            </Link>

            <Link
              href="/academy/certified-instructor"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition duration-500 hover:-translate-y-1 hover:border-white/40 hover:bg-white/20 sm:text-base"
            >
              認定講師になる
            </Link>

            <Link
              href="#contact"
              className="inline-flex min-h-12 items-center justify-center px-3 py-3.5 text-sm font-semibold text-white/80 transition duration-300 hover:text-white sm:text-base"
            >
              お問い合わせ →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
