import Link from "next/link";

const principles = [
  {
    number: "01",
    title: "Data",
    subtitle: "睡眠を可視化する",
  },
  {
    number: "02",
    title: "Priority",
    subtitle: "今日の順番を決める",
  },
  {
    number: "03",
    title: "Practice",
    subtitle: "昼と夜で実践する",
  },
];

export default function About({
  analysisHref,
}: {
  analysisHref: string;
}) {
  return (
    <section
      id="about"
      className="relative scroll-mt-6 overflow-hidden bg-[#071426] py-28 text-white sm:scroll-mt-8 sm:py-24 lg:py-28"
    >
      <div className="absolute -left-40 top-10 h-[360px] w-[360px] rounded-full bg-cyan-300/8 blur-3xl" />
      <div className="absolute -right-48 bottom-0 h-[380px] w-[380px] rounded-full bg-amber-300/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-10 sm:mb-12">
            <Link
              href={analysisHref}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 text-sm font-semibold text-white backdrop-blur-sm transition duration-500 hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/18 sm:text-base"
            >
              クライアントの分析
            </Link>
            <p className="mt-2 px-1 text-[11px] leading-5 text-white/50 sm:text-xs">
              認定講師専用
            </p>
          </div>

          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
            METHOD
          </p>

          <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl">
            Sleep Wellness Method™
          </h2>

          <div className="mt-8 space-y-5 text-[15px] leading-7 text-white/70 sm:mt-9 sm:space-y-6 sm:text-base sm:leading-8">
            <p>
              データを見て終わるのではなく、睡眠の状態をAIで分析し、改善の優先順位を明確に。
              その結果をもとに、認定講師が一人ひとりに合わせたヨガ・呼吸・生活習慣などの実践へつなげます。
            </p>
            <p>
              さらにSleep Wellness Institute Japanでは、ヨガインストラクターがクライアントの睡眠データをAIで分析し、その結果をヨガのメニュー作成や日々の指導へ活用できる独自システムを開発。
            </p>
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 text-white/80 backdrop-blur-sm sm:px-6 sm:py-6">
              「睡眠を測る」だけではなく、
              <br />
              データ → 分析 → 指導 → 実践 → 再評価
              <br />
              までをつなぐ。
              <br className="hidden sm:block" />
              それがSleep Wellness Method™です。
            </p>
          </div>

          <div className="relative z-10 mt-9 sm:mt-10">
            <Link
              href="/pricing"
              className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-full border border-[#d8b36a]/40 bg-white/[0.03] px-6 text-sm font-semibold text-[#d8b36a] transition hover:border-[#d8b36a]/70 hover:bg-white/[0.07]"
            >
              料金・プログラムを見る
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-6 border-t border-white/10 pt-10 sm:grid-cols-3 sm:gap-8">
          {principles.map((item) => (
            <article key={item.number} className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#d8b36a]">
                {item.number}
              </p>
              <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                {item.title}
              </h3>
              <p className="text-[15px] leading-7 text-white/55">
                {item.subtitle}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
