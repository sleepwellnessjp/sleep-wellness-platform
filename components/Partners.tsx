import Image from "next/image";

const partners = [
  {
    name: "SOXAI",
    role: "Sleep Technology",
    description: "ウェアラブルデバイスによる睡眠・生体データの可視化パートナー。",
    image: "/soxai.jpg",
    alt: "SOXAI",
  },
  {
    name: "YogaWorks",
    role: "Yoga Practice",
    description: "ヨガ実践とコミュニティを通じて、身体からの睡眠改善を支える。",
    image: "/yogaworks.jpg",
    alt: "YogaWorks",
  },
  {
    name: "めがみの森",
    role: "Nature Retreat",
    description: "自然環境のなかで、回復と休息の質を見つめ直すリトリート拠点。",
    image: "/megaminomori.JPG",
    alt: "めがみの森",
  },
];

export default function Partners() {
  return (
    <section
      id="partners"
      className="relative overflow-hidden bg-white py-24 sm:py-28 lg:py-36"
    >
      <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-100/35 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-amber-100/30 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
            PARTNERS
          </p>

          <h2 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-[#071426] sm:text-5xl lg:text-6xl">
            パートナー
          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            テクノロジー・ヨガ・自然環境のパートナーとともに、
            睡眠ウェルネスの実践を支えています。
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3 lg:mt-20">
          {partners.map((partner) => (
            <article
              key={partner.name}
              className="group overflow-hidden rounded-[32px] border border-slate-200 bg-[#fafaf8] shadow-[0_18px_60px_-40px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-2 hover:border-[#315f68]/20 hover:bg-white hover:shadow-[0_35px_90px_-40px_rgba(15,23,42,0.24)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={partner.image}
                  alt={partner.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(min-width:640px) 30vw, 100vw"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/55 via-transparent to-transparent opacity-80" />
              </div>

              <div className="px-6 py-7 sm:px-7 sm:py-8">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d]">
                  {partner.role}
                </p>

                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#071426]">
                  {partner.name}
                </h3>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {partner.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
