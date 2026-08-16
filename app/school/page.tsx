import type { Metadata } from "next";
import Link from "next/link";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import { GOLD, NAVY } from "@/components/ui/tokens";

export const metadata: Metadata = {
  title: "認定校・講座 | Sleep Wellness Institute Japan",
  description:
    "Sleep Wellness Institute Japan の認定校制度と講座・養成コースのご案内。",
};

const learnItems = [
  {
    title: "Sleep Wellness Method™の理解",
    body: "データを見て終わりにせず、改善の順番を決め、昼と夜の実践へつなぐ考え方を学びます。",
  },
  {
    title: "睡眠データの読み方",
    body: "ウェアラブルデバイスなどの計測データを、生活習慣とあわせて読み解く基礎を身につけます。",
  },
  {
    title: "実践プログラム",
    body: "メラトニンヨガ™や間のヨガ™など、Method に沿った身体実践の伝え方を学びます。",
  },
  {
    title: "伴走の姿勢",
    body: "一人ひとりの生活に合わせた優先順位の提案と、継続を支える関わり方を学びます。",
  },
] as const;

const courses = [
  {
    title: "認定講師養成コース",
    body: "Sleep Wellness Method™を伝え、クライアントに伴走する認定講師を目指す方向けの養成講座です。",
  },
  {
    title: "講座・スクールプログラム",
    body: "認定校を通じて、睡眠ウェルネスの基礎から実践までを段階的に学べる構成を準備しています。",
  },
] as const;

export default function SchoolPublicPage() {
  return (
    <PublicIntroLayout
      eyebrow="CERTIFIED SCHOOL"
      title="認定校・講座"
      lead="Sleep Wellness Institute Japan は、睡眠ウェルネスを社会へ広げるため、認定校制度と講座・養成コースを整えています。"
    >
      <div className="space-y-14 sm:space-y-16">
        <section className="max-w-3xl">
          <h2
            className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
            style={{ color: NAVY }}
          >
            認定校制度について
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-slate-600">
            認定校は、Sleep Wellness Method™に基づく学びと実践の場です。地域やコミュニティで睡眠ウェルネスを伝えられる人材を育て、質の高い伴走が続く仕組みづくりを目指しています。
          </p>
        </section>

        <section>
          <h2
            className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
            style={{ color: NAVY }}
          >
            認定校で学べる内容
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {learnItems.map((item) => (
              <article
                key={item.title}
                className="border-t border-[rgba(7,20,38,0.08)] pt-5"
              >
                <h3
                  className="text-[15px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-7 text-slate-600">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2
            className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
            style={{ color: NAVY }}
          >
            講座・養成コース
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {courses.map((item) => (
              <article
                key={item.title}
                className="rounded-[24px] bg-white px-6 py-7 sm:px-7"
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  PROGRAM
                </p>
                <h3
                  className="mt-3 text-lg font-semibold tracking-[-0.03em]"
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

        <section className="max-w-3xl rounded-[24px] bg-white px-6 py-8 sm:px-8">
          <h2
            className="text-xl font-semibold tracking-[-0.03em]"
            style={{ color: NAVY }}
          >
            認定講師を目指す方へ
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-slate-600">
            データと実践をつなぎ、一人ひとりの睡眠改善に伴走したい方へ。認定講師養成の詳細は、専用のご案内ページでも確認できます。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/academy/certified-instructor"
              className="inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: NAVY }}
            >
              認定講師のご案内
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(138,106,45,0.35)] bg-white px-6 text-sm font-semibold transition hover:bg-[#fafaf8]"
              style={{ color: GOLD }}
            >
              受講について問い合わせる
            </Link>
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
            講座・養成コースの開催日程は準備中です。詳細は順次公開します。公開前のご相談はお問い合わせよりご連絡ください。
          </p>
        </section>
      </div>
    </PublicIntroLayout>
  );
}
