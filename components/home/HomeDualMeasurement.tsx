import Link from "next/link";

/**
 * トップ: 睡眠データと夜間血糖の二重計測による分析。
 * PRACTICE（Services）直前。配色・余白は About / Services に合わせる。
 */
export default function HomeDualMeasurement() {
  return (
    <section
      id="dual-measurement"
      aria-labelledby="dual-measurement-heading"
      className="relative scroll-mt-6 overflow-hidden bg-[#071426] py-28 text-white sm:scroll-mt-8 sm:py-24 lg:py-28"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d8b36a]/25 to-transparent" />
      <div className="absolute -left-40 top-10 h-[360px] w-[360px] rounded-full bg-cyan-300/8 blur-3xl" />
      <div className="absolute -right-48 bottom-0 h-[380px] w-[380px] rounded-full bg-amber-300/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
            ANALYSIS
          </p>

          <h2
            id="dual-measurement-heading"
            className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl"
          >
            二つの計測で、眠りの精度を上げる
          </h2>

          <div className="mt-5 max-w-xl space-y-5 text-base leading-8 text-white/70">
            <p>
              眠っている間、体の中では二つのことが同時に起きています。
              ひとつは睡眠そのものの深さやリズム。もうひとつは、血糖値の動きです。
            </p>
            <p>
              Sleep Wellness Method™ では、スマートリング（SOXAI）が記録する
              睡眠段階・心拍変動・呼吸数に加えて、持続血糖測定
              （FreeStyle リブレ2）による夜間の血糖推移を取り込んで分析します。
            </p>
            <p>
              同じ睡眠スコアでも、夜間の血糖が安定している日と、
              大きく動いた日では、体の休まり方が違います。
              二つを重ねることで、「なぜその夜だったのか」に近づけます。
            </p>
          </div>

          <Link
            href="/method/analysis"
            className="mt-6 inline-flex text-[12px] font-semibold text-[#d8b36a] transition hover:text-white sm:mt-7 sm:text-sm"
          >
            分析について詳しく →
          </Link>
        </div>
      </div>
    </section>
  );
}
