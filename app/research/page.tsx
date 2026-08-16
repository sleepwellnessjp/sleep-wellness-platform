import type { Metadata } from "next";
import Link from "next/link";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import { GOLD, NAVY } from "@/components/ui/tokens";

export const metadata: Metadata = {
  title: "研究・実証 | Sleep Wellness Institute Japan",
  description:
    "ウェアラブルデバイスを用いた睡眠計測と、ワークショップ・リトリートにおける実証・検証の取り組み。",
};

const themes = [
  {
    title: "ウェアラブルによる睡眠計測",
    body: "スマートリングやウェアラブルデバイスを用い、睡眠・心拍・HRVなどのデータを日常の文脈で確認します。",
  },
  {
    title: "ワークショップ前後の比較",
    body: "体験の前後で計測データを照合し、変化の傾向を確認するための検証を行います。",
  },
  {
    title: "リトリートでの実証",
    body: "宿泊型プログラムなど、集中した実践の場でデータと体感の両面から検証を進めます。",
  },
  {
    title: "睡眠指標の変化確認",
    body: "睡眠効率、深睡眠、HRV、回復などの指標を手がかりに、改善傾向の確認を行います。",
  },
  {
    title: "AI分析と認定講師のフィードバック",
    body: "AIによる分析と認定講師による読み解きを組み合わせ、実践につながる解釈を重視します。",
  },
  {
    title: "企業・自治体・施設との共同実証",
    body: "現場の課題に合わせたデータ活用と、継続しやすい改善の仕組みづくりを共同で検討します。",
  },
] as const;

export default function ResearchPublicPage() {
  return (
    <PublicIntroLayout
      eyebrow="RESEARCH & EVIDENCE"
      title="研究・実証"
      lead="Sleep Wellness Institute Japan は、医療的な断定ではなく、計測データと実践を通じた実証・検証・データ活用を重ね、睡眠ウェルネスの改善傾向を確認していきます。"
    >
      <div className="space-y-14 sm:space-y-16">
        <section>
          <h2
            className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
            style={{ color: NAVY }}
          >
            取り組みのテーマ
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {themes.map((item) => (
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

        <section className="max-w-3xl rounded-[24px] bg-white px-6 py-8 sm:px-8">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            APPROACH
          </p>
          <h2
            className="mt-3 text-xl font-semibold tracking-[-0.03em]"
            style={{ color: NAVY }}
          >
            今後の研究・連携について
          </h2>
          <p className="mt-4 text-[15px] leading-8 text-slate-600">
            共同実証やデータ活用の連携は準備中です。詳細は順次公開します。企業・自治体・施設とのご相談はお問い合わせください。
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: NAVY }}
          >
            連携・研究について問い合わせる
          </Link>
        </section>
      </div>
    </PublicIntroLayout>
  );
}
