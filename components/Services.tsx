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

        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:gap-7">
          {services.map((service) => (
            <article
              key={service.title}
              className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  sizes="(min-width:1024px) 30vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/80 via-[#071426]/20 to-transparent" />
                <p className="absolute bottom-4 left-5 text-xs font-semibold tracking-[0.2em] text-[#d8b36a]">
                  {service.number}
                </p>
              </div>

              <div className="px-6 py-7 sm:px-7">
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                  {service.title}
                </h3>
                <p className="mt-3 text-[14px] leading-7 text-white/65">
                  {service.description}
                </p>
                <Link
                  href={service.href}
                  className="mt-5 inline-flex text-sm font-semibold text-[#d8b36a] transition hover:text-white"
                >
                  {service.cta} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
