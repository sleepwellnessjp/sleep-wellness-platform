import Image from "next/image";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "SOXAIデータ",
    description:
      "ウェアラブルデバイスから取得した睡眠・心拍・ストレスなどのデータを多角的に確認します。",
  },
  {
    number: "02",
    title: "AI分析",
    description:
      "睡眠データと生活習慣を組み合わせ、一人ひとりの状態を総合的に分析します。",
  },
  {
    number: "03",
    title: "睡眠レポート",
    description:
      "数値だけでは分からない睡眠の特徴を、分かりやすいレポートとして可視化します。",
  },
  {
    number: "04",
    title: "改善提案",
    description:
      "生活リズム・呼吸・運動・休息まで含めた具体的な改善プランをご提案します。",
  },
];

export default function SleepAnalysis() {
  return (
    <section
      id="analysis"
      className="relative overflow-hidden bg-white py-24 sm:py-28 lg:py-36"
    >
      <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-100/40 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-amber-100/35 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
          <div className="relative overflow-hidden rounded-[36px] shadow-[0_40px_100px_-45px_rgba(15,23,42,0.28)]">
            <div className="relative aspect-[4/5] lg:aspect-[5/6]">
              <Image
                src="/sleep-analysis.jpg"
                alt="Sleep Wellness Analysis"
                fill
                priority
                className="object-cover"
                sizes="(min-width:1024px) 52vw,100vw"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
              SLEEP ANALYSIS
            </p>

            <h2 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-[-0.05em] text-[#071426] sm:text-6xl lg:text-7xl">
              睡眠を
              <br />
              感覚ではなく
              <br />
              <span className="text-[#315f68]">
                データで改善する。
              </span>
            </h2>

            <p className="mt-8 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Sleep Wellness Institute Japanでは、
              睡眠データと生活習慣を組み合わせ、
              科学的な分析と実践的なアドバイスによって、
              より良い眠りへ導きます。
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-[24px] border border-slate-200 bg-[#fafaf8] p-6 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_30px_80px_-40px_rgba(15,23,42,0.24)]"
                >
                  <p className="text-xs font-semibold tracking-[0.24em] text-[#8a6a2d]">
                    {feature.number}
                  </p>

                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#071426]">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-12">
              <Link
                href="#contact"
                className="group inline-flex items-center justify-center rounded-full bg-[#071426] px-8 py-4 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#10223a]"
              >
                分析を受ける
                <span className="ml-3 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}