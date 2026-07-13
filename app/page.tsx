import Image from "next/image";
const loopSteps = [
  { number: "01", title: "測る", english: "MEASURE", text: "SOXAIなどのウェアラブルデータを活用し、睡眠時間・睡眠ステージ・心拍・HRV・ストレスなどを可視化します。" },
  { number: "02", title: "理解する", english: "UNDERSTAND", text: "睡眠データと前日の生活習慣を組み合わせ、その日の睡眠に影響した可能性のある要因を整理します。" },
  { number: "03", title: "整える", english: "PRACTICE", text: "メラトニンヨガ™、呼吸、瞑想、入浴、食事などから、その人に合った実践方法を提案します。" },
  { number: "04", title: "続ける", english: "IMPROVE", text: "日々の変化を振り返りながら、自分に合った睡眠習慣を少しずつ育てていきます。" },
];

const analysisSteps = [
  { label: "01", title: "データを記録", text: "睡眠スコア、睡眠時間、HRV、心拍などを記録します。" },
  { label: "02", title: "生活を振り返る", text: "食事、飲酒、入浴、運動、体調などを入力します。" },
  { label: "03", title: "統合して分析", text: "複数の要因を組み合わせて睡眠との関係を整理します。" },
  { label: "04", title: "今日を整える", text: "一度に多くを変えず、優先する行動を提案します。" },
];

const educationItems = [
  "睡眠の基礎知識",
  "自律神経と呼吸",
  "メラトニンヨガ™",
  "SOXAIデータの読み方",
  "生活ログと分析",
  "指導・レポート作成",
];

const programItems = [
  {
    title: "メラトニンヨガ™",
    image: "/メラトニンヨガ指導.JPG",
    alt: "メラトニンヨガ指導",
    description: "呼吸・動き・間・瞑想を組み合わせ、夜の休息へ導く睡眠ウェルネスプログラム。",
  },
  {
    title: "睡眠ウェルネス分析",
    image: "/睡眠分析.JPG",
    alt: "睡眠ウェルネス分析",
    description: "睡眠データと前日の行動を照合し、改善につながるポイントを分かりやすく整理します。",
  },
  {
    title: "Sleep Wellness Retreat™",
    image: "/リトリート.JPG",
    alt: "Sleep Wellness Retreat",
    description: "自然環境、ヨガ、食事、入浴、睡眠データを組み合わせ、滞在前後の変化を可視化するリトリートプログラムです。",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#17212b]">
      <header className="fixed left-0 top-0 z-50 w-full border-b border-black/5 bg-[#f4f1ea]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a href="#" className="block">
  <Image
    src="/swij1.PNG"
    alt="Sleep Wellness Institute Japan"
    width={180}
    height={100}
    priority
    className="h-auto w-[150px] object-contain"
  />
</a>  

          <nav className="hidden items-center gap-8 text-sm text-[#17212b]/65 md:flex">
            <a className="transition hover:text-[#17212b]" href="#about">About</a>
            <a className="transition hover:text-[#17212b]" href="#method">Method</a>
            <a className="transition hover:text-[#17212b]" href="#analysis">Analysis</a>
            <a className="transition hover:text-[#17212b]" href="#programs">Programs</a>
            <a className="transition hover:text-[#17212b]" href="#contact">Contact</a>
          </nav>

          <a href="#contact" className="rounded-full border border-[#17212b]/20 px-5 py-3 text-xs font-medium tracking-[0.08em] transition hover:bg-[#17212b] hover:text-white">
            お問い合わせ
          </a>
        </div>
      </header>

      <section className="relative flex min-h-screen items-center overflow-hidden px-6 pb-16 pt-32 lg:px-10">
        <div className="absolute -right-32 top-20 h-[430px] w-[430px] rounded-full bg-[#c8a96a]/20 blur-3xl" />
        <div className="absolute -left-36 bottom-0 h-[400px] w-[400px] rounded-full bg-[#8ca89a]/25 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-8 text-xs font-semibold tracking-[0.36em] text-[#9b7a43]">JAPAN-BORN SLEEP WELLNESS</p>
            <h1 className="max-w-5xl text-[clamp(3rem,7vw,6.8rem)] font-medium leading-[1.05] tracking-[-0.055em]">
              睡眠を、<br />感覚ではなく<br /><span className="text-[#9b7a43]">データで改善する。</span>
            </h1>
            <p className="mt-10 max-w-3xl text-base leading-8 text-[#17212b]/68 md:text-lg md:leading-9">
              Sleep Wellness Platformは、睡眠データ、生活習慣、ヨガ・呼吸・瞑想を統合し、一人ひとりが自分の睡眠を理解し、自分自身で整えていくためのプラットフォームです。
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a href="#about" className="inline-flex items-center justify-center rounded-full bg-[#17212b] px-7 py-4 text-sm font-medium text-white transition hover:opacity-85">
                Sleep Wellnessを知る <span className="ml-3">→</span>
              </a>
              <a href="#contact" className="inline-flex items-center justify-center rounded-full border border-[#17212b]/20 px-7 py-4 text-sm font-medium transition hover:bg-white/70">
                企業・施設向け相談
              </a>
            </div>
          </div>

          <div className="relative mx-auto flex h-[420px] w-full max-w-[420px] items-center justify-center lg:h-[560px] lg:max-w-[520px]">
            <div className="absolute h-[88%] w-[88%] rounded-full border border-[#17212b]/10" />
            <div className="absolute h-[68%] w-[68%] rounded-full border border-[#17212b]/10" />
            <div className="absolute h-[48%] w-[48%] rounded-full border border-[#17212b]/10" />
            <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[#17212b] text-center text-white shadow-2xl shadow-[#17212b]/20 md:h-52 md:w-52">
              <div>
                <p className="text-[10px] tracking-[0.32em] text-white/55">SLEEP WELLNESS</p>
                <p className="mt-4 text-2xl font-light tracking-[0.08em]">測る<br />理解する<br />整える</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="border-t border-black/5 bg-[#17212b] px-6 py-28 text-white lg:px-10 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.36em] text-[#c8a96a]">ABOUT</p>
            <h2 className="mt-6 text-4xl font-medium tracking-[-0.04em] md:text-5xl">睡眠ウェルネスとは</h2>
          </div>
          <div>
            <p className="text-2xl font-light leading-[1.75] tracking-[-0.02em] text-white/92 md:text-3xl">
              睡眠を単独で捉えるのではなく、運動、呼吸、食事、入浴、ストレス、生活環境まで含めて、24時間の暮らし全体から整える。
            </p>
            <div className="mt-12 grid gap-8 border-t border-white/10 pt-10 md:grid-cols-2">
              <p className="leading-8 text-white/60">睡眠は、身体の回復だけでなく、心の安定、美容、集中力、仕事のパフォーマンス、健康寿命を支える土台です。</p>
              <p className="leading-8 text-white/60">私たちは、感覚とデータの両方を大切にしながら、一人ひとりが自分に合った整え方を見つけられる社会を目指します。</p>
            </div>
          </div>
        </div>
      </section>

      <section id="method" className="px-6 py-28 lg:px-10 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold tracking-[0.36em] text-[#9b7a43]">SLEEP WELLNESS LOOP</p>
            <h2 className="mt-6 text-4xl font-medium tracking-[-0.045em] md:text-6xl">昨日を理解し、<br />今日を整える。</h2>
            <p className="mt-8 max-w-3xl text-lg leading-9 text-[#17212b]/65">分析だけで終わらず、今日できる実践へつなげる。そして翌日、もう一度測る。その小さな循環が、睡眠と暮らしを少しずつ変えていきます。</p>
          </div>

          <div className="mt-20 grid border-l border-t border-[#17212b]/10 md:grid-cols-2 lg:grid-cols-4">
            {loopSteps.map((step) => (
              <article key={step.number} className="min-h-[330px] border-b border-r border-[#17212b]/10 p-8 lg:p-9">
                <div className="flex items-start justify-between">
                  <span className="text-sm text-[#17212b]/35">{step.number}</span>
                  <span className="text-[10px] font-semibold tracking-[0.25em] text-[#9b7a43]">{step.english}</span>
                </div>
                <h3 className="mt-20 text-3xl font-medium tracking-[-0.03em]">{step.title}</h3>
                <p className="mt-6 text-sm leading-7 text-[#17212b]/62">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#17212b]/10 bg-[#ebe6dc] px-6 py-28 lg:px-10 lg:py-36">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div className="relative min-h-[480px] overflow-hidden rounded-[2rem] bg-[#cfc6b5]">
            <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full border border-[#17212b]/10" />
            <div className="absolute -left-4 -top-4 h-64 w-64 rounded-full border border-[#17212b]/10" />
            <div className="absolute right-[-80px] top-28 h-72 w-72 rounded-full bg-[#8ca89a]/35 blur-2xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-60 w-60 items-center justify-center rounded-full bg-[#17212b] text-center text-white shadow-2xl">
                <div>
                  <p className="text-[10px] tracking-[0.3em] text-white/50">MELATONIN YOGA™</p>
                  <p className="mt-5 text-3xl font-light leading-relaxed">動き<br />呼吸<br />間</p>
                </div>
              </div>
            </div>
            <p className="absolute bottom-8 left-8 text-xs tracking-[0.22em] text-[#17212b]/45">DESIGNED FOR SLEEP</p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.36em] text-[#9b7a43]">MELATONIN YOGA™</p>
            <h2 className="mt-6 text-4xl font-medium tracking-[-0.045em] md:text-6xl">眠るための身体と、<br />神経を整える。</h2>
            <p className="mt-8 text-lg leading-9 text-[#17212b]/68">メラトニンヨガ™は、睡眠のために設計されたヨガメソッドです。動き、呼吸、静かな「間」、瞑想、サウンドバスを組み合わせ、日中の活動状態から眠りへ向かう準備を整えます。</p>
            <p className="mt-6 leading-8 text-[#17212b]/58">Sleep Wellness Platformでは、実践した日の睡眠データを記録し、感覚だけでは分からない変化を確認していきます。</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {["ヨガ", "呼吸・瞑想", "サウンドバス"].map((item) => (
                <div key={item} className="rounded-2xl border border-[#17212b]/10 bg-white/45 px-5 py-6 text-center text-sm">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="analysis" className="bg-[#17212b] px-6 py-28 text-white lg:px-10 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-semibold tracking-[0.36em] text-[#c8a96a]">SLEEP ANALYSIS</p>
              <h2 className="mt-6 text-4xl font-medium tracking-[-0.045em] md:text-6xl">睡眠データから、<br />24時間を読み解く。</h2>
            </div>
            <div>
              <p className="text-xl font-light leading-10 text-white/80 md:text-2xl">睡眠スコアだけではなく、食事、飲酒、運動、入浴、ストレス、体調、ヨガの実践まで統合して分析します。</p>
              <p className="mt-8 leading-8 text-white/55">SOXAIのスクリーンショットと前日の生活記録を入力すると、Sleep Wellness Platformが睡眠に影響した可能性を整理し、今日できる具体的な行動を提案します。</p>
            </div>
          </div>

          <div className="mt-20 grid gap-px overflow-hidden rounded-[2rem] bg-white/10 md:grid-cols-2 lg:grid-cols-4">
            {analysisSteps.map((item) => (
              <article key={item.label} className="min-h-[290px] bg-[#1d2935] p-8">
                <span className="text-sm text-[#c8a96a]">{item.label}</span>
                <h3 className="mt-16 text-2xl font-medium">{item.title}</h3>
                <p className="mt-5 text-sm leading-7 text-white/50">{item.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-16 rounded-[2rem] border border-white/10 p-8 md:p-12">
            <div className="grid gap-12 md:grid-cols-3">
              <div><p className="text-xs tracking-[0.28em] text-white/35">INPUT</p><p className="mt-4 text-xl">SOXAIデータ</p></div>
              <div><p className="text-xs tracking-[0.28em] text-white/35">ANALYSIS</p><p className="mt-4 text-xl">生活習慣との関係</p></div>
              <div><p className="text-xs tracking-[0.28em] text-white/35">OUTPUT</p><p className="mt-4 text-xl">Sleep Wellness Report</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="programs" className="px-6 py-28 lg:px-10 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold tracking-[0.36em] text-[#9b7a43]">PROGRAMS</p>
            <h2 className="mt-6 text-4xl font-medium tracking-[-0.045em] md:text-6xl">個人の睡眠から、<br />社会のウェルネスへ。</h2>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-2">
            {programItems.map((program, index) => (
              <article key={program.title} className="overflow-hidden rounded-[2rem] border border-[#17212b]/10 bg-[#f4f1ea]">
                <div className="relative h-[280px] w-full md:h-[320px]">
                  <Image
                    src={program.image}
                    alt={program.alt}
                    fill
                    priority={index === 0}
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <div className="p-8 md:p-10">
                  <h3 className="text-2xl font-medium tracking-[-0.04em] md:text-3xl">{program.title}</h3>
                  <p className="mt-6 text-base leading-8 text-[#17212b]/65 md:text-lg md:leading-9">{program.description}</p>
                </div>
              </article>
            ))}

            <article className="relative min-h-[560px] overflow-hidden rounded-[2rem] bg-[#d8d0bf] p-8 md:p-12">
              <div className="absolute right-[-80px] top-12 h-64 w-64 rounded-full bg-[#c8a96a]/35 blur-2xl" />
              <div className="relative flex h-full flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.3em] text-[#765d34]">ENTERPRISE & GOVERNMENT</p>
                  <h3 className="mt-7 text-4xl font-medium tracking-[-0.04em] md:text-5xl">健康経営を、<br />睡眠から支える。</h3>
                </div>
                <p className="mt-40 max-w-xl text-lg leading-9 text-[#17212b]/65">企業研修、実証実験、社員向けプログラム、自治体イベントを通して、睡眠・ストレス・回復を支援します。</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#ebe6dc] px-6 py-28 lg:px-10 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.36em] text-[#9b7a43]">EDUCATION</p>
            <h2 className="mt-6 text-4xl font-medium tracking-[-0.045em] md:text-6xl">睡眠ウェルネスを、<br />伝えられる人を育てる。</h2>
            <p className="mt-8 leading-8 text-[#17212b]/62">メラトニンヨガ™養成講座では、睡眠・自律神経・呼吸・ヨガ・データ分析を統合して学びます。</p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[2rem] bg-[#17212b]/10 sm:grid-cols-2">
            {educationItems.map((item, index) => (
              <div key={item} className="bg-[#f4f1ea] p-8">
                <span className="text-xs text-[#9b7a43]">{String(index + 1).padStart(2, "0")}</span>
                <p className="mt-8 text-xl font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-28 lg:px-10 lg:py-36">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-[#17212b]/10 p-8 md:p-14">
          <div className="grid gap-14 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.36em] text-[#9b7a43]">RESEARCH</p>
              <h2 className="mt-6 text-4xl font-medium tracking-[-0.045em] md:text-5xl">実証とデータを、<br />次の社会実装へ。</h2>
            </div>
            <div>
              <p className="text-lg leading-9 text-[#17212b]/65">リトリート、養成講座、企業プログラムで得られたデータを蓄積し、睡眠ウェルネスの価値を検証していきます。</p>
              <p className="mt-6 leading-8 text-[#17212b]/55">確立された知見、私たちの実証で観察された傾向、今後検証する仮説を分けて整理し、信頼できる睡眠ウェルネスの基盤を育てます。</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="px-6 pb-12 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-[#d8d0bf] px-8 py-16 md:px-14 md:py-20">
          <p className="text-xs font-semibold tracking-[0.36em] text-[#765d34]">CONTACT</p>
          <div className="mt-6 flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-4xl font-medium tracking-[-0.04em] md:text-6xl">睡眠ウェルネスを、<br />日本から世界へ。</h2>
              <p className="mt-7 max-w-2xl leading-8 text-[#17212b]/65">企業導入、リトリート、メラトニンヨガ™養成講座、実証実験についてご相談ください。</p>
            </div>
            <a href="mailto:studio_terrace@yahoo.co.jp" className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#17212b] px-8 py-4 text-sm font-medium text-white transition hover:opacity-85">
              お問い合わせ <span className="ml-3">→</span>
            </a>
          </div>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-xs tracking-[0.18em] text-[#17212b]/40">
        © SLEEP WELLNESS PLATFORM
      </footer>
    </main>
  );
}