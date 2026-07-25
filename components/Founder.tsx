import Image from "next/image";

const credentials = [
  "E-RYT500 / YACEP",
  "メラトニンヨガ™考案",
  "Sleep Wellness Producer",
  "SOXAI共同実証",
  "World Wellness Weekend Japan Ambassador",
];

export default function Founder() {
  return (
    <section
      id="founder"
      className="relative overflow-hidden bg-[#071426] py-16 sm:py-20 lg:py-24"
    >
      <div className="absolute -left-40 top-0 h-[320px] w-[320px] rounded-full bg-cyan-300/8 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[360px] w-[360px] rounded-full bg-amber-300/8 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[40%_60%] lg:gap-16">
          <div className="relative overflow-hidden rounded-[32px] shadow-[0_40px_120px_-50px_rgba(0,0,0,0.65)]">
            <div className="relative aspect-[4/5] min-h-[360px] sm:min-h-[440px]">
              <Image
                src="/taka-photo.jpg"
                alt="若林貴久"
                fill
                className="object-cover object-top"
                sizes="(min-width:1024px) 40vw,100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/80 via-transparent to-[#071426]/10" />
            </div>
          </div>

          <div className="text-white">
            <p className="text-center text-xs font-semibold tracking-[0.30em] text-amber-200">
              FOUNDER
            </p>

            <div className="mt-5 text-center sm:mt-6">
              <h2 className="text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                TAKA
              </h2>
              <p className="mt-2.5 text-2xl font-semibold leading-snug tracking-[-0.03em] text-white/92 sm:mt-3 sm:text-3xl lg:text-4xl">
                若林貴久
              </p>
              <p className="mt-4 text-base tracking-[0.06em] text-white/65 sm:mt-5">
                Sleep Wellness Producer
              </p>
            </div>

            <p className="mt-8 max-w-lg text-base leading-8 text-white/75 lg:mt-10">
              睡眠科学・ヨガ・呼吸・瞑想・日本文化を融合し、
              Sleep Wellness Institute Japanを設立。
            </p>

            <ul className="mt-8 flex flex-wrap gap-2.5">
              {credentials.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/85"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
