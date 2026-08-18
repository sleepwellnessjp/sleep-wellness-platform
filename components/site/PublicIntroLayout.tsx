import Link from "next/link";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/site/SiteHeader";
import { GOLD, NAVY } from "@/components/ui/tokens";

type PublicIntroLayoutProps = {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
  /** メインコンテンツ div に追加する Tailwind クラス（例: モバイルタブバー分の余白） */
  contentClassName?: string;
};

/**
 * 一般公開の紹介ページ共通レイアウト（ヘッダー・フッタ・お問い合わせ CTA）。
 */
export default function PublicIntroLayout({
  eyebrow,
  title,
  lead,
  children,
  contentClassName = "",
}: PublicIntroLayoutProps) {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#071426]">
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

      <section className="border-b border-[rgba(7,20,38,0.06)] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            {eyebrow}
          </p>
          <h1
            className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.045em] sm:text-4xl lg:text-[2.75rem]"
            style={{ color: NAVY }}
          >
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-8 text-slate-600 sm:text-base sm:leading-8">
            {lead}
          </p>
        </div>
      </section>

      <div className={`mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20 ${contentClassName}`.trimEnd()}>
        {children}
      </div>

      <section className="border-t border-[rgba(7,20,38,0.06)] bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
          <h2
            className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            ご相談・お問い合わせ
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            開催予定や受講・参加のご相談は、お気軽にお問い合わせください。
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: NAVY }}
          >
            お問い合わせ
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
