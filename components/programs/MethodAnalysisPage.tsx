import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/site/SiteHeader";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { FOCUS_RING, GOLD, GOLD_LIGHT, NAVY } from "@/components/ui/tokens";
import { HOME_TOP_HREF } from "@/lib/home-intro";

const ringMetrics = [
  "睡眠スコア／睡眠時間／全就床時間",
  "入眠時刻・起床時刻・入眠潜時",
  "深い睡眠・浅い睡眠・レム睡眠の割合",
  "覚醒時間・覚醒率",
  "心拍数（安静時・最低・最高）",
  "心拍変動（HRV）",
  "呼吸数・血中酸素飽和度",
  "皮膚温・ストレス指標",
];

const glucoseMetrics = [
  "夜間の平均値",
  "最低値とその時刻",
  "最高値とその時刻",
  "変動幅（最高−最低）",
  "変動係数（推移の安定度）",
];

const flowSteps = [
  {
    number: "STEP 1",
    title: "計測する",
    description:
      "スマートリングを着けて眠る。同じ期間、FreeStyle リブレ2のセンサーを腕に着けて過ごす。",
    image: "/method/analysis-01-measure.svg",
    imageAlt: "スマートリングとリブレ2のセンサーを着けて眠る",
  },
  {
    number: "STEP 2",
    title: "取り込む",
    description:
      "リングの睡眠データとリブレ2のCSVを、認定講師が分析画面に取り込み、カルテに記録する。",
    image: "/method/analysis-02-import.svg",
    imageAlt:
      "睡眠データとリブレ2のCSVを分析画面に取り込み、カルテに保存する",
  },
  {
    number: "STEP 3",
    title: "読み解く",
    description:
      "睡眠の推移と夜間のグルコースの動きを重ねて見て、改善の優先順位をレポートにまとめる。",
    image: "/method/analysis-03-read.svg",
    imageAlt:
      "睡眠の推移と夜間グルコースを重ねて読み、改善の優先順位を整理する",
  },
  {
    number: "STEP 4",
    title: "実践する",
    description:
      "その人の状態に合わせて、メラトニンヨガ™の夜の実践、間のヨガ™の昼の実践、睡眠のための食事を処方する。",
    image: "/method/analysis-04-practice.svg",
    imageAlt: "夜の実践・昼の実践・睡眠のための食事を処方する",
  },
] as const;

const knownItems = [
  "その夜の睡眠が、どのような構成だったか",
  "夜間の血糖が、どのように推移したか",
  "数日〜数週間で、どんな傾向が出ているか",
  "次に取り組む優先順位",
];

const unknownItems = [
  "病気の有無や、その診断",
  "検査値としての正確な血糖値",
  "一晩のデータだけで断定できる原因",
];

/**
 * 二つの計測（スマートリング＋持続血糖）による分析の説明ページ。
 * /practice/1012 と同じく専用コンポーネント。紙色レイアウトを踏襲。
 */
export default function MethodAnalysisPage() {
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

        <div className="relative mx-auto max-w-4xl px-6 pb-[var(--sw-sleep-page-bottom-pad)] pt-8 sm:px-8 sm:pt-14 lg:max-w-4xl lg:px-10 lg:pb-20 lg:pt-16">
          {/* ヒーロー */}
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
            <div>
              <p
                className="text-[11px] font-semibold tracking-[0.28em]"
                style={{ color: GOLD }}
              >
                ANALYSIS
              </p>
              <h1
                className="mt-4 text-[1.55rem] font-semibold leading-[1.35] tracking-[-0.03em] sm:text-[1.85rem] sm:leading-[1.3] lg:text-[2.15rem]"
                style={{ color: NAVY }}
              >
                二つの計測で、眠りの精度を上げる
              </h1>
              <p className="mt-6 text-[15px] leading-8 text-slate-700 sm:text-base sm:leading-8">
                スマートリング（SOXAI / Oura）で睡眠を計測し、さらに FreeStyle
                リブレ2 で夜間のグルコース値も見ます。主役は睡眠データ。グルコースは、その夜を別の角度から読むための補助データです。
              </p>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-[rgba(7,20,38,0.08)] bg-white sm:rounded-[24px] lg:aspect-[3/4]">
              <Image
                src="/method-analysis/rings.jpg"
                alt="SOXAIスマートリング"
                fill
                className="object-cover"
                sizes="(min-width:1024px) 40vw, 90vw"
                priority
              />
            </div>
          </div>

          {/* 01 */}
          <section className="mt-16 sm:mt-20">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              01
            </p>
            <h2
              className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
              style={{ color: NAVY }}
            >
              なぜ、二つ計測するのか
            </h2>
            <div className="mt-6 space-y-5 text-[15px] leading-8 text-slate-700 sm:space-y-6 sm:text-base sm:leading-8">
              <p>
                睡眠スコアは、その夜がどうだったかを教えてくれます。けれど「なぜそうなったのか」までは教えてくれません。
              </p>
              <p>
                同じスコア70の夜でも、中身は違います。スマートリングが見た睡眠の構成に、夜間の血糖の動きを重ねると、体の休まり方の違いに近づきやすくなります。
              </p>
              <p>
                計測を二つに増やすのは、数字を増やすためではありません。
                <span
                  className="mx-0.5 inline font-semibold tracking-[0.02em]"
                  style={{ color: GOLD }}
                >
                  その夜に何が起きていたのかを、別の角度からもう一度見るため
                </span>
                です。
              </p>
            </div>
          </section>

          {/* 02 スマートリング */}
          <section className="mt-16 sm:mt-20">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              02
            </p>
            <h2
              className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
              style={{ color: NAVY }}
            >
              スマートリングで測る眠り
            </h2>
            <p className="mt-6 text-[15px] leading-8 text-slate-700 sm:text-base sm:leading-8">
              SOXAI や Oura
              などのスマートリングが、睡眠中の体の状態を記録します。このメソッドでは、まずこの睡眠データを中心に読みます。
            </p>

            <ul className="mt-6 space-y-2 text-[13px] leading-6 text-slate-600 sm:text-[14px]">
              {ringMetrics.map((item) => (
                <li key={item} className="flex gap-2">
                  <span style={{ color: GOLD }} aria-hidden>
                    ·
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 overflow-hidden rounded-[20px] border border-[rgba(7,20,38,0.08)] bg-white sm:rounded-[22px]">
              <Image
                src="/method/report-soxai-stages.png"
                alt="SOXAI Ringで計測した睡眠ステージの表示例"
                width={1200}
                height={1600}
                className="h-auto w-full"
              />
            </div>
            <p className="mt-3 text-[12px] leading-5 text-slate-600 sm:text-[13px] sm:leading-6">
              深い睡眠・浅い睡眠・レム・覚醒など、睡眠ステージの内訳を確認します。
            </p>
          </section>

          {/* 03 リブレ2 / グルコース */}
          <section className="mt-16 sm:mt-20">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              03
            </p>
            <h2
              className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
              style={{ color: NAVY }}
            >
              リブレ2で見る夜間のグルコース
            </h2>
            <p className="mt-6 text-[15px] leading-8 text-slate-700 sm:text-base sm:leading-8">
              FreeStyle リブレ2
              は補助データです。上腕のセンサーが間質液のブドウ糖濃度を15分ごとに記録し、分析では入眠から起床までの夜間帯を切り出して見ます。
            </p>

            <div className="mt-8 overflow-hidden rounded-[20px] border border-[rgba(7,20,38,0.08)] bg-white sm:rounded-[22px]">
              <div className="relative aspect-[4/3] bg-[#f0f0ed]">
                <Image
                  src="/method-analysis/libre-kit.jpg"
                  alt="FreeStyle リブレ2 のキット"
                  fill
                  className="object-cover"
                  sizes="(min-width:1024px) 60vw, 90vw"
                />
              </div>
              <figure className="bg-white px-4 py-4 sm:px-5 sm:py-5">
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG は img で表示 */}
                <img
                  src="/method-analysis/fig-glucose-daily.svg"
                  alt="1日のグルコース推移。分析ではこのうち夜間帯を切り出します。"
                  className="mx-auto h-auto w-full max-w-full"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <ul className="space-y-2 text-[13px] leading-6 text-slate-600 sm:text-[14px]">
                  {glucoseMetrics.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span style={{ color: GOLD }} aria-hidden>
                        ·
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 04 分析レポート（睡眠） */}
          <section className="mt-16 sm:mt-20">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              04
            </p>
            <h2
              className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
              style={{ color: NAVY }}
            >
              分析レポート
            </h2>
            <p className="mt-6 text-[15px] leading-8 text-slate-700 sm:text-base sm:leading-8">
              取り込んだ睡眠データは、Sleep Wellness Report
              として整理されます。スコアと目次から入り、その夜の全体像を共有します。スマートリングの睡眠データを中心に、リブレ2のグルコース推移もあわせて整理します。
            </p>

            <div className="mt-8 overflow-hidden rounded-[20px] border border-[rgba(7,20,38,0.08)] bg-white sm:rounded-[22px]">
              <Image
                src="/method/report-score.png"
                alt="Sleep Wellness Expert Reportの表紙とスコア"
                width={1200}
                height={1600}
                className="h-auto w-full"
              />
            </div>

            <p className="mt-8 text-[15px] leading-8 text-slate-700 sm:text-base sm:leading-8">
              総合評価では、回復・リズム・深さ・安定などの観点を踏まえ、今日の優先順位につながるコメントをまとめます。
            </p>

            <div className="mt-8 overflow-hidden rounded-[20px] border border-[rgba(7,20,38,0.08)] bg-white sm:rounded-[22px]">
              <Image
                src="/method/report-overall.png"
                alt="今日の総合評価と総合コメントの表示例"
                width={1200}
                height={1600}
                className="h-auto w-full"
              />
            </div>

            <p className="mt-8 text-[15px] leading-8 text-slate-700 sm:text-base sm:leading-8">
              睡眠スコアだけでなく、睡眠段階・心拍変動・呼吸数・血中酸素飽和度まで一覧にします。そのうえで、必要に応じて夜間の血糖推移を重ね、改善の優先順位を1つに絞り込みます。
            </p>
          </section>

          {/* 05 計測から実践まで */}
          <section className="mt-16 pb-[var(--sw-beta-chrome-offset)] sm:mt-20 sm:pb-0">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              05
            </p>
            <h2
              className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
              style={{ color: NAVY }}
            >
              計測から実践まで
            </h2>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {flowSteps.map((step) => (
                <li key={step.number}>
                  <article className="flex h-full flex-col overflow-hidden rounded-[20px] border border-[rgba(7,20,38,0.08)] bg-white sm:rounded-[22px]">
                    <div className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
                      <p
                        className="text-[10px] font-semibold tracking-[0.18em]"
                        style={{ color: GOLD }}
                      >
                        {step.number}
                      </p>
                      <h3
                        className="mt-2 text-[15px] font-semibold tracking-[-0.02em] sm:text-base"
                        style={{ color: NAVY }}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-6 text-slate-600 sm:text-[14px] sm:leading-7">
                        {step.description}
                      </p>
                    </div>
                    <div className="w-full bg-white py-4">
                      <Image
                        src={step.image}
                        alt={step.imageAlt}
                        width={800}
                        height={500}
                        className="h-auto w-full"
                        unoptimized
                      />
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[12px] leading-5 text-slate-500 sm:text-[13px] sm:leading-6">
              ※グルコース値は間質液での計測のため、目安として扱います。
            </p>

            <p className="mt-8 text-[15px] leading-8 text-slate-700 sm:text-base sm:leading-8">
              分析は、答えを出すためのものではありません。次に何を試すかを決めるためのものです。
            </p>

            <div className="mt-8">
              <Image
                src="/method/analysis-report-illustration.svg"
                alt="クライアントに渡す睡眠ウェルネスレポートのイメージ"
                width={800}
                height={500}
                className="h-auto w-full"
                unoptimized
              />
            </div>
            <p className="mt-4 text-[12px] leading-5 text-slate-600 sm:text-[13px] sm:leading-6">
              実際のレポート（3ページ）。クライアントにはPDFでお渡ししています。
            </p>
          </section>

          {/* 06 */}
          <section className="mt-16 sm:mt-20">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              06
            </p>
            <h2
              className="mt-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
              style={{ color: NAVY }}
            >
              この分析でわかること、わからないこと
            </h2>

            <div className="mt-8 grid gap-4 sm:gap-5 lg:grid-cols-2">
              <article className="rounded-[20px] border border-[rgba(7,20,38,0.08)] bg-white px-5 py-5 sm:rounded-[22px] sm:px-6 sm:py-6">
                <p
                  className="text-[10px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  わかること
                </p>
                <ul className="mt-4 space-y-2.5 text-[14px] leading-7 text-slate-700">
                  {knownItems.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span style={{ color: GOLD }} aria-hidden>
                        ·
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-[20px] border border-[rgba(7,20,38,0.08)] bg-white px-5 py-5 sm:rounded-[22px] sm:px-6 sm:py-6">
                <p
                  className="text-[10px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  わからないこと
                </p>
                <ul className="mt-4 space-y-2.5 text-[14px] leading-7 text-slate-700">
                  {unknownItems.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span style={{ color: GOLD }} aria-hidden>
                        ·
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <p className="mt-8 text-[15px] leading-8 text-slate-700 sm:text-base sm:leading-8">
              血糖測定は間質液からの推定値です。医療機器としての血液検査とは異なります。あくまで傾向を読むための参考情報として扱っています。
            </p>
          </section>

          {/* クロージング */}
          <div
            className="mt-14 rounded-[24px] border px-6 py-10 sm:mt-16 sm:px-10 sm:py-12"
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
            <div className="mt-5 space-y-5 text-[15px] leading-8 text-white/85 sm:text-base sm:leading-8">
              <p>
                眠りは、一晩では読み切れません。けれど何日か重ねていくと、その人のリズムが見えてきます。
              </p>
              <p>
                二つの計測は、そのための道具です。数字を追いかけるのではなく、数字の向こうにある生活を見るために使っています。
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/academy/certified-instructor"
              className="inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: NAVY }}
            >
              認定講師になる
            </Link>
            <Link
              href="/#services"
              className="inline-flex min-h-12 items-center justify-center rounded-full border px-7 text-sm font-semibold transition hover:bg-white"
              style={{ borderColor: "rgba(7,20,38,0.15)", color: NAVY }}
            >
              実践を見る
            </Link>
          </div>

          {/* 注意書き */}
          <p className="mt-12 border-t border-[rgba(7,20,38,0.08)] pt-6 text-[12px] leading-6 text-slate-500 sm:mt-14 sm:text-[13px] sm:leading-7">
            この分析は医療的な診断・治療を目的としたものではありません。糖尿病などで治療中の方は、食事や運動を変える前に主治医にご相談ください。睡眠に関する不調が続く場合は、医療機関を受診してください。
          </p>
        </div>
      </article>

      <Footer />
    </main>
  );
}
