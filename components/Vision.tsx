import Image from "next/image";

const ecosystem = [
  {
    label: "DATA",
    title: "睡眠分析",
    description: "ウェアラブルと生活習慣から、眠りの状態を可視化する。",
  },
  {
    label: "PRACTICE",
    title: "身体実践",
    description: "ヨガ・呼吸・瞑想で、心身を休息モードへ導く。",
  },
  {
    label: "LEARNING",
    title: "学びと育成",
    description: "アカデミーと講座で、睡眠ウェルネスを伝える人を育てる。",
  },
  {
    label: "COMMUNITY",
    title: "社会実装",
    description: "企業・地域・メディアと連携し、良い眠りを社会へ広げる。",
  },
];

export default function Vision() {
  return (
    <section
      id="vision"
      className="relative overflow-hidden bg-[#071426] text-white"
    >
      <div className="absolute inset-0">
        <Image
          src="/melatonin-yoga.jpg"
          alt="メラトニンヨガの実践風景"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />

        <div className="absolute inset-0 bg-[#071426]/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071426]/80 via-[#071426]/50 to-[#071426]/92" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071426]/40 via-transparent to-[#071426]/40" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold tracking-[0.32em] text-white/65 sm:text-sm">
            SLEEP WELLNESS ECOSYSTEM
          </p>

          <h2 className="mt-8 text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl md:text-7xl lg:text-8xl">
            Sleep is
            <br />
            the Foundation
            <br />
            of Life.
          </h2>

          <p className="mt-8 text-2xl font-medium leading-tight tracking-[-0.04em] text-white sm:mt-10 sm:text-3xl lg:text-4xl">
            睡眠を、
            <br className="sm:hidden" />
            人生の土台へ。
          </p>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/75 sm:mt-8 sm:text-lg lg:text-xl lg:leading-9">
            データ・実践・学び・社会実装がつながる
            <br className="hidden sm:block" />
            Sleep Wellness Ecosystemで、
            <br className="hidden sm:block" />
            一人ひとりの眠りから、社会全体のウェルネスへ。
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-5xl sm:mt-16 lg:mt-20">
          <div className="mb-8 flex items-center justify-center gap-3 sm:mb-10">
            <span className="h-px w-8 bg-white/25 sm:w-12" />
            <p className="text-[10px] font-semibold tracking-[0.28em] text-amber-200/90 sm:text-xs">
              ECOSYSTEM PILLARS
            </p>
            <span className="h-px w-8 bg-white/25 sm:w-12" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {ecosystem.map((item, index) => (
              <article
                key={item.label}
                className="group relative overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/8 p-6 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-amber-200/30 hover:bg-white/12 sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-[0.22em] text-amber-200">
                    {item.label}
                  </span>
                  <span className="text-xs font-medium text-white/35">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/70">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-7 text-white/55 sm:mt-12 sm:text-base sm:leading-8">
            分析で知り、実践で整え、学びで広げ、社会で循環させる。
            <br className="hidden sm:block" />
            それが、私たちが描く Sleep Wellness Ecosystem の世界観です。
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
    </section>
  );
}
