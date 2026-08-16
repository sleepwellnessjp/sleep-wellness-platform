import Link from "next/link";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/site/SiteHeader";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { FOCUS_RING, GOLD, GOLD_LIGHT, NAVY } from "@/components/ui/tokens";
import { HOME_TOP_HREF } from "@/lib/home-intro";

export type ProgramStoryContent = {
  eyebrow: string;
  title: string;
  lead: string;
  paragraphs: string[];
  /** ページ後半のキーメッセージ（改行可） */
  closing: string;
};

/**
 * 間のヨガ™ / メラトニンヨガ™ の説明ページ共通レイアウト。
 * スマホ: 左「トップページへ戻る」+ 右ハンバーガー（Safe Area 対応）
 * PC: 既存 SiteHeader
 */
export default function ProgramStoryPage({
  content,
}: {
  content: ProgramStoryContent;
}) {
  const closingLines = content.closing
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#071426]">
      {/* スマホ専用トップバー */}
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

      {/* PC / タブレット向けヘッダー */}
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

        <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-14 lg:px-10 lg:pb-24 lg:pt-16">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            {content.eyebrow}
          </p>

          <h1
            className="mt-4 text-[1.85rem] font-semibold leading-[1.2] tracking-[-0.04em] sm:text-4xl lg:text-[2.6rem]"
            style={{ color: NAVY }}
          >
            {content.title}
          </h1>

          <blockquote className="mt-10 border-l-[3px] pl-5 sm:mt-12 sm:pl-6"
            style={{ borderColor: GOLD_LIGHT }}
          >
            <p
              className="font-serif text-[1.2rem] leading-[1.7] tracking-[0.01em] sm:text-[1.45rem] sm:leading-[1.75]"
              style={{
                color: NAVY,
                fontFamily:
                  '"Hiragino Mincho ProN", "Hiragino Mincho Pro", "Yu Mincho", "YuMincho", "Noto Serif JP", serif',
              }}
            >
              {content.lead}
            </p>
          </blockquote>

          <div className="mt-10 space-y-6 text-[15px] leading-8 text-slate-700 sm:mt-12 sm:space-y-7 sm:text-base sm:leading-8">
            {content.paragraphs.map((paragraph) => {
              const isVerse =
                paragraph.includes("\n") &&
                paragraph.split("\n").every((line) => line.trim().length <= 18);
              if (isVerse) {
                return (
                  <p
                    key={paragraph.slice(0, 24)}
                    className="py-2 text-center text-[15px] leading-9 tracking-[0.04em] sm:text-base sm:leading-10"
                    style={{ color: NAVY }}
                  >
                    {paragraph.split("\n").map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                );
              }
              return (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              );
            })}
          </div>

          <div
            className="mt-14 rounded-[28px] border px-6 py-10 text-center sm:mt-16 sm:px-10 sm:py-12"
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
              KEY MESSAGE
            </p>
            <p
              className="mt-5 font-serif text-[1.15rem] leading-[1.85] tracking-[0.02em] text-white sm:text-[1.35rem] sm:leading-[1.9]"
              style={{
                fontFamily:
                  '"Hiragino Mincho ProN", "Hiragino Mincho Pro", "Yu Mincho", "YuMincho", "Noto Serif JP", serif',
              }}
            >
              {closingLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-3 sm:mt-14 sm:flex-row sm:items-center">
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
