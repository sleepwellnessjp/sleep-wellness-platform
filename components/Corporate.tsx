import Image from "next/image";
import Link from "next/link";

const solutions = [
  {
    title: "健康経営",
    items: ["睡眠改善プログラム", "ストレスマネジメント", "SOXAIデータ分析"],
  },
  {
    title: "自治体",
    items: ["地域ウェルネス", "市民向け講演", "イベント企画"],
  },
  {
    title: "教育",
    items: ["学校講演", "教員研修", "睡眠教育"],
  },
  {
    title: "研究・実証",
    items: ["睡眠データ解析", "企業共同研究", "効果検証"],
  },
];

export default function Corporate() {
  return (
    <section
      id="corporate"
      className="relative overflow-hidden bg-gradient-to-b from-[#071426] via-[#071426] to-[#0b1c33]"
    >
      <div className="absolute -left-48 top-0 h-[480px] w-[480px] rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="absolute -right-48 bottom-0 h-[520px] w-[520px] rounded-full bg-amber-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-4xl text-center text-white">
          <p className="text-xs font-semibold tracking-[0.30em] text-amber-200">
            FOR BUSINESS
          </p>

          <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            Sleep Wellness Solutions
          </h2>

          <p className="mx-auto mt-8 max-w-3xl text-base leading-8 text-white/75 sm:text-lg">
            睡眠データとヨガ・呼吸・瞑想・ウェルネス教育を融合し、
            <br className="hidden sm:block" />
            企業・自治体・医療・教育機関向けにSleep Wellness Programを提供します。
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4 lg:mt-20">
          {solutions.map((solution) => (
            <article
              key={solution.title}
              className="group rounded-[24px] border border-white/10 bg-white/95 p-9 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_35px_90px_-40px_rgba(0,0,0,0.45)]"
            >
              <h3 className="text-2xl font-semibold leading-snug tracking-[-0.03em] text-[#071426]">
                {solution.title}
              </h3>

              <ul className="mt-8 space-y-4">
                {solution.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-base leading-7 text-slate-600"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8a6a2d]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="relative mt-20 overflow-hidden rounded-[28px] lg:mt-24">
          <div className="absolute inset-0">
            <Image
              src="/soxai.jpg"
              alt=""
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#071426]/92 via-[#0b1c33]/88 to-[#8a6a2d]/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/70 via-transparent to-[#071426]/40" />
          </div>

          <div className="relative px-8 py-20 text-center sm:px-12 sm:py-24 lg:py-28">
            <p className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl xl:text-6xl">
              Data × Wellness × Japanese Culture
            </p>
          </div>
        </div>

        <div className="mt-16 flex justify-center lg:mt-20">
          <Link
            href="#contact"
            className="group inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-200 to-[#d4b56a] px-12 py-5 text-base font-semibold tracking-wide text-[#071426] shadow-[0_24px_60px_-30px_rgba(212,181,106,0.65)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-28px_rgba(212,181,106,0.8)] sm:px-16 sm:py-6 sm:text-lg"
          >
            企業向けお問い合わせ
            <span className="ml-3 transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
