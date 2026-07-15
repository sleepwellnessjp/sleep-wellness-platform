import Image from "next/image";

const mediaItems = [
  {
    category: "MEDIA",
    title: "Yoga Journal",
    description: "ヨガ・ウェルネス分野での掲載、取材、情報発信。",
    image: "/yogajournal.jpg",
    alt: "Yoga Journal掲載実績",
  },
  {
    category: "EVENT",
    title: "ヨガフェスタ横浜",
    description: "メラトニンヨガ™と睡眠ウェルネスを伝える登壇活動。",
    image: "/yogafest.JPG",
    alt: "ヨガフェスタ横浜での活動",
  },
  {
    category: "PROJECT",
    title: "SOXAI共同プロジェクト",
    description: "ウェアラブルデータを活用した睡眠ウェルネスの実証。",
    image: "/soxai-taka.JPG",
    alt: "SOXAIとの共同プロジェクト",
  },
];

export default function Media() {
  return (
    <section
      id="media"
      className="relative overflow-hidden bg-[#fafaf8] px-6 py-24 text-[#071426] sm:py-32 lg:px-8"
    >
      <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-cyan-100/60 blur-3xl" />
      <div className="absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-amber-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#a47b24]">
            MEDIA & EVENTS
          </p>

          <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            活動・登壇・
            <br />
            メディア掲載
          </h2>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Sleep Wellness Institute Japanの活動実績と、
            睡眠ウェルネスを社会へ届ける取り組みをご紹介します。
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {mediaItems.map((item) => (
            <article
              key={item.title}
              className="group relative min-h-[480px] overflow-hidden rounded-[2rem] bg-[#071426] shadow-[0_25px_80px_rgba(7,20,38,0.14)]"
            >
              <Image
                src={item.image}
                alt={item.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#071426]/20 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-8">
                <p className="text-xs font-semibold tracking-[0.24em] text-amber-200">
                  {item.category}
                </p>

                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                  {item.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-slate-200">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}