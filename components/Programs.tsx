import Image from "next/image";
import Link from "next/link";

const programs = [
  {
    title: "メラトニンヨガ™",
    description:
      "夜の休息へ導く、ヨガ・呼吸・瞑想・サウンドのプログラム。",
    image: "/melatonin-yoga.jpg",
    href: "#contact",
  },
  {
    title: "Sleep Wellness Analysis",
    description:
      "睡眠データと生活習慣から、改善の優先順位を整理する。",
    image: "/sleep-analysis.jpg",
    href: "/analysis/new",
  },
  {
    title: "Sleep Wellness Retreat™",
    description:
      "自然・食・入浴・ヨガを通して、回復の質を見つめ直す。",
    image: "/retreat.jpg",
    href: "#contact",
  },
];

export default function Programs() {
  return (
    <section
      id="programs"
      className="relative overflow-hidden bg-[#fafaf8] py-28 sm:py-32 lg:py-40"
    >
      <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-100/40 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[480px] w-[480px] rounded-full bg-amber-100/35 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
            PROGRAMS
          </p>

          <h2 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-[#071426] sm:text-5xl lg:text-6xl">
            Sleep Wellness Programs
          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            データと実践を組み合わせ、
            一人ひとりに合った睡眠ウェルネスを提案します。
          </p>
        </div>

        <div className="mt-20 space-y-10">
          {programs.map((program) => (
            <article
              key={program.title}
              className="group overflow-hidden rounded-[36px] bg-white shadow-[0_30px_90px_-45px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_40px_100px_-45px_rgba(15,23,42,0.24)]"
            >
              <div className="grid lg:grid-cols-[58%_42%]">
                <div className="relative min-h-[320px] overflow-hidden">
                  <Image
                    src={program.image}
                    alt={program.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(min-width:1024px) 60vw,100vw"
                  />

                  <div className="absolute inset-0 bg-gradient-to-r from-[#071426]/70 via-[#071426]/25 to-transparent" />
                </div>

                <div className="flex items-center p-8 sm:p-10 lg:p-14">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.24em] text-[#8a6a2d]">
                      PROGRAM
                    </p>

                    <h3 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#071426] sm:text-4xl">
                      {program.title}
                    </h3>

                    <p className="mt-6 max-w-md text-base leading-8 text-slate-600">
                      {program.description}
                    </p>

                    <Link
                      href={program.href}
                      className="mt-10 inline-flex items-center gap-3 text-sm font-semibold text-[#315f68] transition-colors hover:text-[#8a6a2d]"
                    >
                      詳しく見る
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}