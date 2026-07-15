import Link from "next/link";

const services = [
  {
    icon: "🎤",
    title: "Sleep Wellness Seminar",
    description: "睡眠科学と生活改善を学ぶ講演・研修",
  },
  {
    icon: "🏢",
    title: "Corporate Program",
    description: "ヨガ・呼吸・瞑想を組み合わせた企業向けプログラム",
  },
  {
    icon: "📊",
    title: "Data & Research",
    description: "ウェアラブルデータを活用した実証・効果測定",
  },
  {
    icon: "🤝",
    title: "Event & Collaboration",
    description: "企業・地域・メディアとの共同イベント",
  },
];

const flow = [
  "ヒアリング",
  "プログラム設計",
  "実施・測定",
  "レポート・改善提案",
];

export default function Corporate() {
  return (
    <section
      id="corporate"
      className="relative overflow-hidden bg-gradient-to-b from-[#071426] via-[#071426] to-white"
    >
      <div className="absolute -left-48 top-0 h-[480px] w-[480px] rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="absolute -right-48 bottom-0 h-[520px] w-[520px] rounded-full bg-amber-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-4xl text-center text-white">
          <p className="text-xs font-semibold tracking-[0.30em] text-amber-200">
            CORPORATE
          </p>

          <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            睡眠ウェルネスを、
            <br />
            組織の力へ。
          </h2>

          <p className="mx-auto mt-8 max-w-3xl text-base leading-8 text-white/75 sm:text-lg">
            企業・自治体・教育機関に向けて、
            <br className="hidden sm:block" />
            睡眠研修、健康経営、実証プロジェクトを提供します。
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4 lg:mt-20">
          {services.map((service) => (
            <article
              key={service.title}
              className="group rounded-[24px] border border-white/10 bg-white/95 p-9 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_35px_90px_-40px_rgba(0,0,0,0.45)]"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#315f68]/10 text-3xl transition-all duration-300 group-hover:bg-[#315f68]/15">
                {service.icon}
              </div>

              <h3 className="mt-10 text-2xl font-semibold leading-snug tracking-[-0.03em] text-[#071426]">
                {service.title}
              </h3>

              <p className="mt-5 text-base leading-8 text-slate-600">
                {service.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-20 rounded-[24px] border border-slate-200 bg-white p-8 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.18)] sm:p-10 lg:mt-24 lg:p-12">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
                WORKFLOW
              </p>

              <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#071426] sm:text-4xl">
                導入の流れ
              </h3>
            </div>

            <Link
              href="#contact"
              className="group inline-flex items-center justify-center rounded-full bg-[#071426] px-8 py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#10223a]"
            >
              企業導入について相談する
              <span className="ml-3 transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {flow.map((step, index) => (
              <div
                key={step}
                className="rounded-[20px] border border-slate-200 bg-[#fafaf8] p-7 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
              >
                <p className="text-xs font-semibold tracking-[0.24em] text-[#8a6a2d]">
                  {String(index + 1).padStart(2, "0")}
                </p>

                <h4 className="mt-5 text-xl font-semibold text-[#071426]">
                  {step}
                </h4>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}