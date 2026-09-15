import Image from "next/image";
import Link from "next/link";

const services = [
  {
    number: "01",
    title: "間のヨガ™",
    description: "昼の切り替えを整え、夜の休息へつなぐ Method の一部。",
    image: "/yogafest2.jpg",
    href: "/ma-no-yoga",
    cta: "昼のプログラムを見る",
  },
  {
    number: "02",
    title: "メラトニンヨガ™",
    description: "就寝前に、活動から休息へ穏やかに切り替える夜の実践。",
    image: "/melatonin-yoga.jpg",
    href: "/melatonin-yoga",
    cta: "夜プログラムを見る",
  },
  {
    number: "03",
    title: "Academy",
    description: "認定講師が Method を伝え、社会へ広げていく。",
    image: "/academy.jpg",
    href: "/academy/certified-instructor",
    cta: "認定講師になる",
  },
  {
    number: "04",
    title: "睡眠のための料理",
    description: "眠りを妨げない、短時間で作れる食事。",
    image: "/sleep-recipe-card.jpg",
    href: "/recipes",
    cta: "レシピを見る",
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="relative scroll-mt-6 overflow-hidden bg-[#071426] py-28 sm:scroll-mt-8 sm:py-24 lg:py-28"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d8b36a]/25 to-transparent" />
      <div className="absolute -right-48 top-10 h-[380px] w-[380px] rounded-full bg-cyan-300/8 blur-3xl" />
      <div className="absolute -left-48 bottom-0 h-[360px] w-[360px] rounded-full bg-amber-300/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
            PRACTICE
          </p>

          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
            昼と夜で、眠りを整える
          </h2>

          <p className="mt-5 max-w-xl text-base leading-8 text-white/70">
            Sleep Wellness Method™ は、分析結果を実践へつなぐための流れです。
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 items-stretch gap-3 sm:mt-12 sm:gap-4 lg:mt-14 lg:grid-cols-4 lg:gap-5">
          {services.map((service) => (
            <article
              key={service.title}
              className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] sm:rounded-[24px]"
            >
              <div className="relative aspect-[4/3] shrink-0 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  sizes="(min-width:1024px) 22vw, 45vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/80 via-[#071426]/20 to-transparent" />
                <p className="absolute bottom-2.5 left-3 text-[10px] font-semibold tracking-[0.2em] text-[#d8b36a] sm:bottom-3 sm:left-4 sm:text-xs">
                  {service.number}
                </p>
              </div>

              <div className="flex flex-1 flex-col px-3 py-3.5 sm:px-4 sm:py-4">
                <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.03em] text-white sm:text-base">
                  {service.title}
                </h3>
                <p className="mt-1.5 flex-1 text-[12px] leading-5 text-white/65 sm:mt-2 sm:text-[13px] sm:leading-6">
                  {service.description}
                </p>
                <Link
                  href={service.href}
                  className="mt-2.5 inline-flex text-[12px] font-semibold text-[#d8b36a] transition hover:text-white sm:mt-3 sm:text-sm"
                >
                  {service.cta} →
                </Link>
              </div>
            </article>
          ))}
        </div>

        <Link
          href="/practice/1012"
          className="group mt-4 flex w-full items-center justify-between gap-4 rounded-[22px] border px-5 py-5 transition duration-300 hover:-translate-y-0.5 sm:mt-5 sm:rounded-[24px] sm:px-7 sm:py-6 lg:mt-6"
          style={{
            borderColor: "rgba(216,179,106,0.35)",
            background:
              "linear-gradient(180deg, rgba(7,20,38,0.97) 0%, rgba(7,20,38,0.92) 100%)",
            boxShadow: "inset 0 1px 0 rgba(216,179,106,0.12)",
          }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-[#d8b36a] sm:text-[11px] sm:tracking-[0.28em]">
              昼・動かない
            </p>
            <p className="mt-2 text-[17px] font-semibold tracking-[-0.03em] text-white sm:mt-2.5 sm:text-xl">
              Coming 10.12
            </p>
            <p className="mt-1.5 text-[13px] leading-6 text-white/70 sm:mt-2 sm:text-[14px] sm:leading-7">
              音と静寂で、動かずに整える
            </p>
          </div>
          <span
            aria-hidden
            className="shrink-0 text-lg font-semibold text-[#d8b36a] transition group-hover:translate-x-0.5 group-hover:text-white sm:text-xl"
          >
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
