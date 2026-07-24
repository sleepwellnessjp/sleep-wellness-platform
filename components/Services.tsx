import Image from "next/image";
import Link from "next/link";

const services = [
  {
    number: "01",
    title: "メラトニンヨガ™",
    description: "ヨガ・呼吸・瞑想で、夜の休息へ導く実践プログラム。",
    image: "/melatonin-yoga.jpg",
    href: "#contact",
    cta: "体験を相談する",
  },
  {
    number: "02",
    title: "Sleep Analysis",
    description: "睡眠データと生活習慣から、改善の優先順位を可視化。",
    image: "/sleep-analysis.jpg",
    href: "/analysis/new",
    cta: "睡眠分析を受ける",
  },
  {
    number: "03",
    title: "Academy",
    description: "NavigatorからInstructorへ。睡眠ウェルネスを伝える人材を育成。",
    image: "/yogafest.jpg",
    href: "#contact",
    cta: "認定講師になる",
  },
];

export default function Services() {
  return (
    <section
      id="services"
      className="relative overflow-hidden bg-[#fafaf8] py-16 sm:py-20 lg:py-24"
    >
      <div className="absolute -left-40 top-0 h-[320px] w-[320px] rounded-full bg-cyan-100/40 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[360px] w-[360px] rounded-full bg-amber-100/35 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
            SERVICES
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#071426] sm:text-4xl lg:text-5xl">
            3つのサービス
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
            実践・分析・育成で、睡眠ウェルネスを届けます。
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:mt-14 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="group overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_80px_-40px_rgba(15,23,42,0.22)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(min-width:1024px) 30vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/55 via-transparent to-transparent" />
                <p className="absolute left-5 bottom-4 text-xs font-bold tracking-[0.22em] text-amber-200">
                  {service.number}
                </p>
              </div>

              <div className="p-6 sm:p-7">
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                  {service.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {service.description}
                </p>

                <Link
                  href={service.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#315f68] transition-colors hover:text-[#8a6a2d]"
                >
                  {service.cta}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
