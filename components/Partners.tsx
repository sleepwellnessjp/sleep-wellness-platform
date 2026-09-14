import Image from "next/image";

const highlights = [
  { label: "MEDIA", value: "雑誌・新聞・TV" },
  { label: "EVENTS", value: "ヨガフェスタ登壇" },
  { label: "RESEARCH", value: "SOXAI共同実証" },
];

const partnerships = [
  {
    logo: "/soxai-logo.png",
    logoAlt: "SOXAI",
    label: "Sleep Technology",
    body: "スマートリングによる睡眠計測で、体感を数値に変える共同実証を進めています。",
  },
  {
    logo: "/yogaworks-logo.png",
    logoAlt: "YogaWorks",
    label: "Yoga Practice",
    body: "ヨガフェスタ主催・綿本哲社長と、睡眠ウェルネスの普及と検証に取り組んでいます。",
  },
];

/** 両ロゴの表示高さを揃える（幅は比率維持） */
const LOGO_HEIGHT_PX = 36;

export default function Partners() {
  return (
    <section
      id="partners"
      className="relative overflow-hidden bg-[#071426] py-16 sm:py-16 lg:py-20"
    >
      <div className="absolute -left-40 top-0 h-[320px] w-[320px] rounded-full bg-cyan-300/8 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[360px] w-[360px] rounded-full bg-amber-300/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold tracking-[0.30em] text-[#d8b36a]">
            TRUST
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">
            実績・パートナー
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/70">
            テクノロジー・ヨガ・自然環境のパートナーとともに活動しています。
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:mt-10 sm:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-white/10 bg-white/[0.04] px-5 py-5 text-center backdrop-blur-sm"
            >
              <p className="text-[10px] font-semibold tracking-[0.22em] text-[#d8b36a]">
                {item.label}
              </p>
              <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 sm:mt-12">
          <div className="mx-auto max-w-3xl text-center lg:max-w-4xl">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
              PARTNERSHIP
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
              共に進めている取り組み
            </h3>
          </div>

          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 items-stretch gap-3 sm:mt-7 sm:gap-4 lg:max-w-4xl lg:gap-5">
            {partnerships.map((item) => (
              <article
                key={item.label}
                className="flex h-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-3.5 backdrop-blur-sm sm:rounded-[22px] sm:px-4 sm:py-4"
              >
                <div className="flex items-center justify-center rounded-2xl bg-white px-4 py-4 sm:px-5 sm:py-5">
                  <Image
                    src={item.logo}
                    alt={item.logoAlt}
                    width={240}
                    height={LOGO_HEIGHT_PX}
                    className="h-9 w-auto max-w-full object-contain object-center"
                    style={{ height: LOGO_HEIGHT_PX, width: "auto" }}
                  />
                </div>
                <p className="mt-3 text-[10px] font-semibold tracking-[0.22em] text-[#d8b36a]">
                  {item.label}
                </p>
                <p className="mt-1.5 text-[12px] leading-5 text-white/70 sm:text-[13px] sm:leading-6">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
