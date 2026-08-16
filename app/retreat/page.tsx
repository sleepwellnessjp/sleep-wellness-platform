import type { Metadata } from "next";
import Link from "next/link";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import { GOLD, NAVY } from "@/components/ui/tokens";

export const metadata: Metadata = {
  title: "ワークショップ・リトリート | Sleep Wellness Institute Japan",
  description:
    "Sleep Wellness Method™の体験プログラム、メラトニンヨガ™、間のヨガ™、ワークショップ・リトリートのご案内。",
};

const programs = [
  {
    title: "Sleep Wellness Method™体験",
    body: "データを手がかりに優先順位を決め、昼と夜の実践へつなぐ Method を体験できます。",
  },
  {
    title: "メラトニンヨガ™",
    body: "就寝前に、活動から休息へ穏やかに切り替える夜の実践プログラムです。",
  },
  {
    title: "間のヨガ™",
    body: "昼の切り替えを整え、夜の休息へつなぐための実践です。",
  },
  {
    title: "睡眠ウェルネス・ワークショップ",
    body: "睡眠と生活習慣の関係を学び、日常で続けやすい改善のヒントを得る場です。",
  },
  {
    title: "宿泊型リトリート",
    body: "日常から一歩離れ、計測と実践を通じて睡眠ウェルネスを深く体験するプログラムです。",
  },
  {
    title: "企業・地域イベント",
    body: "企業や地域と連携し、睡眠をテーマにした体験・学びの場をつくります。",
  },
] as const;

export default function RetreatPublicPage() {
  return (
    <PublicIntroLayout
      eyebrow="WORKSHOP & RETREAT"
      title="ワークショップ・リトリート"
      lead="Sleep Wellness Method™を、体験・ワークショップ・宿泊型リトリートを通じて身近に感じられるプログラムをご案内します。"
    >
      <div className="space-y-14 sm:space-y-16">
        <section>
          <h2
            className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
            style={{ color: NAVY }}
          >
            プログラム内容
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((item) => (
              <article
                key={item.title}
                className="rounded-[24px] bg-white px-6 py-7"
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  EXPERIENCE
                </p>
                <h3
                  className="mt-3 text-[15px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {item.title}
                </h3>
                <p className="mt-3 text-[14px] leading-7 text-slate-600">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="max-w-3xl">
          <h2
            className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
            style={{ color: NAVY }}
          >
            開催予定
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-slate-600">
            ワークショップ・リトリートの開催日程は準備中です。詳細は順次公開します。参加・開催のご相談はお問い合わせください。
          </p>
        </section>

        <section className="max-w-3xl rounded-[24px] bg-white px-6 py-8 sm:px-8">
          <h2
            className="text-xl font-semibold tracking-[-0.03em]"
            style={{ color: NAVY }}
          >
            参加・開催のご相談
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-slate-600">
            個人での参加相談、企業・地域での開催相談など、目的に合わせてご案内します。
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: NAVY }}
          >
            参加相談・お問い合わせ
          </Link>
        </section>
      </div>
    </PublicIntroLayout>
  );
}
