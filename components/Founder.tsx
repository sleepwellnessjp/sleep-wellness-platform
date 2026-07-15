import Image from "next/image";

const highlights = [
  {
    title: "若林貴久 × 綿本哲",
    image: "/taka-watamoto.JPG",
  },
  {
    title: "SOXAI共同プロジェクト",
    image: "/soxai-taka.JPG",
  },
  {
    title: "ヨガフェスタ登壇",
    image: "/yogafest.JPG",
  },
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
        <div className="grid items-center gap-16 lg:grid-cols-[48%_52%] lg:gap-20">
          <div className="relative overflow-hidden rounded-[40px] shadow-[0_40px_120px_-50px_rgba(0,0,0,0.65)]">
            <div className="relative aspect-[4/5] min-h-[620px]">
              <Image
                src="/taka-photo.JPG"
                alt="若林貴久"
                fill
                priority
                className="object-cover object-top"
                sizes="(min-width:1024px) 48vw,100vw"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/85 via-transparent to-[#071426]/10" />

              <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10">
                <p className="text-xs font-semibold tracking-[0.28em] text-amber-200">
                  SLEEP WELLNESS PRODUCER
                </p>

                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  若林 貴久
                </h2>
              </div>
            </div>
          </div>

          <div className="text-white">
            <p className="text-xs font-semibold tracking-[0.30em] text-amber-200">
              FOUNDER
            </p>

            <h3 className="mt-8 text-5xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-6xl">
              Sleep Wellness
              <br />
              Producer
            </h3>

            <blockquote className="mt-12 border-l border-white/20 pl-7">
              <p className="text-3xl font-medium leading-[1.5] tracking-[-0.03em] sm:text-4xl">
                睡眠を整えることは、
                <br />
                人生を整えること。
              </p>
            </blockquote>

            <div className="mt-12 space-y-5 text-lg leading-8 text-white/80">
              <p>メラトニンヨガ™考案者</p>
              <p>Sleep Wellness Institute Japan Founder</p>
              <p>ヨガ・ピラティス指導者養成講師</p>
            </div>
          </div>
        </div>

        <div className="mt-24 grid gap-6 lg:grid-cols-3">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="group overflow-hidden rounded-[32px] shadow-[0_30px_90px_-45px_rgba(0,0,0,0.55)]"
            >
              <div className="relative aspect-[16/10]">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(min-width:1024px) 33vw,100vw"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <h4 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                    {item.title}
                  </h4>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}