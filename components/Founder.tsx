import Image from "next/image";

const credentials = [
  "E-RYT500",
  "YACEP",
  "ピラティスインストラクター",
  "Sleep Wellness Producer",
  "メラトニンヨガ™考案",
  "Studio Terrace代表",
  "World Wellness Weekend Japan Ambassador",
  "ヨガフェスタ講師",
  "SOXAI共同実証",
  "企業・自治体講演多数",
];

export default function Founder() {
  return (
    <section
      id="founder"
      className="relative overflow-hidden bg-[#071426] py-24 sm:py-28 lg:py-36"
    >
      <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-300/8 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[480px] w-[480px] rounded-full bg-amber-300/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[44%_56%] lg:gap-20">
          <div className="relative overflow-hidden rounded-[40px] shadow-[0_40px_120px_-50px_rgba(0,0,0,0.65)]">
            <div className="relative aspect-[4/5] min-h-[420px] sm:min-h-[520px] lg:min-h-[620px]">
              <Image
                src="/taka-photo.jpg"
                alt="若林貴久"
                fill
                priority
                className="object-cover object-top"
                sizes="(min-width:1024px) 44vw,100vw"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/80 via-transparent to-[#071426]/10" />
            </div>
          </div>

          <div className="text-white">
            <p className="text-xs font-semibold tracking-[0.30em] text-amber-200">
              Founder
            </p>

            <h2 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Sleep Wellness Producer
            </h2>

            <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              TAKA
            </p>

            <p className="mt-2 text-lg tracking-[0.08em] text-white/70 sm:text-xl">
              若林貴久
            </p>

            <p className="mt-10 max-w-xl text-base leading-8 text-white/75 sm:text-lg">
              睡眠科学・ヨガ・呼吸・瞑想・日本文化を融合し、
              <br className="hidden sm:block" />
              Sleep Wellness Institute Japanを設立。
            </p>
          </div>
        </div>

        <div className="mt-20 sm:mt-24">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {credentials.map((item) => (
              <article
                key={item}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-6 backdrop-blur-sm transition duration-500 hover:border-amber-200/25 hover:bg-white/[0.07]"
              >
                <p className="text-[15px] font-medium leading-relaxed tracking-[-0.01em] text-white/90">
                  {item}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-24 border-t border-white/10 pt-16 text-center sm:mt-28 sm:pt-20">
          <p className="text-3xl font-semibold leading-[1.25] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
            睡眠を、日本の新しい文化へ。
          </p>
        </div>
      </div>
    </section>
  );
}
