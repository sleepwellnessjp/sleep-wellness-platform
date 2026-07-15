import Image from "next/image";

const partners = [
  {
    name: "SOXAI",
    image: "/soxai.jpg",
    alt: "SOXAI",
  },
  {
    name: "YogaWorks",
    image: "/yogaworks.jpg",
    alt: "YogaWorks",
  },
  {
    name: "めがみの森",
    image: "/megaminomori.JPG",
    alt: "めがみの森",
  },
];

export default function Partners() {
  return (
    <section
      id="partners"
      className="relative overflow-hidden bg-white py-24 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#8a6a2d]">
            PARTNERS
          </p>

          <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-[#071426] sm:text-5xl">
            パートナー
          </h2>

          <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
            睡眠ウェルネスの実践を支える、テクノロジー・ヨガ・自然環境のパートナーです。
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {partners.map((partner) => (
            <article
              key={partner.name}
              className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#fafaf8]"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={partner.image}
                  alt={partner.alt}
                  fill
                  className="object-cover"
                  sizes="(min-width:640px) 30vw, 100vw"
                />
              </div>

              <div className="px-6 py-5">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#071426]">
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
