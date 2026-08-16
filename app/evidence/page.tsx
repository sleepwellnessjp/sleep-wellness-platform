import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { HOME_TOP_HREF } from "@/lib/home-intro";

export const metadata: Metadata = {
  title: "この分析のエビデンス ― 科学的根拠（Evidence） | Sleep Wellness Institute Japan",
  description:
    "Sleep Wellness Method™ は、何に基づいているのか。測定・分析・実践の3つの層について、睡眠科学・時間生物学・運動科学の公表された研究知見と出典（参考文献つき）でご説明します。",
};

const GOLD = "#d8b36a";

/** 章見出し（英字カーカー＋日本語見出し） */
function SectionHeading({
  kicker,
  title,
}: {
  kicker: string;
  title: string;
}) {
  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.32em]"
        style={{ color: GOLD }}
      >
        {kicker}
      </p>
      <h2 className="mt-3 text-[1.5rem] font-semibold leading-[1.4] tracking-[-0.02em] text-white sm:text-[1.75rem]">
        {title}
      </h2>
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-[0.96rem] leading-[2] tracking-[0.01em] text-white/74 sm:text-[1rem]">
      {children}
    </p>
  );
}

/** 私たちの立場・はじめに 等の補足ボックス */
function Callout({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
      style={{ borderLeft: `2px solid ${GOLD}` }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        {label}
      </p>
      <p className="mt-3 text-[0.93rem] leading-[1.95] text-white/78">
        {children}
      </p>
    </div>
  );
}

function Divider() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto my-14 h-px w-11 sm:my-16"
      style={{ background: "rgba(216,179,106,0.4)" }}
    />
  );
}

/** 第N層のサブ見出し */
function LayerHeading({
  layer,
  title,
}: {
  layer: string;
  title: string;
}) {
  return (
    <div className="flex items-baseline gap-x-3">
      <span
        className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-[#071426]"
        style={{ background: GOLD }}
      >
        {layer}
      </span>
      <h3 className="min-w-0 flex-1 text-[1.2rem] font-semibold leading-[1.4] tracking-[-0.01em] text-white sm:text-[1.35rem]">
        {title}
      </h3>
    </div>
  );
}

const INDICATORS = [
  {
    name: "睡眠時間",
    watch: "必要な量が確保できているか",
    science:
      "米国睡眠医学会(AASM)は成人に7時間以上の睡眠を推奨(文献3)。厚生労働省「健康づくりのための睡眠ガイド2023」も成人に6時間以上を目安として確保することを推奨(文献4)",
  },
  {
    name: "睡眠の規則性",
    watch: "就寝・起床時刻のブレ",
    science:
      "体内時計(概日リズム)の安定は睡眠の質の土台。就寝・起床時刻の不規則さは入眠困難や日中の眠気と関連",
  },
  {
    name: "睡眠効率",
    watch: "床に入っていた時間のうち実際に眠れていた割合",
    science: "睡眠医療で一般に85%以上が良好の目安とされる",
  },
  {
    name: "深い睡眠・レム睡眠",
    watch: "心身の回復と記憶・感情の整理",
    science:
      "深い睡眠(徐波睡眠)は身体の回復・成長ホルモン分泌と、レム睡眠は記憶・感情処理と関連",
  },
  {
    name: "心拍変動(HRV)・安静時心拍",
    watch: "自律神経のバランス、回復度",
    science:
      "HRVは副交感神経(休息モード)の働きを反映する確立した生理指標(文献8)",
  },
  {
    name: "皮膚温・体温リズム",
    watch: "深部体温リズムと入眠のタイミング",
    science:
      "入眠は深部体温の低下と連動して起こる。就寝前に深部体温が下がる流れを作ることが入眠を促す(文献5)",
  },
];

const QA = [
  {
    q: "Q1.「このアドバイスは、何を根拠に出しているのですか?」",
    a: "3つの層でお答えできます。①測定は、睡眠医療の標準検査(PSG)との比較検証が公表されているウェアラブル技術を使っています。②分析は、睡眠時間・規則性・睡眠効率・HRV・体温リズムといった、睡眠科学で確立された指標に基づいて優先順位を決めています。③ご提案する実践(ヨガ・呼吸・瞑想・入浴・光)は、いずれもランダム化比較試験のメタ分析レベルで睡眠改善の報告がある方法です。詳細は当サイトの Evidence ページに出典付きでまとめています。",
  },
  {
    q: "Q2.「スマートリングのデータは正確なのですか?」",
    a: "医療検査と完全に同じではありませんが、多センサー型のリングは睡眠検査(PSG)との比較研究で実用的な精度が報告されています。私たちは1日の数値を絶対視するのではなく、数週間の「傾向」を読むことを重視しています。傾向を見るツールとしては十分に信頼できる、というのが研究上も私たちの実感としてもお伝えできることです。",
  },
  {
    q: "Q3.「なぜヨガで睡眠が良くなるのですか?」",
    a: "大きく3つの経路が研究で示されています。①ゆっくりした動きと呼吸が副交感神経を優位にし、心身を休息モードへ切り替える。②メタ分析でヨガの実践がメラトニン分泌を高めることが報告されている。③複数の運動を比較した研究で、ヨガは睡眠の質の改善に最も効果的な運動のひとつとされている。メラトニンヨガ™は、この3つの経路を夜の時間帯に最適化した実践です。",
  },
  {
    q: "Q4.「『メラトニンヨガ』という名前は科学的なのですか?」",
    a: "はい、名称の背景には研究知見があります。ヨガの実践が睡眠ホルモンであるメラトニンの分泌を有意に高めることを示したメタ分析が公表されています。ただし「ヨガをすれば必ずメラトニンが増える」と保証するものではなく、「メラトニンが自然に分泌されやすい心身の状態と生活リズムをつくる」ことを目的としたプログラム名です。",
  },
  {
    q: "Q5.「これは治療ですか?病院とはどう違うのですか?」",
    a: "治療ではありません。私たちは医療行為・診断は行わず、生活習慣とヨガの実践による「予防とセルフケア」の領域を担っています。データ上、睡眠時無呼吸の疑いなど医療的な確認が必要と思われるサインがある場合は、医療機関の受診をおすすめしています。医療と対立するものではなく、医療の手前を支える役割です。",
  },
  {
    q: "Q6.「どれくらいで効果が出ますか?」",
    a: "個人差はありますが、研究では8～10週間程度のヨガプログラムで睡眠の質の改善が報告されています。入浴や光のリズムのように数日で変化を感じやすいものもあります。Method では数週間ごとにデータを再評価し、変化を確認しながら実践を調整します。",
  },
  {
    q: "Q7.「AIは何をしているのですか?人間の判断とどう違うのですか?」",
    a: "AIは、リングの睡眠データを睡眠科学の指標に照らして整理し、「どこから整えるか」の優先順位の候補を提示します。最終的にどう実践に落とし込むかは、クライアントの生活状況・体の状態を理解している認定講師が判断します。「AIが分析し、人が伴走する」のが Method の設計です。",
  },
];

const DISCLAIMERS = [
  "本プラットフォームおよび Sleep Wellness Method™ は、医療行為(診断・治療・投薬指導)を提供するものではありません。",
  "ウェアラブルデバイスの測定値は参考情報であり、医療検査の結果を代替するものではありません。",
  "睡眠に関する疾患(不眠症、睡眠時無呼吸症候群等)が疑われる場合や、症状が続く場合は、医療機関にご相談ください。",
  "本ページの研究知見は一般的な傾向を示すものであり、効果には個人差があります。",
];

const REFERENCES = [
  "Altini M, Kinnunen H. The Promise of Sleep: A Multi-Sensor Approach for Accurate Sleep Stage Detection Using the Oura Ring. Sensors. 2021;21(13):4302.",
  "de Zambotti M, et al. The Sleep of the Ring: Comparison of the ŌURA Sleep Tracker Against Polysomnography. Behavioral Sleep Medicine. 2019;17(2):124–136.",
  "Watson NF, et al. Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the American Academy of Sleep Medicine and Sleep Research Society. Sleep. 2015;38(6):843–844.",
  "厚生労働省. 健康づくりのための睡眠ガイド2023. 2024年公表.",
  "Haghayegh S, et al. Before-bedtime passive body heating by warm shower or bath to improve sleep: A systematic review and meta-analysis. Sleep Medicine Reviews. 2019;46:124–135.",
  "Li L, et al. Which exercise prescription is most effective for patients with sleep disorders?: a network meta-analysis of 30 randomized controlled trials. Sleep and Biological Rhythms. 2025;23(4):355–372.",
  "不眠に対する運動介入のネットワークメタ分析(22 RCT・1,348名). BMJ Evidence-Based Medicine. 2025.",
  "Zaccaro A, et al. How Breath-Control Can Change Your Life: A Systematic Review on Psycho-Physiological Correlates of Slow Breathing. Frontiers in Human Neuroscience. 2018;12:353.",
  "Wang WL, et al. The effect of yoga on sleep quality and insomnia in women with sleep problems: a systematic review and meta-analysis. BMC Psychiatry. 2020;20:195.",
  "Meta-analysis of the Effect of Yogic Techniques on Melatonin Levels: Implications for Sleep Health. PubMed Central (PMC12931644). 2025.",
  "Black DS, et al. Mindfulness Meditation and Improvement in Sleep Quality and Daytime Impairment Among Older Adults With Sleep Disturbances: A Randomized Clinical Trial. JAMA Internal Medicine. 2015;175(4):494–501.",
  "Chang AM, et al. Evening use of light-emitting eReaders negatively affects sleep, circadian timing, and next-morning alertness. PNAS. 2015;112(4):1232–1237.",
];

export default function EvidencePage() {
  return (
    <main className="min-h-screen bg-[#071426] text-white">
      {/* ヘッダー（ロゴ＋ハンバーガー・スマホのみ Safe Area + 余白） */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] sm:gap-4 sm:px-8 sm:pb-4 sm:pt-6 lg:px-10">
          <Link
            href={HOME_TOP_HREF}
            className="inline-flex min-h-11 min-w-11 items-center py-1.5 pr-2 sm:min-h-0 sm:py-0 sm:pr-0"
          >
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={200}
              height={50}
              priority
              className="h-auto w-[148px] sm:w-[168px]"
            />
          </Link>
          <SiteNavMenu tone="light" />
        </div>
      </header>

      {/* タイトル */}
      <section className="mx-auto max-w-3xl px-6 pt-10 pb-2 text-center sm:px-8 sm:pt-16">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-[0.08em]"
          style={{ borderColor: "rgba(216,179,106,0.5)", color: GOLD }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 6L9 17l-5-5"
              stroke={GOLD}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          出典つき ／ 科学的根拠を確認できるページ
        </span>
        <p
          className="mt-6 text-[11px] font-semibold uppercase tracking-[0.34em]"
          style={{ color: GOLD }}
        >
          Evidence
        </p>
        <h1 className="mt-4 text-[2rem] font-semibold leading-[1.25] tracking-[-0.03em] text-white sm:text-[2.75rem]">
          科学的根拠（Evidence）
        </h1>
        <p className="mt-5 text-[0.98rem] font-medium leading-[1.8] tracking-[0.02em] text-white/70 sm:text-[1.1rem]">
          Sleep Wellness Method™ は、何に基づいているのか
        </p>
      </section>

      <article className="mx-auto max-w-[44rem] px-6 pb-4 sm:px-8">
        <Divider />

        {/* 導入 */}
        <Body>
          Sleep Wellness Method™ は、「データ → 分析 → 指導 → 実践 → 再評価」というサイクルで睡眠を整えるメソッドです。その各ステップは、思いつきや経験則ではなく、睡眠科学・時間生物学(概日リズム研究)・運動科学の公表された研究知見に基づいて設計されています。
        </Body>
        <Body>
          本ページでは、Method を構成する3つの層 ⸺「①測定」「②分析」「③実践」⸺ それぞれの科学的背景を、出典とともにご説明します。
        </Body>

        <Callout label="はじめにお伝えしたいこと">
          Sleep Wellness Method™ は医療行為・診断・治療ではありません。ウェアラブルデータと科学的知見をもとに、日々の生活習慣とヨガの実践を通じて「よりよく眠るための行動」を支援するウェルネスプログラムです。不眠症・睡眠時無呼吸症候群などの疾患が疑われる場合は、医療機関の受診をご案内しています。
        </Callout>

        <Divider />

        {/* 第1層 */}
        <section>
          <LayerHeading
            layer="第1層 ｜ 測定"
            title="なぜスマートリングのデータを使えるのか"
          />
          <Body>
            スマートリングは、心拍数・心拍変動(HRV)・皮膚温・体動・血中酸素飽和度などを一晩を通して記録し、そこから睡眠時間・睡眠段階(深い睡眠／レム睡眠／浅い睡眠)・睡眠効率を推定します。
          </Body>
          <Body>
            こうしたウェアラブル機器による睡眠推定は、睡眠医療の標準検査である睡眠ポリグラフ検査(PSG)との比較検証研究が複数発表されており、多センサー(心拍・体温・加速度)を組み合わせた最新世代のリング型デバイスは、睡眠と覚醒の判定および睡眠段階の推定において実用的な一致度を示すことが報告されています(文献1, 2)。
          </Body>
          <Callout label="私たちの立場">
            ウェアラブルのデータは医療検査の代替ではなく、「日々の変化と傾向を捉えるためのツール」です。1日単位の数値の正確さよりも、
            <strong className="font-semibold text-white">
              数週間単位のトレンド(規則性・変化の方向)
            </strong>
            を読むことに価値があり、Method の分析もその前提で設計されています。また、当研究所はスマートリング開発企業 SOXAI との共同実証に取り組み、データ活用の妥当性を実地で検証しています。
          </Callout>
        </section>

        <Divider />

        {/* 第2層 */}
        <section>
          <LayerHeading
            layer="第2層 ｜ 分析"
            title="どの指標を、なぜ見るのか"
          />
          <Body>
            AI分析では、睡眠科学で確立された指標を用いて「いま何から整えるべきか」の優先順位を決めます。主な指標と根拠は以下のとおりです。
          </Body>

          <div className="mt-8 space-y-4">
            {INDICATORS.map((row) => (
              <div
                key={row.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              >
                <p className="text-[1.02rem] font-semibold tracking-[0.01em] text-white">
                  {row.name}
                </p>
                <dl className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
                    <dt
                      className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: GOLD }}
                    >
                      見ている内容
                    </dt>
                    <dd className="text-[0.92rem] leading-[1.85] text-white/78">
                      {row.watch}
                    </dd>
                  </div>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
                    <dt
                      className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: GOLD }}
                    >
                      科学的背景
                    </dt>
                    <dd className="text-[0.92rem] leading-[1.85] text-white/78">
                      {row.science}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <Body>
            これらの指標のうち「どこが最も乱れているか」を特定し、次の第3層の実践メニューへつなげる ⸺ これが Method の Priority(優先順位づけ)の考え方です。
          </Body>
        </section>

        <Divider />

        {/* 第3層 */}
        <section>
          <LayerHeading
            layer="第3層 ｜ 実践"
            title="なぜヨガ・呼吸・瞑想・入浴なのか"
          />

          <div className="mt-5 space-y-10">
            {/* ヨガ */}
            <div>
              <h4 className="text-[1.05rem] font-semibold tracking-[0.01em] text-white">
                ヨガ（間のヨガ™／メラトニンヨガ™）
              </h4>
              <Body>
                運動と睡眠に関する研究の中でも、ヨガは特にエビデンスの蓄積が進んでいる分野です。
              </Body>
              <ul className="mt-5 space-y-4">
                {[
                  "睡眠障害を持つ人を対象とした30件のランダム化比較試験(計2,576名)を統合したネットワークメタ分析では、複数の運動種目の中でヨガが睡眠の質の改善に最も効果的という結果が示されました(文献6)。",
                  "不眠に対する運動介入を比較した22件のランダム化比較試験のネットワークメタ分析(BMJ Evidence-Based Medicine, 2025)でも、ヨガは太極拳・ウォーキング等と並び不眠の改善に有効な運動として位置づけられています(文献7)。",
                  "女性の睡眠の問題を対象とした19研究(1,832名)のメタ分析でも、ヨガ群で睡眠の質の有意な改善が確認されています(文献9)。",
                ].map((li) => (
                  <li
                    key={li}
                    className="flex gap-3 text-[0.94rem] leading-[1.95] text-white/76"
                  >
                    <span
                      aria-hidden
                      className="mt-[0.7em] h-[5px] w-[5px] flex-none rounded-full"
                      style={{ background: GOLD }}
                    />
                    <span>{li}</span>
                  </li>
                ))}
              </ul>
              <Body>
                さらに、ヨガの実践がメラトニン(睡眠ホルモン)の分泌量を有意に高めることを示したメタ分析が報告されており(文献10)、「メラトニンヨガ™」という名称は、この「ヨガ実践 → メラトニン分泌 → 睡眠の質」という研究知見の流れを、実践プログラムとして体系化したものです。
              </Body>
            </div>

            {/* 呼吸法 */}
            <div>
              <h4 className="text-[1.05rem] font-semibold tracking-[0.01em] text-white">
                呼吸法
              </h4>
              <Body>
                ゆっくりとした呼吸(おおむね1分間に10回以下)は、迷走神経を介して副交感神経の働きを高め、心拍変動(HRV)を増加させ、リラックス状態への切り替えを促すことが、生理学研究のシステマティックレビューで示されています(文献8)。Method の夜の実践で呼吸を軸に置くのは、この「呼吸は自律神経に自分でアクセスできる数少ない入口」という知見に基づきます。
              </Body>
            </div>

            {/* 瞑想・マインドフルネス */}
            <div>
              <h4 className="text-[1.05rem] font-semibold tracking-[0.01em] text-white">
                瞑想・マインドフルネス
              </h4>
              <Body>
                睡眠に問題を抱える中高年を対象としたランダム化比較試験では、マインドフルネス瞑想のプログラムが睡眠の質(ピッツバーグ睡眠質問票)を有意に改善したことが報告されています(JAMA Internal Medicine, 2015／文献11)。
              </Body>
            </div>

            {/* 入浴 */}
            <div>
              <h4 className="text-[1.05rem] font-semibold tracking-[0.01em] text-white">
                入浴
              </h4>
              <Body>
                就寝の1〜2時間前に40〜42.5℃程度のお湯に10分以上入ることが、入眠までの時間の短縮と主観的な睡眠の質・睡眠効率の改善に関連することが、17研究を対象としたシステマティックレビューとメタ分析で示されています(文献5)。メカニズムは、入浴でいったん体を温めることで、その後の放熱により深部体温の低下がスムーズになり、体温リズムが「眠りに向かう流れ」に乗るためと考えられています。
              </Body>
              <p className="mt-5 text-[0.86rem] leading-[1.9] text-white/55">
                ※ 当研究所代表 若林貴久は、温泉療法・入浴研究の第一人者である早坂信哉教授(東京都市大学)との共著『かんたんお風呂ヨガ』において、入浴とヨガを組み合わせた実践法を提案しています。
              </p>
            </div>

            {/* 光と生活リズム */}
            <div>
              <h4 className="text-[1.05rem] font-semibold tracking-[0.01em] text-white">
                光と生活リズム
              </h4>
              <Body>
                朝の光を浴びることは体内時計をリセットし、夜間の光(特にブルーライト)はメラトニン分泌を抑制して入眠を遅らせることが実験研究で示されています(文献12)。Method の「昼の実践」が光と活動のリズムづくりを重視するのはこのためです。
              </Body>
            </div>
          </div>
        </section>

        <Divider />

        {/* Q&A */}
        <section>
          <SectionHeading kicker="Q&A" title="認定講師のための Q&A" />
          <Body>クライアントや導入企業から質問を受けた際の回答例です。</Body>
          <div className="mt-8 space-y-5">
            {QA.map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              >
                <p className="text-[0.98rem] font-semibold leading-[1.7] text-white">
                  {item.q}
                </p>
                <p className="mt-3 text-[0.92rem] leading-[1.95] text-white/74">
                  <span className="font-semibold" style={{ color: GOLD }}>
                    A.{" "}
                  </span>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* 免責事項 */}
        <section>
          <SectionHeading kicker="Disclaimer" title="免責事項" />
          <ul className="mt-7 space-y-4">
            {DISCLAIMERS.map((d) => (
              <li
                key={d}
                className="flex gap-3 text-[0.92rem] leading-[1.95] text-white/72"
              >
                <span
                  aria-hidden
                  className="mt-[0.7em] h-[5px] w-[5px] flex-none rounded-full"
                  style={{ background: "rgba(216,179,106,0.7)" }}
                />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>

        <Divider />

        {/* 参考文献 */}
        <section>
          <SectionHeading kicker="References" title="参考文献" />
          <ol className="mt-7 space-y-4">
            {REFERENCES.map((ref, i) => (
              <li
                key={ref}
                className="grid grid-cols-[1.9rem_1fr] gap-2 text-[0.86rem] leading-[1.8] text-white/70"
              >
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: GOLD }}
                >
                  {i + 1}.
                </span>
                <span className="break-words">{ref}</span>
              </li>
            ))}
          </ol>

          <p className="mt-12 text-[12px] tracking-[0.06em] text-white/45">
            最終更新：2026年8月 ／ Sleep Wellness Institute Japan
          </p>
        </section>

        {/* 戻る導線 */}
        <div className="mt-16 mb-4 text-center">
          <Link
            href={HOME_TOP_HREF}
            className="inline-flex items-center gap-2 text-[0.85rem] tracking-[0.06em] transition hover:opacity-80"
            style={{ color: GOLD }}
          >
            <span aria-hidden>←</span>
            トップへ戻る
          </Link>
        </div>
      </article>

      <Footer />
    </main>
  );
}
