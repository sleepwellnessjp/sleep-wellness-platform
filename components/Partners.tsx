import Image from "next/image";

const highlights = [
  { label: "MEDIA", value: "雑誌・新聞・TV" },
  { label: "EVENTS", value: "ヨガフェスタ登壇" },
  { label: "RESEARCH", value: "SOXAI共同実証" },
];

const partners = [
  {
    name: "SOXAI",
    role: "Sleep Technology",
    image: "/soxai.jpg",
    alt: "SOXAI",
  },
  {
    name: "YogaWorks",
    role: "Yoga Practice",
    image: "/yogaworks.jpg",
    alt: "YogaWorks",
  },
  {
    name: "全国認定宿泊施設",
    role: "Nature Retreat",
    image: "/zenkoku-nintei-shukuhaku.jpg",
    alt: "全国認定宿泊施設",
  },
];

export default function Partners() {
  return (
    <section
      id="partners"
      className="relative overflow-hidden bg-[#071426] py-24 sm:py-20 lg:py-24"
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

        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
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

        <div className="mt-10 grid gap-5 sm:grid-cols-3 lg:mt-12">
          {partners.map((partner) => (
            <article
              key={partner.name}
              className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-[0_28px_70px_-40px_rgba(0,0,0,0.6)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={partner.image}
                  alt={partner.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(min-width:640px) 30vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/70 via-[#071426]/15 to-transparent" />
              </div>

              <div className="px-5 py-5 sm:px-6">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#d8b36a]">
                  {partner.role}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                  {partner.name}
                </h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
