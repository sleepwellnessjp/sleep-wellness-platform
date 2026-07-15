import Link from "next/link";

const newsItems = [
  {
    date: "2026.10",
    category: "EVENT",
    title: "ヨガフェスタ横浜2026登壇",
    description:
      "睡眠科学とヨガを融合した「メラトニンヨガ™」をテーマに登壇予定。",
  },
  {
    date: "2026.08",
    category: "ACADEMY",
    title: "メラトニンヨガ™養成講座",
    description:
      "睡眠ウェルネスを実践・指導できるインストラクター育成プログラム。",
  },
  {
    date: "2026",
    category: "PROJECT",
    title: "SOXAI共同プロジェクト",
    description:
      "ウェアラブルデータを活用した睡眠ウェルネス分析・実証プロジェクトを推進。",
  },
  {
    date: "COMING SOON",
    category: "PLATFORM",
    title: "Sleep Wellness Platform公開予定",
    description:
      "睡眠分析・学習・実践を統合するSleep Wellness Platformを公開予定。",
  },
];

export default function News() {
  return (
    <section
      id="news"
      className="relative overflow-hidden bg-white py-24 sm:py-28 lg:py-36"
    >
      <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-cyan-100/40 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-amber-100/35 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold tracking-[0.30em] text-[#8a6a2d]">
            LATEST NEWS
          </p>

          <h2 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-[#071426] sm:text-5xl lg:text-6xl">
            最新情報
          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Sleep Wellness Institute Japanの活動・イベント・
            プロジェクト・最新情報をご紹介します。
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4 lg:mt-20">
          {newsItems.map((item) => (
            <article
              key={item.title}
              className="group cursor-pointer rounded-[24px] border border-slate-200 bg-[#fafaf8] p-8 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-2 hover:border-[#315f68]/20 hover:bg-white hover:shadow-[0_35px_90px_-40px_rgba(15,23,42,0.24)]"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#315f68]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-[#315f68]">
                  {item.category}
                </span>

                <span className="text-xs font-medium text-slate-400">
                  {item.date}
                </span>
              </div>

              <h3 className="mt-10 text-2xl font-semibold leading-snug tracking-[-0.03em] text-[#071426]">
                {item.title}
              </h3>

              <p className="mt-5 text-sm leading-7 text-slate-600">
                {item.description}
              </p>

              <div className="mt-10 flex items-center text-sm font-semibold text-[#315f68]">
                Read More
                <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 flex justify-center lg:mt-20">
          <Link
            href="#contact"
            className="group inline-flex items-center rounded-full border border-[#071426]/10 bg-white px-8 py-4 text-sm font-semibold text-[#071426] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#315f68]/20 hover:shadow-lg"
          >
            View All News
            <span className="ml-3 transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}