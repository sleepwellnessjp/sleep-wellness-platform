import Image from "next/image";

const principles = [
  {
    number: "01",
    title: "Data",
    subtitle: "睡眠を可視化する",
  },
  {
    number: "02",
    title: "Practice",
    subtitle: "身体から眠りを整える",
  },
  {
    number: "03",
    title: "Design",
    subtitle: "続けられる仕組みをつくる",
  },
];

export default function About() {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-[#f4f1e9] py-16 text-[#0b1b31] sm:py-20 lg:py-24"
    >
      <div className="absolute -left-40 top-0 h-[320px] w-[320px] rounded-full bg-cyan-100/50 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[360px] w-[360px] rounded-full bg-amber-100/45 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          <div>
            <div className="mb-5 flex items-center gap-4">
              <span className="h-px w-12 bg-[#b89242]" />
              <p className="text-xs font-semibold tracking-[0.28em] text-[#8a6a2d]">
                ABOUT
              </p>
            </div>

            <h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              Sleep Wellnessとは
            </h2>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
              睡眠を、健康・働き方・人生の質を支える土台として捉え、
              科学と身体実践をつなぐアプローチです。
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {principles.map((item) => (
                <article
                  key={item.number}
                  className="rounded-[20px] border border-[#0b1b31]/10 bg-white/75 px-5 py-5 backdrop-blur"
                >
                  <p className="text-xs font-bold tracking-[0.2em] text-[#8a6a2d]">
                    {item.number}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#52717a]">{item.subtitle}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] bg-[#071426] shadow-[0_40px_100px_-45px_rgba(15,23,42,0.35)]">
            <div className="relative aspect-[16/11] lg:aspect-[4/3]">
              <Image
                src="/melatonin-yoga.jpg"
                alt="Sleep Wellness Institute Japanの活動風景"
                fill
                className="object-cover object-center"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/85 via-[#071426]/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="text-xs font-semibold tracking-[0.28em] text-amber-200">
                  OUR APPROACH
                </p>
                <p className="mt-3 max-w-md text-xl font-medium leading-snug tracking-[-0.03em] text-white sm:text-2xl">
                  感覚だけに頼らず、データだけにも偏らない。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
