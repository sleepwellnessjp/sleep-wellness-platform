import Image from "next/image";
import Link from "next/link";

const principles = [
  {
    number: "01",
    title: "Data",
    subtitle: "睡眠を可視化する",
    description:
      "ウェアラブルデータと生活習慣を組み合わせ、睡眠の状態を多角的に理解します。",
  },
  {
    number: "02",
    title: "Practice",
    subtitle: "身体から眠りを整える",
    description:
      "ヨガ、呼吸、瞑想などの実践を通して、心身を休息へ導きます。",
  },
  {
    number: "03",
    title: "Design",
    subtitle: "続けられる仕組みをつくる",
    description:
      "一人ひとりの暮らしに合わせ、無理なく継続できる改善方法を設計します。",
  },
];

export default function About() {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-[#f4f1e9] py-24 text-[#0b1b31] sm:py-28 lg:py-36"
    >
      <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-100/50 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-amber-100/45 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
          <div>
            <div className="mb-7 flex items-center gap-4">
              <span className="h-px w-12 bg-[#b89242]" />
              <p className="text-xs font-semibold tracking-[0.28em] text-[#8a6a2d]">
                ABOUT
              </p>
            </div>

            <h2 className="text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              眠りを整えることを、
              <br />
              <span className="text-[#315f68]">社会の新しい基盤へ。</span>
            </h2>

            <p className="mt-8 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
              Sleep Wellness Institute Japanは、睡眠を単なる休息ではなく、
              健康、創造性、美容、働き方、人生の質を支える土台として捉えます。
            </p>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
              睡眠科学とデータ、日本文化に根ざした身体実践をつなぎ、
              一人ひとりの暮らしから企業、教育、地域まで、
              より良い眠りが循環する社会を目指します。
            </p>

            <Link
              href="#vision"
              className="mt-9 inline-flex items-center gap-3 border-b border-[#0b1b31]/30 pb-2 text-sm font-bold tracking-[0.08em] text-[#0b1b31] transition hover:border-[#b89242] hover:text-[#8a6a2d]"
            >
              私たちが目指す未来
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div>
            <div className="relative overflow-hidden rounded-[36px] bg-[#071426] shadow-[0_40px_100px_-45px_rgba(15,23,42,0.35)]">
              <div className="relative aspect-[4/5] sm:aspect-[16/12] lg:aspect-[4/5]">
                <Image
                  src="/melatonin-yoga.jpg"
                  alt="Sleep Wellness Institute Japanの活動風景"
                  fill
                  priority
                  className="object-cover object-center"
                  sizes="(min-width: 1024px) 55vw, 100vw"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/90 via-[#071426]/10 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
                  <p className="text-xs font-semibold tracking-[0.28em] text-amber-200">
                    OUR APPROACH
                  </p>

                  <p className="mt-4 max-w-xl text-2xl font-medium leading-[1.45] tracking-[-0.03em] text-white sm:text-3xl">
                    感覚だけに頼らず、
                    <br />
                    データだけにも偏らない。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {principles.map((item) => (
                <article
                  key={item.number}
                  className="group rounded-[24px] border border-[#0b1b31]/10 bg-white/75 p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-[#b89242]/35 hover:bg-white hover:shadow-[0_20px_50px_-30px_rgba(7,20,38,0.3)]"
                >
                  <p className="text-xs font-bold tracking-[0.2em] text-[#8a6a2d]">
                    {item.number}
                  </p>

                  <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em]">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm font-medium text-[#52717a]">
                    {item.subtitle}
                  </p>

                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}