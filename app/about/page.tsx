import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import SiteNavMenu from "@/components/site/SiteNavMenu";
import { HOME_TOP_HREF } from "@/lib/home-intro";

export const metadata: Metadata = {
  title: "私たちについて（About Us） | Sleep Wellness Institute Japan",
  description:
    "健幸スタジオ スタジオテラス／ウェルネスアース協会。失われた「間」を取り戻し、休息する力と、選択する力を育てる。私たちのミッション・ビジョン・バリューと3つの実践をご紹介します。",
};

const NAVY = "#071426";
const GOLD = "#d8b36a";
const SERIF =
  '"Hiragino Mincho ProN", "Hiragino Mincho Pro", "Yu Mincho", "YuMincho", "Noto Serif JP", "Shippori Mincho", serif';

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
      <h2 className="mt-4 text-[1.6rem] font-semibold leading-[1.4] tracking-[-0.02em] text-white sm:text-[1.9rem]">
        {title}
      </h2>
    </div>
  );
}

/** 各章のリード（強調の一文） */
function Lead({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-6 text-[1.15rem] font-medium leading-[1.9] tracking-[0.01em] text-white sm:text-[1.28rem]"
      style={{ fontFamily: SERIF }}
    >
      {children}
    </p>
  );
}

/** 本文段落 */
function Body({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 text-[0.98rem] leading-[2.05] tracking-[0.01em] text-white/72 sm:text-[1.02rem]">
      {children}
    </p>
  );
}

/** 細いゴールドの区切り */
function Divider() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto my-16 h-px w-11 sm:my-20"
      style={{ background: "rgba(216,179,106,0.45)" }}
    />
  );
}

const VALUES = [
  {
    no: "1",
    title: "引き算 ― 足すのではなく、引く。",
    body: "俳句が十七音まで削るように、だしを「引く」ように。引くことで余白＝間が生まれ、その間にこそ本質が宿ります。私たちのクラスも、プログラムも、言葉も、いつも引き算から設計します。",
  },
  {
    no: "2",
    title: "中庸 ― がんばらない。ゆるめすぎない。",
    body: "強すぎる実践は神経を覚醒させ、ゆるすぎる実践は変化を生みません。一人ひとりの「ちょうどいい」を尊重し、比べず、競わせず、評価しない場をつくります。",
  },
  {
    no: "3",
    title: "信頼 ― 農夫は水を作らない。",
    body: "農夫は田に水を引くとき、堰を切って妨げを取り除くだけ。水は勝手に流れます。人が本来持っている回復力を信頼し、変えようとするのではなく、自然に起こることを支えます。",
  },
  {
    no: "4",
    title: "誠実 ― 感覚とデータ、どちらも大切に。",
    body: "体感だけに頼らず、科学だけに偏らず。何が裏づけられていて、何がまだわかっていないのかを正直に伝えます。数字は身体との対話を助ける道具であって、目的ではありません。",
  },
  {
    no: "5",
    title: "和 ― 間が、人と人をつなぐ。",
    body: "和とは、隙間を埋める調和ではなく、間が要素と要素をつなぐ調和。依存ではなく自立を支え、同じ空間で呼吸を揃える「場」を通して、人と人、人と社会のあいだを結び直します。",
  },
];

const PRACTICES = [
  {
    method: "ニュートラルヨガ®︎",
    purpose: "「ちょうどいい状態＝中庸」へ導く土台",
    keywords: "がんばらない。ゆるめすぎない。運動・食事・瞑想",
  },
  {
    method: "間のヨガ™（昼）",
    purpose: "日中を豊かに生きる。選択できる自分になる",
    keywords: "刺激→間→選択→行動／創造性・集中力・判断力",
  },
  {
    method: "メラトニンヨガ™（夜）",
    purpose: "眠れる身体を育てる。休息する力を取り戻す",
    keywords: "3対6呼吸・述語制・自律訓練法・空",
  },
];

export default function AboutPage() {
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
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.34em]"
          style={{ color: GOLD }}
        >
          About Us
        </p>
        <h1 className="mt-5 text-[2.1rem] font-semibold leading-[1.25] tracking-[-0.03em] text-white sm:text-[2.9rem]">
          私たちについて
        </h1>
        <p className="mt-5 text-[12.5px] font-medium tracking-[0.14em] text-white/55 sm:text-[13.5px]">
          健幸スタジオ スタジオテラス ／ ウェルネスアース協会
        </p>
      </section>

      {/* 本文 */}
      <article className="mx-auto max-w-[44rem] px-6 pb-4 sm:px-8">
        <Divider />

        {/* 導入 */}
        <p
          className="text-center text-[1.5rem] font-semibold leading-[1.6] tracking-[0.02em] text-white sm:text-[1.9rem]"
          style={{ fontFamily: SERIF }}
        >
          あなたは壊れているのではなくて、
          <br className="hidden sm:block" />
          合っていないだけ。
        </p>
        <p className="mt-6 text-center text-[0.95rem] tracking-[0.04em] text-white/60">
          私たちの活動は、この一文から始まります。
        </p>
        <Body>
          朝から通知が鳴って、返信して、移動して、仕事して。夜、布団に入ってもスマホを見てしまって、翌朝、なんだか疲れが取れていない。多くの人が「自分が弱いからだ」と思っています。けれど、それは故障ではなく、チューニングの問題です。ずれてしまったのは、たった一文字――「間（ま）」。
        </Body>
        <Body>
          刺激と反応のあいだの一呼吸。吸う息と吐く息のあいだの静けさ。人と人のあいだにある信頼。日本語は昔から、この「あいだ」に名前をつけてきました。人間、時間、仲間、世間。私たちは、この日本の知恵を現代のウェルネスとしてもう一度編み直し、身体を通して届けています。
        </Body>

        <Divider />

        {/* 私たちが目指すもの */}
        <section>
          <SectionHeading kicker="Purpose" title="私たちが目指すもの" />
          <Lead>
            一人ひとりが、自分の「ちょうどいい」を見つけられる社会。
          </Lead>
          <Body>
            がんばりすぎでも、ゆるめすぎでもない、その人にとっての中庸。それは意志の強さで手に入れるものではありません。刺激と反応のあいだに「間」という余白が確保されて、はじめて人は選ぶことができます。休むことも、動くことも、自分で選べる。私たちは、その余白を取り戻すお手伝いをしています。
          </Body>
        </section>

        <Divider />

        {/* ミッション */}
        <section>
          <SectionHeading kicker="Mission" title="ミッション ― 私たちの使命" />
          <Lead>
            失われた「間」を取り戻し、休息する力と、選択する力を育てる。
          </Lead>
          <Body>
            現代人は、活動することは得意になりました。しかし、休むことが苦手になっています。身体は疲れているのに眠れない。休んでいるのに回復しない。私たちは、人を眠らせる技術を売るのではなく、休息が自然に起こる環境を整えます。眠りは、手に入れるものではなく、還るもの。日本文化が育ててきた「間」「和」「余白」の知恵と、睡眠科学・自律神経の科学を結び、誰もが実践できるメソッドとして手渡していくことが、私たちの使命です。
          </Body>
        </section>

        <Divider />

        {/* ビジョン */}
        <section>
          <SectionHeading kicker="Vision" title="ビジョン ― 私たちが見ている未来" />
          <Lead>
            眠りと目覚めが調和した、24時間のウェルネスが当たり前になる未来。
          </Lead>
          <Body>
            夜は、メラトニンヨガ™で眠れる身体を育てる。昼は、間のヨガ™で選択できる自分を育てる。眠りは夜の回復装置、間は昼の回復装置。両方が揃ったとき、人は本来のリズムを取り戻します。そしてその先に、「間」という日本人が育んできた感性が、世界のウェルネスの共通語になる未来を見ています。忙しさが価値になった時代だからこそ、休む力の価値を、何もしない時間の豊かさを、日本から世界へ伝えていきます。
          </Body>
        </section>

        <Divider />

        {/* バリュー */}
        <section>
          <SectionHeading
            kicker="Values"
            title="バリュー ― 私たちが大切にする5つのこと"
          />
          <ul className="mt-10 space-y-8">
            {VALUES.map((v) => (
              <li
                key={v.no}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7"
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-[1.4rem] font-semibold leading-none"
                    style={{ color: GOLD, fontFamily: SERIF }}
                  >
                    {v.no}
                  </span>
                  <h3 className="text-[1.02rem] font-semibold leading-[1.6] tracking-[0.01em] text-white sm:text-[1.1rem]">
                    {v.title}
                  </h3>
                </div>
                <p className="mt-3 text-[0.95rem] leading-[2] text-white/72 sm:text-[0.98rem]">
                  {v.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <Divider />

        {/* 3つの実践 */}
        <section>
          <SectionHeading kicker="Practice" title="私たちの3つの実践" />
          <div className="mt-10 space-y-5">
            {PRACTICES.map((p) => (
              <div
                key={p.method}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7"
              >
                <p className="text-[1.05rem] font-semibold tracking-[0.01em] text-white sm:text-[1.15rem]">
                  {p.method}
                </p>
                <dl className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
                    <dt
                      className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: GOLD }}
                    >
                      何のための実践か
                    </dt>
                    <dd className="text-[0.95rem] leading-[1.9] text-white/78">
                      {p.purpose}
                    </dd>
                  </div>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
                    <dt
                      className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: GOLD }}
                    >
                      キーワード
                    </dt>
                    <dd className="text-[0.95rem] leading-[1.9] text-white/78">
                      {p.keywords}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <Body>
            三つの実践は、朝から夜へ、そしてまた朝へと巡る一日の円環でつながっています。ヨガを単なるエクササイズではなく、「人生を整える技術」として。スタジオでのクラスに加え、指導者の養成、企業・行政・地域と連携したウェルネスイベントの企画を通して、この円環を社会へ広げています。
          </Body>
        </section>

        <Divider />

        {/* 結びに */}
        <section>
          <SectionHeading kicker="Closing" title="結びに" />
          <Lead>間は、つくるものではありません。思い出すものです。</Lead>
          <Body>
            味噌汁を冷ますあのフーッという一拍に。返信の前の一呼吸に。音が消えたあとの静けさに。間は、もうあなたの中にあります。私たちは、それを思い出す場所でありたいと思っています。
          </Body>
          <Body>
            さあ、まずは今夜。布団に入ったら、思い切り長いため息を一つ。そこから始めましょう。
          </Body>

          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center sm:p-8">
            <p className="text-[0.98rem] font-semibold tracking-[0.02em] text-white">
              健幸スタジオ スタジオテラス　代表　TAKA（若林貴久）
            </p>
            <p className="mt-2 text-[12.5px] leading-[1.9] tracking-[0.04em] text-white/60">
              E-RYT500／ニュートラルヨガ®︎創始者／ウェルネスアース協会 代表
            </p>
          </div>
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
