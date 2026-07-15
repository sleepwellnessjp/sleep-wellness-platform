import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "SCIENCE",
    description: "睡眠データを理解する",
  },
  {
    title: "PRACTICE",
    description: "ヨガ・呼吸・瞑想",
  },
  {
    title: "COMMUNITY",
    description: "企業・教育・地域をつなぐ",
  },
];

export default function Hero() {
  return (
    <section className="relative flex min-h-screen overflow-hidden bg-[#071426]">
      {/* Background */}
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

      {/* Logo */}
      <div className="absolute left-6 top-6 z-20 sm:left-8 sm:top-8 lg:left-12 lg:top-10">
        <Image
          src="/swij-logo-horizontal.png"
          alt="Sleep Wellness Institute Japan"
          width={190}
          height={48}
          priority
          className="h-auto w-[150px] sm:w-[170px] lg:w-[190px]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 pt-28 pb-44 sm:px-8 lg:px-10">
        <div className="max-w-4xl">
          <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.06em] text-white sm:text-6xl lg:text-8xl">
            睡眠を、
            <br />
            日本の新しい文化へ。
          </h1>

          <div className="mt-10 max-w-2xl">
            <p className="text-xl font-semibold text-white sm:text-2xl">
              Sleep Wellness Institute Japan
            </p>

            <p className="mt-6 text-base leading-8 text-white/75 sm:text-lg lg:text-xl">
              睡眠科学・ヨガ・呼吸・瞑想・
              <br />
              日本文化・テクノロジーを融合した
              <br />
              日本初のSleep Wellness Platform
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/programs"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-[#071426] transition duration-300 hover:-translate-y-1 hover:bg-[#f4f4f4]"
            >
              Programsを見る
            </Link>

            <Link
              href="/analysis/new"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/20"
            >
              Sleep Analysis
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Features */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-gradient-to-t from-[#071426]/80 to-transparent">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 sm:grid-cols-3 lg:px-10">
          {features.map((item) => (
            <div key={item.title}>
              <p className="text-xs font-semibold tracking-[0.28em] text-[#d8b36a]">
                {item.title}
              </p>

              <p className="mt-3 text-sm leading-7 text-white/70">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 lg:flex flex-col items-center">
        <span className="mb-3 text-[10px] tracking-[0.35em] text-white/45">
          SCROLL
        </span>

        <div className="flex h-12 w-6 items-start justify-center rounded-full border border-white/25 p-1">
          <div className="h-2 w-2 rounded-full bg-white/80 transition duration-300 hover:translate-y-1" />
        </div>
      </div>
    </section>
  );
}