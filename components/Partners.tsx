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
    name: "めがみの森",
    role: "Nature Retreat",
    image: "/megaminomori.JPG",
    alt: "めがみの森",
  },
];

export default function Partners() {
  return (
    <section
      id="partners"
      className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24"
    >
      <div className="absolute -left-40 top-0 h-[320px] w-[320px] rounded-full bg-cyan-100/35 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[360px] w-[360px] rounded-full bg-amber-100/30 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
            TRUST
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#071426] sm:text-4xl lg:text-5xl">
            実績・パートナー
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
            テクノロジー・ヨガ・自然環境のパートナーとともに活動しています。
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="rounded-[20px] border border-slate-200 bg-[#fafaf8] px-5 py-5 text-center"
            >
              <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d]">
                {item.label}
              </p>
              <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-[#071426]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3 lg:mt-12">
          {partners.map((partner) => (
            <article
              key={partner.name}
              className="group overflow-hidden rounded-[28px] border border-slate-200 bg-[#fafaf8] transition duration-300 hover:-translate-y-1 hover:border-[#315f68]/20 hover:bg-white hover:shadow-[0_28px_70px_-40px_rgba(15,23,42,0.2)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={partner.image}
                  alt={partner.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(min-width:640px) 30vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/50 via-transparent to-transparent" />
              </div>

              <div className="px-5 py-5 sm:px-6">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d]">
                  {partner.role}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#071426]">
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
