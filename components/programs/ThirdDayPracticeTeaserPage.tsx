import Link from "next/link";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/site/SiteHeader";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { FOCUS_RING, GOLD, GOLD_LIGHT, NAVY } from "@/components/ui/tokens";
import { HOME_TOP_HREF } from "@/lib/home-intro";
import { YOGAFESTA_YOKOHAMA_2026_HREF } from "@/lib/practice/third-day-practice";

const triad = [
  {
    period: "昼・動く",
    title: "間のヨガ™",
    description: "活動と休息の切り替えを整える",
    href: "/ma-no-yoga" as string | null,
  },
  {
    period: "昼・動かない",
    title: "10.12 発表",
    description: "音と静寂で、動かずに整える",
    href: null,
  },
  {
    period: "夜",
    title: "メラトニンヨガ™",
    description: "睡眠へ向かう身体と心を整える",
    href: "/melatonin-yoga" as string | null,
  },
];

/**
 * 第3の昼実践ティザー（発表前）。正式名称は一切含めない。
 */
export default function ThirdDayPracticeTeaserPage() {
  const festHref = YOGAFESTA_YOKOHAMA_2026_HREF;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#071426]">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:hidden">
        <Link
          href={HOME_TOP_HREF}
          className={`inline-flex w-fit min-h-11 items-center rounded-full px-3 text-[12px] font-semibold transition hover:bg-[rgba(7,20,38,0.04)] ${FOCUS_RING}`}
          style={{ color: GOLD }}
        >
          ← トップページへ戻る
        </Link>
        <SiteNavMenu />
      </div>

      <div className="hidden sm:block">
        <SiteHeader
          actions={
            <Link
              href="/contact"
              className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold text-white transition hover:opacity-90 sm:text-sm"
              style={{ background: NAVY }}
            >
              お問い合わせ
            </Link>
          }
        />
      </div>

      <article className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -left-40 top-10 h-[320px] w-[320px] rounded-full opacity-40 blur-3xl"
          style={{ background: "rgba(216,179,106,0.18)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-40 bottom-20 h-[360px] w-[360px] rounded-full opacity-30 blur-3xl"
          style={{ background: "rgba(7,20,38,0.08)" }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-3xl px-6 pb-14 pt-8 sm:px-8 sm:pb-16 sm:pt-14 lg:px-10 lg:pb-20 lg:pt-16">
          {/* ヒーロー */}
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            Coming 10.12
          </p>
          <h1
            className="mt-4 text-[1.35rem] font-semibold leading-[1.45] tracking-[-0.03em] sm:text-[1.75rem] sm:leading-[1.4] lg:text-[2rem]"
            style={{ color: NAVY }}
          >
            音を聴くヨガから、音の先の静寂を感じるヨガへ。
          </h1>

          {/* 本文 */}
          <div className="mt-10 space-y-4 text-[15px] leading-8 text-slate-700 sm:mt-12 sm:space-y-5 sm:text-base sm:leading-8">
            <p>swij に、3つ目の実践が加わります。</p>
            <p>昼の、動かないヨガです。</p>
            <p className="!mt-3 sm:!mt-3.5">
              サウンドバスです。でも、音を浴びるためだけのものではありません。
            </p>
            <p className="!mt-3 sm:!mt-3.5">
              音が消えたあとに残るものを聴く。練習することはひとつだけ、
              <span
                className="mx-0.5 inline font-semibold tracking-[0.02em]"
                style={{ color: GOLD }}
              >
                消え際
              </span>
              を聴くことです。
            </p>
            <p>
              2026年10月12日、ヨガフェスタ横浜で最初のクラスを行います。
              名前は、その日に会場でお伝えします。
            </p>
          </div>

          {/* 3つの実践 */}
          <section className="mt-12 sm:mt-14">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              THREE PRACTICES
            </p>
            <h2
              className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
              style={{ color: NAVY }}
            >
              3つの実践
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
              {triad.map((item) => {
                const inner = (
                  <>
                    <p
                      className="text-[10px] font-semibold tracking-[0.18em]"
                      style={{ color: GOLD }}
                    >
                      {item.period}
                    </p>
                    <p
                      className="mt-2 text-[15px] font-semibold tracking-[-0.02em] sm:text-base"
                      style={{ color: NAVY }}
                    >
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </>
                );
                const className =
                  "block h-full rounded-[20px] border border-[rgba(7,20,38,0.08)] bg-white px-4 py-4 transition sm:px-5 sm:py-5";
                if (item.href) {
                  return (
                    <li key={item.period}>
                      <Link
                        href={item.href}
                        className={`${className} hover:border-[rgba(138,106,45,0.35)]`}
                      >
                        {inner}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={item.period}>
                    <div className={`${className} opacity-95`}>{inner}</div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 開催情報 */}
          <section
            className="mt-12 rounded-[24px] border px-5 pb-16 pt-7 sm:mt-14 sm:px-8 sm:pb-9 sm:pt-9"
            style={{
              borderColor: "rgba(216,179,106,0.35)",
              background:
                "linear-gradient(180deg, rgba(7,20,38,0.97) 0%, rgba(7,20,38,0.92) 100%)",
            }}
          >
            <p
              className="text-[10px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD_LIGHT }}
            >
              EVENT
            </p>
            <p className="mt-4 text-[15px] font-semibold leading-7 text-white sm:text-base sm:leading-8">
              CHAKRA SOUND BATH ー 音の波にとける、7つのチャクラ瞑想
            </p>
            <p className="mt-3 max-w-[calc(100%-7.5rem)] text-[13px] leading-7 text-white/75 sm:max-w-none sm:text-[14px]">
              2026年10月12日（月・祝）15:00 - 16:30
              <br />
              パシフィコ横浜 ROOM D
              <br />
              ヨガフェスタ横浜2026
            </p>
            {festHref ? (
              <Link
                href={festHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold transition hover:opacity-90"
                style={{ color: GOLD_LIGHT }}
              >
                ヨガフェスタ公式ページ →
              </Link>
            ) : null}
          </section>

          <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:flex-wrap sm:items-center">
            {festHref ? (
              <Link
                href={festHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: NAVY }}
              >
                ヨガフェスタ横浜2026の詳細を見る
              </Link>
            ) : null}
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: NAVY }}
            >
              お問い合わせ
            </Link>
            <Link
              href="/#services"
              className="inline-flex min-h-12 items-center justify-center rounded-full border px-7 text-sm font-semibold transition hover:bg-white"
              style={{ borderColor: "rgba(7,20,38,0.15)", color: NAVY }}
            >
              実践一覧へ戻る
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
