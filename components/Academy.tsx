import Image from "next/image";
import Link from "next/link";

const pathway = [
  {
    stage: "01",
    name: "Navigator",
    role: "入門",
    summary: "基礎を学び、日常で実践する",
  },
  {
    stage: "02",
    name: "Instructor",
    role: "指導",
    summary: "科学と身体実践を伝える",
  },
  {
    stage: "03",
    name: "Producer",
    role: "創造",
    summary: "社会へ睡眠文化を広げる",
  },
];

const academyPrograms = [
  {
    number: "01",
    title: "Sleep Wellness Navigator",
    subtitle: "入門資格",
    description:
      "睡眠ウェルネスの基礎を学び、日常生活やコミュニティで実践できる入門プログラム。",
    image: "/yogafest.jpg",
    alt: "Sleep Wellness Navigatorの学習風景",
  },
  {
    number: "02",
    title: "Melatonin Yoga™ Instructor",
    subtitle: "認定指導者",
    description:
      "メラトニンヨガ™を指導できるインストラクターを育成。科学と身体実践を伝える資格。",
    image: "/melatonin-yoga.jpg",
    alt: "メラトニンヨガ™インストラクター養成",
  },
  {
    number: "03",
    title: "Sleep Wellness Producer",
    subtitle: "プロフェッショナル",
    description:
      "企業・地域・教育へ睡眠ウェルネスを広げるプロデューサーを育成する上級プログラム。",
    image: "/taka-watamoto.jpg",
    alt: "Sleep Wellness Producerの活動",
  },
];

export default function Academy() {
  return (
    <section
      id="academy"
      className="relative overflow-hidden bg-[#f4f1e9] py-28 text-[#0b1b31] sm:py-32 lg:py-40"
    >
      <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-100/50 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-amber-100/45 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:gap-16">
          <div>
            <div className="mb-7 flex items-center gap-4">
              <span className="h-px w-12 bg-[#b89242]" />
              <p className="text-xs font-semibold tracking-[0.28em] text-[#8a6a2d]">
                ACADEMY
              </p>
            </div>

            <h2 className="text-4xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Sleep Wellness
              <br />
              <span className="text-[#315f68]">Academy</span>
            </h2>
          </div>

          <p className="max-w-xl text-base leading-8 text-slate-700 sm:text-lg sm:leading-9 lg:justify-self-end lg:text-right">
            睡眠ウェルネスを学び、実践し、
            社会へ届ける人材を育成します。
            データと身体知をつなぐ学びの場です。
          </p>
        </div>

        {/* Growth pathway diagram */}
        <div className="mt-14 overflow-hidden rounded-[32px] border border-[#0b1b31]/08 bg-white/70 p-6 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.18)] backdrop-blur-sm sm:mt-16 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
                GROWTH PATHWAY
              </p>
              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-xl">
                3段階で、実践者から創造者へ。
              </p>
            </div>
            <p className="max-w-sm text-sm leading-7 text-slate-600 sm:text-right">
              Navigator から始まり、Instructor、Producer へと段階的に育成します。
            </p>
          </div>

          <div className="relative mt-10">
            <div
              className="absolute left-[16.5%] right-[16.5%] top-[34px] hidden h-px bg-gradient-to-r from-[#315f68]/25 via-[#b89242]/55 to-[#315f68]/25 lg:block"
              aria-hidden="true"
            />

            <div className="grid gap-6 sm:grid-cols-3 sm:gap-4 lg:gap-8">
              {pathway.map((item, index) => (
                <div key={item.name} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[#315f68]/15 bg-[#f7f5ef] shadow-[0_12px_36px_-20px_rgba(7,20,38,0.35)] transition duration-500 hover:-translate-y-1 hover:border-[#b89242]/45 hover:bg-white">
                    <span className="text-sm font-semibold tracking-[0.14em] text-[#8a6a2d]">
                      {item.stage}
                    </span>
                  </div>

                  <p className="mt-5 text-[10px] font-semibold tracking-[0.22em] text-[#315f68]">
                    {item.role}
                  </p>

                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071426]">
                    {item.name}
                  </h3>

                  <p className="mt-3 max-w-[200px] text-sm leading-7 text-slate-600">
                    {item.summary}
                  </p>

                  {index < pathway.length - 1 ? (
                    <div
                      className="mt-4 flex items-center justify-center text-[#b89242] sm:hidden"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-5 w-5"
                      >
                        <path d="M12 5v14M7 14l5 5 5-5" />
                      </svg>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 space-y-8 lg:mt-20">
          {academyPrograms.map((program, index) => (
            <article
              key={program.title}
              className="group overflow-hidden rounded-[36px] bg-white shadow-[0_30px_90px_-45px_rgba(15,23,42,0.18)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_40px_100px_-45px_rgba(15,23,42,0.24)]"
            >
              <div
                className={`grid lg:grid-cols-[48%_52%] ${
                  index % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""
                }`}
              >
                <div className="relative min-h-[280px] overflow-hidden sm:min-h-[320px]">
                  <Image
                    src={program.image}
                    alt={program.alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(min-width:1024px) 48vw,100vw"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/55 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#071426]/20" />
                </div>

                <div className="flex items-center p-8 sm:p-10 lg:p-14">
                  <div>
                    <div className="flex items-center gap-4">
                      <p className="text-xs font-bold tracking-[0.22em] text-[#8a6a2d]">
                        {program.number}
                      </p>
                      <span className="rounded-full bg-[#315f68]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-[#315f68]">
                        {program.subtitle}
                      </span>
                    </div>

                    <h3 className="mt-6 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#071426] sm:text-4xl">
                      {program.title}
                    </h3>

                    <p className="mt-6 max-w-md text-base leading-8 text-slate-600">
                      {program.description}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 overflow-hidden rounded-[32px] bg-[#071426] lg:mt-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-center px-8 py-12 sm:px-12 sm:py-16 lg:px-14">
              <p className="text-xs font-semibold tracking-[0.28em] text-amber-200">
                COMING SOON
              </p>

              <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                学びの場を、
                <br />
                まもなく公開します。
              </h3>

              <p className="mt-6 max-w-lg text-base leading-8 text-white/70">
                養成講座の詳細・開講スケジュールは準備中です。
                先行案内をご希望の方は、お気軽にお問い合わせください。
              </p>

              <Link
                href="#contact"
                className="group mt-10 inline-flex w-fit items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold text-[#071426] transition duration-500 hover:-translate-y-1 hover:bg-[#f4f4f4]"
              >
                先行案内を受け取る
                <span className="ml-3 transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>

            <div className="relative min-h-[240px] lg:min-h-full">
              <Image
                src="/retreat.jpg"
                alt="Sleep Wellness Academyの学びのイメージ"
                fill
                className="object-cover"
                sizes="(min-width:1024px) 40vw,100vw"
              />
              <div className="absolute inset-0 bg-[#071426]/35" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
