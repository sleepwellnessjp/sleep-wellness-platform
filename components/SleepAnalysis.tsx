import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

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

const steps: { label: string; icon: ReactNode }[] = [
  {
    label: "SOXAIリング",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4.5v1.5M12 18v1.5M4.5 12H6M18 12h1.5" />
      </svg>
    ),
  },
  {
    label: "睡眠日誌",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M7 3.75h8.5L19 7.25v13a.75.75 0 0 1-.75.75H7.75A.75.75 0 0 1 7 20.25V3.75Z" />
        <path d="M15.5 3.75V7h3.5M9.5 11h5M9.5 14.5h5M9.5 18h3" />
      </svg>
    ),
  },
  {
    label: "生活習慣",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M12 3.5v2.25M12 18.25V20.5M4.75 12H7M17 12h2.25" />
        <circle cx="12" cy="12" r="4.25" />
        <path d="M7.2 7.2l1.6 1.6M15.2 15.2l1.6 1.6M16.8 7.2l-1.6 1.6M8.8 15.2l-1.6 1.6" />
      </svg>
    ),
  },
  {
    label: "AI分析",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M12 4.5v2M12 17.5v2M5.5 8.5l1.5 1M17 14.5l1.5 1M5.5 15.5l1.5-1M17 9.5l1.5-1" />
        <circle cx="12" cy="12" r="3.25" />
        <path d="M9.5 12h5" />
      </svg>
    ),
  },
  {
    label: "レポート生成",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M6.5 4.75h11a.75.75 0 0 1 .75.75v13a.75.75 0 0 1-.75.75h-11a.75.75 0 0 1-.75-.75v-13a.75.75 0 0 1 .75-.75Z" />
        <path d="M9 9h6M9 12.5h6M9 16h3.5" />
      </svg>
    ),
  },
];

export default function SleepAnalysis() {
  return (
    <section
      id="analysis"
      className="relative overflow-hidden bg-white py-28 sm:py-32 lg:py-40"
    >
      <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-100/40 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-amber-100/35 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
          <div className="relative">
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

                <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/85 via-[#071426]/15 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
                  <p className="text-xs font-semibold tracking-[0.28em] text-amber-200">
                    SLEEP WELLNESS REPORT
                  </p>

                  <p className="mt-4 max-w-md text-2xl font-medium leading-[1.4] tracking-[-0.03em] text-white sm:text-3xl">
                    データと生活習慣から、
                    <br />
                    眠りの改善点を可視化する。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-[#fafaf8]">
              <div className="relative aspect-[21/9] sm:aspect-[3/1]">
                <Image
                  src="/soxai-taka.jpg"
                  alt="SOXAIと睡眠ウェルネス分析の実証"
                  fill
                  className="object-cover object-center"
                  sizes="(min-width:1024px) 52vw,100vw"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-[#071426]/70 via-[#071426]/25 to-transparent" />

                <div className="absolute inset-y-0 left-0 flex items-center p-5 sm:p-7">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.24em] text-amber-200">
                      POWERED BY SOXAI
                    </p>
                    <p className="mt-2 text-sm font-medium text-white sm:text-base">
                      ウェアラブルデータ × AI分析
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-7 flex items-center gap-4">
              <span className="h-px w-12 bg-[#b89242]" />
              <p className="text-xs font-semibold tracking-[0.28em] text-[#8a6a2d]">
                SLEEP ANALYSIS
              </p>
            </div>

            <h2 className="text-5xl font-semibold leading-[1.05] tracking-[-0.05em] text-[#071426] sm:text-6xl lg:text-7xl">
              睡眠を
              <br />
              感覚ではなく
              <br />
              <span className="text-[#315f68]">データで改善する。</span>
            </h2>

            <p className="mt-8 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg sm:leading-9">
              Sleep Wellness Institute Japanでは、
              睡眠データと生活習慣を組み合わせ、
              科学的な分析と実践的なアドバイスによって、
              より良い眠りへ導きます。
            </p>

            {/* 5-step horizontal flow */}
            <div className="mt-12 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="relative min-w-[560px] sm:min-w-0">
                <div
                  className="absolute left-[10%] right-[10%] top-[28px] h-px bg-gradient-to-r from-[#315f68]/20 via-[#b89242]/45 to-[#315f68]/20"
                  aria-hidden="true"
                />

                <ol className="relative grid grid-cols-5 gap-2">
                  {steps.map((step, index) => (
                    <li
                      key={step.label}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#315f68]/15 bg-[#f4f8f8] text-[#315f68] shadow-[0_10px_30px_-18px_rgba(49,95,104,0.45)] transition duration-500 hover:-translate-y-1 hover:border-[#b89242]/40 hover:bg-white hover:text-[#8a6a2d]">
                        {step.icon}
                      </div>
                      <p className="mt-3 text-[11px] font-semibold leading-4 tracking-[-0.01em] text-[#071426] sm:text-xs">
                        {step.label}
                      </p>
                      <p className="mt-1.5 text-[10px] font-semibold tracking-[0.18em] text-[#8a6a2d]">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-[24px] border border-slate-200 bg-[#fafaf8] p-6 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.16)] transition-all duration-500 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_30px_80px_-40px_rgba(15,23,42,0.24)]"
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

            <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/analysis/new"
                className="group inline-flex items-center justify-center rounded-full bg-[#071426] px-8 py-4 text-sm font-semibold text-white transition-all duration-500 hover:-translate-y-1 hover:bg-[#10223a]"
              >
                分析をはじめる
                <span className="ml-3 transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <Link
                href="#contact"
                className="inline-flex items-center justify-center gap-3 border-b border-[#0b1b31]/25 pb-2 text-sm font-bold tracking-[0.08em] text-[#0b1b31] transition duration-300 hover:border-[#b89242] hover:text-[#8a6a2d] sm:border-0 sm:pb-0"
              >
                法人向けのご相談
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
