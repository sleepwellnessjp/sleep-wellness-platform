import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import InstructorPublicShell from "@/components/instructors/InstructorPublicShell";

export const metadata: Metadata = {
  title: "認定講師養成講座 | Sleep Wellness Institute Japan",
  description:
    "睡眠科学、ヨガ、呼吸法、データ分析、日本文化を体系的に学び、睡眠ウェルネスを伝える認定講師を育成する3日間集中プログラム。",
};

const features = [
  {
    title: "科学",
    body: "睡眠の仕組み、自律神経、体内時計などを体系的に理解します。",
  },
  {
    title: "実践",
    body: "メラトニンヨガ™、呼吸法、瞑想を自分で体験し、指導法を学びます。",
  },
  {
    title: "データ",
    body: "睡眠データを読み解き、生活習慣の改善につなげる方法を学びます。",
  },
] as const;

const curriculum = [
  {
    day: "DAY 1",
    title: "睡眠ウェルネスの基礎を理解する",
    subtitle: "睡眠科学・自律神経・体内時計",
    items: [
      "睡眠ウェルネスとは何か",
      "睡眠の役割と基本構造",
      "レム睡眠とノンレム睡眠",
      "深睡眠と心身の回復",
      "自律神経と睡眠の関係",
      "メラトニンと光の関係",
      "サーカディアンリズム",
      "睡眠負債と社会的時差ぼけ",
      "入浴、食事、運動、飲酒と睡眠",
      "医療とウェルネスの境界",
      "認定講師として守るべき倫理と注意事項",
    ],
    summary:
      "睡眠を単独で捉えず、24時間の生活全体から考える基礎を身につけます。",
  },
  {
    day: "DAY 2",
    title: "メラトニンヨガ™を体験し、伝える",
    subtitle: "日本文化・ヨガ・呼吸法・瞑想",
    items: [
      "メラトニンヨガ™の基本理念",
      "日本文化における「間」",
      "述語制と身体感覚",
      "昼と夜の過ごし方の違い",
      "休息へ移行するためのヨガ",
      "3：6呼吸法の理論と実践",
      "呼吸と自律神経の関係",
      "瞑想と注意のコントロール",
      "音、余韻、サウンドバス",
      "標準的なクラス構成",
      "安全な指導方法",
      "インストラクションと声かけ",
      "参加者に合わせた調整方法",
      "指導実習とフィードバック",
    ],
    summary:
      "自分自身で体験しながら、睡眠へ向かう身体と心の整え方を学びます。",
  },
  {
    day: "DAY 3",
    title: "睡眠データを読み解き、支援につなげる",
    subtitle: "日本文化・Sleep Wellness Philosophy・データ分析・実践演習",
    items: [
      "日本文化と睡眠ウェルネス",
      "メラトニンヨガ™の哲学",
      "「間」の思想と休息",
      "述語制と身体感覚",
      "日本の伝統文化と現代の睡眠科学",
      "海外へ発信するSleep Wellness",
      "日本発の睡眠ウェルネスメソッドとしての価値",
      "Sleep Wellness Institute Japanの理念",
      "認定講師としてブランドを正しく伝える方法",
      "ウェアラブルデータの基礎",
      "睡眠スコアの考え方",
      "睡眠時間と睡眠効率",
      "覚醒、レム、浅い睡眠、深睡眠",
      "安静時心拍数とHRV",
      "呼吸数と血中酸素の見方",
      "ストレスデータと回復状態",
      "単日の数値と長期傾向の違い",
      "Sleep Wellness Platformの使用方法",
      "クライアント登録と管理",
      "AI睡眠分析レポートの確認方法",
      "分析結果を伝える際の注意点",
      "生活習慣へのアドバイス方法",
      "ホームワークの設定",
      "認定講師コメントの作成",
      "ケーススタディ",
      "模擬セッション",
      "修了確認",
    ],
    summary:
      "日本文化と睡眠科学を融合したSleep Wellness Philosophyを理解し、" +
      "データだけではなく、人・文化・生活背景を含めて" +
      "睡眠ウェルネスを伝えられる認定講師を育成します。",
  },
] as const;

const learnings = [
  "睡眠の基本的な仕組みを分かりやすく説明できる",
  "睡眠と生活習慣の関係を整理できる",
  "メラトニンヨガ™を安全に指導できる",
  "呼吸法や瞑想を睡眠支援に活用できる",
  "睡眠データの基本項目を読み取れる",
  "AI分析レポートを確認し、補足できる",
  "クライアントに適切なホームワークを提案できる",
  "医療行為とウェルネス支援の違いを理解できる",
  "Sleep Wellness Platformを活用した継続支援ができる",
] as const;

const flowSteps = [
  { step: "01", label: "養成講座へ申し込む" },
  { step: "02", label: "倫理規定・利用規約への同意" },
  { step: "03", label: "3日間のカリキュラムを受講" },
  { step: "04", label: "指導実習・修了確認" },
  { step: "05", label: "認定証発行・活動開始" },
] as const;

const afterCertification = [
  "Sleep Wellness Platformの利用",
  "クライアント管理",
  "AI睡眠分析",
  "睡眠レポート作成",
  "講師コメントとホームワーク設定",
  "PDFレポート発行",
  "My License／デジタル認定証",
  "最新教材や研究情報の閲覧",
  "認定講師向けイベントへの参加",
  "継続学習と更新研修",
] as const;

const audience = [
  "ヨガやピラティスのインストラクター",
  "健康やウェルネスに関わる指導者",
  "睡眠について体系的に学びたい方",
  "既存のクラスに睡眠の視点を取り入れたい方",
  "ウェアラブルデータを指導に活用したい方",
  "クライアントへの継続的な支援を行いたい方",
  "睡眠ウェルネスを地域や社会に広めたい方",
] as const;

const programInfo = [
  { label: "開催形式", value: "対面を中心とした3日間集中プログラム" },
  { label: "開催日", value: "次回日程は近日公開" },
  { label: "会場", value: "開催回ごとにご案内します" },
  { label: "定員", value: "少人数制" },
  { label: "受講料", value: "次回募集時にご案内します" },
] as const;

const founderTitles = [
  "Sleep Wellness Institute Japan Founder",
  "睡眠ウェルネスプロデューサー",
  "メラトニンヨガ™考案者",
  "ヨガ・ピラティス指導者",
] as const;

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <span className="h-px w-10 bg-[#b89242] sm:w-12" />
      <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d] sm:text-xs">
        {children}
      </p>
    </div>
  );
}

export default function CertifiedInstructorProgramPage() {
  return (
    <InstructorPublicShell>
      <main className="bg-[#f7f7f5] text-[#071426]">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#071426]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(216,179,106,0.14),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(49,95,104,0.18),transparent_50%)]" />

          <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
              CERTIFIED INSTRUCTOR PROGRAM
            </p>
            <h1 className="mt-5 max-w-3xl text-[2rem] font-semibold leading-[1.15] tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl lg:leading-[1.1]">
              睡眠ウェルネスを、
              <br />
              伝えられる人になる。
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-8 text-white/75 sm:text-base sm:leading-8">
              睡眠科学、ヨガ、呼吸法、データ分析、日本文化を体系的に学び、
              一人ひとりの睡眠と生活習慣を支援する認定講師を育成します。
            </p>
            <p className="mt-6 text-sm leading-7 text-[#d8b36a]/90 sm:text-[15px]">
              Sleep Wellness Institute Japan
              <br className="sm:hidden" />
              <span className="sm:ml-1">
                認定講師養成講座｜3日間集中プログラム
              </span>
            </p>

            <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap">
              <a
                href="#curriculum"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#071426] transition hover:bg-[#f4f4f4] sm:text-base"
              >
                講座内容を見る
              </a>
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/20 sm:text-base"
              >
                開催情報を問い合わせる
              </Link>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="relative overflow-hidden py-14 sm:py-16 lg:py-20">
          <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-cyan-100/40 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionLabel>ABOUT THE PROGRAM</SectionLabel>
            <h2 className="max-w-3xl text-2xl font-semibold leading-snug tracking-[-0.04em] sm:text-3xl lg:text-4xl">
              科学と実践をつなぐ、
              <br />
              3日間の認定講師養成講座
            </h2>
            <div className="mt-6 max-w-3xl space-y-5 text-[15px] leading-8 text-slate-700 sm:text-base">
              <p>本講座は、睡眠に関する知識を学ぶだけの講座ではありません。</p>
              <p>
                睡眠科学を基礎として、メラトニンヨガ™、呼吸法、瞑想、
                日本文化の「間」、生活習慣、ウェアラブルデータの読み方を学び、
                クライアントに分かりやすく伝える力を身につけます。
              </p>
              <p>
                講座修了後は、所定の条件を満たすことで、
                Sleep Wellness Institute Japan認定講師として活動できます。
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-[24px] border border-[#071426]/08 bg-white px-5 py-6 shadow-[0_18px_50px_-40px_rgba(7,20,38,0.25)] sm:px-6"
                >
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-[#8a6a2d]">
                    FEATURE
                  </p>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#071426]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {feature.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Curriculum */}
        <section
          id="curriculum"
          className="scroll-mt-24 border-y border-[#071426]/06 bg-[#fafaf8] py-14 sm:py-16 lg:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionLabel>CURRICULUM</SectionLabel>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl lg:text-4xl">
              3日間のカリキュラム
            </h2>

            <div className="mt-10 space-y-6 sm:mt-12 sm:space-y-8">
              {curriculum.map((day) => (
                <article
                  key={day.day}
                  className="overflow-hidden rounded-[28px] border border-[#071426]/08 bg-white shadow-[0_24px_70px_-48px_rgba(7,20,38,0.28)]"
                >
                  <div className="border-b border-[#071426]/06 bg-[#071426] px-5 py-6 sm:px-8 sm:py-7">
                    <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
                      {day.day}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold leading-snug tracking-[-0.03em] text-white sm:text-2xl">
                      {day.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/70 sm:text-[15px]">
                      {day.subtitle}
                    </p>
                  </div>
                  <div className="px-5 py-6 sm:px-8 sm:py-8">
                    <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-2.5">
                      {day.items.map((item) => (
                        <li
                          key={item}
                          className="flex gap-3 text-[14px] leading-7 text-slate-700 sm:text-[15px]"
                        >
                          <span
                            className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b89242]"
                            aria-hidden
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-7 rounded-2xl border border-[#8a6a2d]/20 bg-[#fafaf8] px-4 py-4 text-[14px] leading-7 text-[#071426] sm:mt-8 sm:px-5 sm:text-[15px]">
                      {day.summary}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* What you will learn */}
        <section className="py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionLabel>WHAT YOU WILL LEARN</SectionLabel>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl lg:text-4xl">
              講座修了後にできること
            </h2>
            <ul className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
              {learnings.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-[20px] border border-[#071426]/08 bg-white px-4 py-4 text-[14px] leading-7 text-slate-700 sm:px-5"
                >
                  <span
                    className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#071426] text-[10px] font-bold text-[#d8b36a]"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Certification flow */}
        <section className="border-y border-[#071426]/06 bg-white py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionLabel>CERTIFICATION FLOW</SectionLabel>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl lg:text-4xl">
              認定講師になるまで
            </h2>

            <ol className="mt-8 space-y-3 sm:mt-10 sm:grid sm:grid-cols-5 sm:gap-3 sm:space-y-0">
              {flowSteps.map((item) => (
                <li
                  key={item.step}
                  className="rounded-[20px] border border-[#071426]/08 bg-[#fafaf8] px-4 py-5"
                >
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-[#8a6a2d]">
                    STEP {item.step}
                  </p>
                  <p className="mt-3 text-[14px] font-semibold leading-6 text-[#071426] sm:text-[15px]">
                    {item.label}
                  </p>
                </li>
              ))}
            </ol>

            <p className="mt-8 max-w-3xl text-[15px] leading-8 text-slate-700 sm:mt-10 sm:text-base">
              認定後は、メラトニンヨガ™のクラスやワークショップの開催、
              Sleep Wellness Platformを活用した睡眠ウェルネス支援が可能になります。
            </p>
            <p className="mt-4 max-w-3xl text-[12px] leading-6 text-slate-500 sm:text-[13px]">
              ※本資格は医療資格ではありません。医療診断や治療を行うものではなく、
              睡眠ウェルネスの観点から生活習慣とセルフケアを支援する認定制度です。
            </p>
          </div>
        </section>

        {/* After certification */}
        <section className="py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionLabel>AFTER CERTIFICATION</SectionLabel>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl lg:text-4xl">
              認定後の活動を支える仕組み
            </h2>

            <ul className="mt-8 grid gap-2.5 sm:mt-10 sm:grid-cols-2">
              {afterCertification.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-[14px] leading-7 text-slate-700 sm:text-[15px]"
                >
                  <span
                    className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#315f68]"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <article className="mt-10 max-w-xl rounded-[28px] border border-[#8a6a2d]/25 bg-white px-5 py-7 shadow-[0_20px_60px_-45px_rgba(7,20,38,0.3)] sm:mt-12 sm:px-8">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[#8a6a2d]">
                PLATFORM PLAN
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#071426]">
                認定講師プラットフォーム
              </h3>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#071426]">
                年額 ¥12,000
              </p>
              <p className="mt-4 text-[15px] leading-8 text-slate-700">
                認定資格を取得した講師が、
                Sleep Wellness Platformを1年間利用できるプランです。
              </p>
              <p className="mt-4 text-[12px] leading-6 text-slate-500">
                ※養成講座の受講料とは別です。
              </p>
            </article>
          </div>
        </section>

        {/* For whom */}
        <section className="border-y border-[#071426]/06 bg-[#fafaf8] py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionLabel>FOR WHOM</SectionLabel>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl lg:text-4xl">
              このような方におすすめです
            </h2>
            <ul className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2">
              {audience.map((item) => (
                <li
                  key={item}
                  className="rounded-[20px] border border-[#071426]/08 bg-white px-5 py-4 text-[14px] leading-7 text-slate-700 sm:text-[15px]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Program director */}
        <section className="py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionLabel>PROGRAM DIRECTOR</SectionLabel>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl lg:text-4xl">
              講座監修・指導
            </h2>

            <div className="mt-8 grid items-start gap-8 sm:mt-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[28px] shadow-[0_30px_80px_-48px_rgba(7,20,38,0.55)] lg:mx-0">
                <Image
                  src="/taka-photo.jpg"
                  alt="若林貴久"
                  fill
                  className="object-cover object-top"
                  sizes="(min-width:1024px) 28vw, 80vw"
                />
              </div>
              <div>
                <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#071426] sm:text-3xl">
                  TAKA／若林貴久
                </h3>
                <ul className="mt-4 space-y-1.5">
                  {founderTitles.map((title) => (
                    <li
                      key={title}
                      className="text-[14px] leading-7 text-slate-600 sm:text-[15px]"
                    >
                      {title}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 space-y-4 text-[15px] leading-8 text-slate-700 sm:text-base">
                  <p>
                    睡眠科学、ヨガ、呼吸法、瞑想、ウェアラブルデータを融合し、
                    睡眠を「夜だけの問題」ではなく、24時間の生活全体から捉える
                    睡眠ウェルネスの普及に取り組んでいます。
                  </p>
                  <p>
                    行政、企業、ウェルネス団体との連携や、
                    ヨガフェスタをはじめとするイベントで活動しています。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Program information */}
        <section className="border-y border-[#071426]/06 bg-white py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <SectionLabel>PROGRAM INFORMATION</SectionLabel>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl lg:text-4xl">
              開催情報
            </h2>
            <dl className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2">
              {programInfo.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[20px] border border-[#071426]/08 bg-[#fafaf8] px-5 py-5"
                >
                  <dt className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-[15px] font-semibold leading-7 text-[#071426]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="relative overflow-hidden bg-[#071426] py-16 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(216,179,106,0.12),transparent_60%)]" />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold leading-snug tracking-[-0.04em] text-white sm:text-3xl lg:text-4xl">
              睡眠ウェルネスを、
              <br />
              伝える側へ。
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-8 text-white/70 sm:text-base">
              次回講座の日程、受講条件、募集開始については、
              お問い合わせフォームよりご確認ください。
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#071426] transition hover:bg-[#f4f4f4] sm:text-base"
              >
                認定講座について問い合わせる
              </Link>
              <Link
                href="/"
                className="text-sm font-semibold text-white/70 transition hover:text-white"
              >
                トップページへ戻る
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </InstructorPublicShell>
  );
}
