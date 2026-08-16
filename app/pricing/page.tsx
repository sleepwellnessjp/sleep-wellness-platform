import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/site/SiteHeader";
import { GOLD, GOLD_LIGHT, GOLD_MID, NAVY } from "@/components/ui/tokens";

export const metadata: Metadata = {
  title: "睡眠ウェルネス・プログラム | Sleep Wellness Institute Japan",
  description:
    "ウェアラブルデバイスで計測した睡眠・生体データと生活記録をもとに、AIが多角的に分析。認定講師がデータと生活習慣の両面から、一人ひとりに合わせた改善プランを提案・伴走します。",
};

const flowSteps = [
  {
    step: "01",
    title: "7日間の計測",
    body: "普段お使いのウェアラブルデバイスで7日間の睡眠・生体データを計測します。必要なデータは手入力にも対応しています。",
  },
  {
    step: "02",
    title: "生活記録の入力",
    body: "食事・運動・飲酒・入浴・ストレスなどの生活習慣を記録します。",
  },
  {
    step: "03",
    title: "AIによる分析",
    body: "AIが睡眠データと生活記録を解析し、睡眠の特徴と課題をレポート化します。",
  },
  {
    step: "04",
    title: "カウンセリング",
    body: "認定講師がレポートをもとに90分のカウンセリングを行い、改善プランを作成します。",
  },
  {
    step: "05",
    title: "改善プラン実践",
    body: "プランに沿って生活習慣を整え、睡眠の質の向上を目指します。",
  },
  {
    step: "06",
    title: "再測定とフィードバック",
    body: "一定期間後に再度7日間計測し、改善の変化をデータで確認します。",
  },
] as const;

const plans = [
  {
    id: "01",
    name: "初回カウンセリング・睡眠ウェルネス分析",
    period: null as string | null,
    kind: null as string | null,
    description:
      "7日間のデータをもとに、睡眠の現状を可視化する「睡眠の健康診断」。",
    items: [
      "7日間のデータ計測",
      "生活記録の入力",
      "AI分析レポート",
      "90分カウンセリング",
      "改善プランのご提案",
    ],
    price: "19,800円（税込）",
    recommended: false,
  },
  {
    id: "02",
    name: "ライトコース",
    period: "2週間",
    kind: null,
    description: "まずは短期間で改善のきっかけをつかみたい方に。",
    items: [
      "改善プランの実践サポート",
      "LINEでの質問対応",
      "7日間の再測定",
      "60分フィードバック面談",
    ],
    price: "39,800円（税込）",
    recommended: false,
  },
  {
    id: "03",
    name: "スタンダードコース",
    period: "4週間",
    kind: null,
    description: "睡眠習慣を整え、質の向上を目指す標準プログラム。",
    items: [
      "週1回のフォロー（面談またはオンライン）",
      "メラトニンヨガ™の実践サポート",
      "呼吸法・食事・入浴・光環境・ストレス対策の指導",
      "7日間の再測定",
      "90分フィードバック面談",
    ],
    price: "69,800円（税込）",
    recommended: true,
  },
  {
    id: "04",
    name: "プレミアムコース",
    period: "8週間",
    kind: null,
    description:
      "本気で睡眠を改善し、習慣化・定着まで伴走するプレミアムプログラム。",
    items: [
      "週1回の面談（オンラインまたは対面）",
      "AI分析レポート（複数回）",
      "メラトニンヨガ™継続サポート",
      "個別プログラムの最適化",
      "LINEでの継続サポート",
      "最終レポートのご提供",
    ],
    price: "129,800円〜149,800円（税込）",
    recommended: false,
  },
  {
    id: "05",
    name: "メンテナンス会員",
    period: null,
    kind: "月額プラン",
    description:
      "改善した睡眠を維持し、さらに高めていくための継続サポート。",
    items: [
      "月1回のAI分析レポート",
      "月1回の30分面談",
      "チャット相談し放題",
      "プラットフォーム利用",
    ],
    price: "4,980円〜9,800円（税込）／月",
    recommended: false,
  },
] as const;

const features = [
  {
    number: "01",
    title: "ウェアラブルデバイスで睡眠・生体データを計測",
    body: "ウェアラブルデバイスから取得した睡眠・心拍・HRV・体温変化などのデータを分析に活用します。",
  },
  {
    number: "02",
    title: "AIが多角的に分析",
    body: "データと生活記録を統合し、課題と改善ポイントを明確化。",
  },
  {
    number: "03",
    title: "認定講師が伴走",
    body: "科学的根拠と日本の文化・習慣を活かし、あなたに合った改善をサポート。",
  },
  {
    number: "04",
    title: "改善をデータで可視化",
    body: "再測定で変化を客観的に確認し、モチベーションを維持。",
  },
] as const;

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#071426]">
      <SiteHeader
        maxWidthClassName="max-w-7xl"
        actions={
          <>
            <Link
              href="/#about"
              className="rounded-full px-3 py-2 text-xs font-semibold text-[#071426]/75 transition hover:bg-[#071426]/04 sm:text-sm"
            >
              Method
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-semibold text-white transition hover:opacity-90 sm:text-sm"
              style={{ background: NAVY }}
            >
              お問い合わせ
            </Link>
          </>
        }
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(216,179,106,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(7,20,38,0.04),transparent_50%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:px-10 lg:py-24">
          <div>
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={220}
              height={55}
              className="h-auto w-[160px] sm:w-[180px]"
              priority
            />
            <p
              className="mt-8 text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              データ × AI × 専門家で、睡眠を科学する
            </p>
            <h1
              className="mt-4 whitespace-normal text-[2.1rem] font-semibold leading-[1.15] tracking-[-0.045em] sm:text-4xl md:whitespace-nowrap lg:text-[2.85rem]"
              style={{ color: NAVY }}
            >
              睡眠ウェルネス・プログラム
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-8 text-slate-600 sm:text-base sm:leading-8">
              ウェアラブルデバイスで計測した睡眠・生体データと生活記録をもとに、AIが多角的に分析。認定講師がデータと生活習慣の両面から、一人ひとりに合わせた改善プランを提案・伴走します。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#plans"
                className="inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: NAVY }}
              >
                料金プランを見る
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(138,106,45,0.35)] bg-white px-6 text-sm font-semibold transition hover:bg-[#fafaf8]"
                style={{ color: GOLD }}
              >
                無料相談・お問い合わせ
              </Link>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[28px] border border-[rgba(7,20,38,0.08)] bg-[#071426] px-6 py-8 sm:px-8 sm:py-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[rgba(216,179,106,0.12)] blur-2xl" />
            <div className="relative mx-auto w-full max-w-[280px]">
              <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-full border border-white/10 bg-white/5">
                <Image
                  src="/soxai.jpg"
                  alt="Wearable Sleep Data"
                  fill
                  className="object-cover object-center"
                  sizes="220px"
                  priority
                />
              </div>
              <p
                className="mt-6 text-center text-[11px] font-semibold tracking-[0.24em]"
                style={{ color: GOLD_LIGHT }}
              >
                Wearable Sleep Data
              </p>
              <p className="mt-3 text-center text-[15px] font-medium leading-7 text-white/85">
                ウェアラブルデバイスによる
                <br />
                7日間のデータ計測から始まります。
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Flow */}
      <section className="border-t border-[rgba(7,20,38,0.06)] bg-[#f7f7f5] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              PROGRAM FLOW
            </p>
            <h2
              className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
              style={{ color: NAVY }}
            >
              プログラムの流れ
            </h2>
          </div>

          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:gap-4">
            {flowSteps.map((item) => (
              <li key={item.step} className="relative">
                <p
                  className="text-[11px] font-semibold tracking-[0.2em]"
                  style={{ color: GOLD }}
                >
                  {item.step}
                </p>
                <h3
                  className="mt-2 text-[15px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-600">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-10 text-[12px] leading-6 text-slate-500">
            ※プログラム期間やサポート内容はコースにより異なります。
          </p>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            利用デバイス例：SOXAI RING、Oura Ring、Apple Watch、Garmin など
            <br />
            ※取得可能なデータはデバイスによって異なります。必要な項目は手入力できます。
          </p>
        </div>
      </section>

      {/* Plans */}
      <section
        id="plans"
        className="border-t border-[rgba(7,20,38,0.06)] bg-white py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              PRICING
            </p>
            <h2
              className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
              style={{ color: NAVY }}
            >
              料金プラン
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`relative flex h-full flex-col rounded-[24px] border px-5 py-6 sm:px-5 sm:py-7 ${
                  plan.recommended
                    ? "border-[rgba(138,106,45,0.45)] bg-[#fffdf8] shadow-[0_16px_48px_-28px_rgba(138,106,45,0.45)] xl:-translate-y-1"
                    : "border-[rgba(7,20,38,0.08)] bg-[#fafaf8]"
                }`}
              >
                {plan.recommended ? (
                  <span
                    className="absolute -top-3 left-5 inline-flex rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-white"
                    style={{ background: GOLD_MID }}
                  >
                    おすすめ
                  </span>
                ) : null}

                <p
                  className="text-[11px] font-semibold tracking-[0.2em]"
                  style={{ color: GOLD }}
                >
                  {plan.id}
                </p>
                <h3
                  className="mt-2 text-[15px] font-semibold leading-snug tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {plan.name}
                </h3>

                {plan.period ? (
                  <p className="mt-2 text-[12px] font-medium text-slate-500">
                    期間：{plan.period}
                  </p>
                ) : null}
                {plan.kind ? (
                  <p className="mt-2 text-[12px] font-medium text-slate-500">
                    {plan.kind}
                  </p>
                ) : null}

                <p className="mt-3 text-[13px] leading-6 text-slate-600">
                  {plan.description}
                </p>

                <ul className="mt-5 flex-1 space-y-2 border-t border-[rgba(7,20,38,0.06)] pt-4">
                  {plan.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-[12px] leading-5 text-slate-600"
                    >
                      <span style={{ color: GOLD_MID }}>・</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <p
                  className="mt-6 text-[1.05rem] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {plan.price}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[rgba(7,20,38,0.06)] bg-[#f7f7f5] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              FEATURES
            </p>
            <h2
              className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
              style={{ color: NAVY }}
            >
              プログラムの特長
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.number} className="space-y-3">
                <p
                  className="text-[11px] font-semibold tracking-[0.2em]"
                  style={{ color: GOLD }}
                >
                  {feature.number}
                </p>
                <h3
                  className="text-[16px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {feature.title}
                </h3>
                <p className="text-[13px] leading-7 text-slate-600">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Certified instructor */}
      <section className="bg-[#071426] py-16 text-white sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16 lg:px-10">
          <div>
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD_LIGHT }}
            >
              CERTIFIED INSTRUCTOR
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
              認定講師による高品質なサポート
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-8 text-white/75">
              SWIJの認定を受けた専門家が、プラットフォームとAIを活用し、高品質な睡眠カウンセリングを提供します。
            </p>
          </div>

          <div className="relative mx-auto flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
            <div className="absolute inset-0 rounded-full border border-[rgba(216,179,106,0.35)]" />
            <div className="absolute inset-3 rounded-full border border-[rgba(216,179,106,0.2)]" />
            <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white/5 text-center sm:h-32 sm:w-32">
              <Image
                src="/swij-logo-mark.png"
                alt="SWIJ"
                width={64}
                height={64}
                className="h-10 w-10 object-contain opacity-90 sm:h-12 sm:w-12"
              />
              <p
                className="mt-2 text-[9px] font-semibold tracking-[0.16em]"
                style={{ color: GOLD_LIGHT }}
              >
                CERTIFIED
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[rgba(7,20,38,0.06)] bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
          <h2
            className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            まずは7日間の睡眠計測から
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-slate-600">
            現状をデータで把握することから、睡眠ウェルネスは始まります。
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: NAVY }}
          >
            無料相談・お問い合わせ
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
