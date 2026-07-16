import Image from "next/image";

const mediaItems = [
  {
    category: "YOUTUBE",
    type: "動画",
    title: "メラトニンヨガ™ 実践動画",
    description:
      "睡眠科学に基づいたヨガ・呼吸・瞑想の実践を、映像でわかりやすく発信しています。",
    image: "/melatonin-yoga.jpg",
    alt: "メラトニンヨガのYouTube配信",
  },
  {
    category: "MAGAZINE",
    type: "雑誌掲載",
    title: "Yoga Journal",
    description:
      "ヨガ・ウェルネス分野の専門誌にて、睡眠と身体実践をつなぐ取り組みが紹介されました。",
    image: "/yogajournal.jpg",
    alt: "Yoga Journal掲載実績",
  },
  {
    category: "NEWSPAPER",
    type: "新聞",
    title: "睡眠ウェルネスの社会実装",
    description:
      "データと実践を組み合わせた睡眠改善の取り組みについて、新聞メディアで取り上げられました。",
    image: "/soxai-taka.jpg",
    alt: "新聞メディアでの掲載",
  },
  {
    category: "TV",
    type: "テレビ出演",
    title: "メディア出演・取材",
    description:
      "睡眠・健康・ウェルネスをテーマに、テレビ番組での出演・取材協力を行っています。",
    image: "/yogafest.jpg",
    alt: "テレビ出演・メディア取材",
  },
];

export default function Media() {
  return (
    <section
      id="media"
      className="relative overflow-hidden bg-[#fafaf8] px-6 py-24 text-[#071426] sm:py-28 lg:px-8 lg:py-36"
    >
      <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-cyan-100/60 blur-3xl" />
      <div className="absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-amber-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.28em] text-[#a47b24]">
            MEDIA & APPEARANCES
          </p>

          <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            活動・登壇・
            <br />
            メディア掲載
          </h2>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            YouTube、雑誌、新聞、テレビなど、
            睡眠ウェルネスを社会へ届けるメディア活動をご紹介します。
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:mt-16 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
          {mediaItems.map((item) => (
            <article
              key={item.title}
              className="group relative min-h-[420px] overflow-hidden rounded-[2rem] bg-[#071426] shadow-[0_25px_80px_rgba(7,20,38,0.14)] sm:min-h-[460px] lg:min-h-[480px]"
            >
              <Image
                src={item.image}
                alt={item.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#071426]/45 to-[#071426]/10" />

              <div className="absolute inset-x-0 top-0 p-6 sm:p-7">
                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white backdrop-blur-sm">
                  {item.type}
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
                <p className="text-xs font-semibold tracking-[0.24em] text-amber-200">
                  {item.category}
                </p>

                <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-200 sm:mt-4">
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
