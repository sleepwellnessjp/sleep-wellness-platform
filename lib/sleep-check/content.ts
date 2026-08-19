export const SLEEP_CHECK_IMAGE_BASE =
  "https://cqfclbyzdmxfgktkbbsz.supabase.co/storage/v1/object/public/sleep-content-images";

export const SLEEP_CHECK_IMAGES = {
  gussuri: `${SLEEP_CHECK_IMAGE_BASE}/neko-gussuri-v2.png`,
  relax: `${SLEEP_CHECK_IMAGE_BASE}/neko-relax-v2.png`,
  tsujo: `${SLEEP_CHECK_IMAGE_BASE}/neko-tsujo-v2.png`,
  otsukare: `${SLEEP_CHECK_IMAGE_BASE}/neko-otsukare-v2.png`,
  ouen: `${SLEEP_CHECK_IMAGE_BASE}/neko-ouen-v2.png`,
} as const;

export const SLEEP_CHECK_PREAMBLE =
  "過去1か月間で、週3回以上あてはまるものを選んでください";

export const SLEEP_CHECK_MEDICAL_LIST_URL = "https://jssr.jp/list";

export type SleepCheckOption = {
  label: string;
  score: 0 | 1 | 2 | 3;
};

export type SleepCheckQuestion = {
  id: number;
  title: string;
  options: SleepCheckOption[];
  speech: string;
  nekoSrc: string;
};

export const SLEEP_CHECK_QUESTIONS: SleepCheckQuestion[] = [
  {
    id: 1,
    title: "寝つき（布団に入ってから眠るまで）",
    speech: "いっしょに見ていこうね",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "いつも寝つきはよい", score: 0 },
      { label: "少し時間がかかった", score: 1 },
      { label: "かなり時間がかかった", score: 2 },
      {
        label: "非常に時間がかかった、あるいはまったく眠れなかった",
        score: 3,
      },
    ],
  },
  {
    id: 2,
    title: "夜中に目が覚める",
    speech: "ふむふむ",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "問題になるほどのことはなかった", score: 0 },
      { label: "少し困ることがあった", score: 1 },
      { label: "かなり困っている", score: 2 },
      {
        label: "深刻な状態、あるいはまったく眠れなかった",
        score: 3,
      },
    ],
  },
  {
    id: 3,
    title: "希望より早く目が覚める",
    speech: "そっか",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "そのようなことはなかった", score: 0 },
      { label: "少し早かった", score: 1 },
      { label: "かなり早かった", score: 2 },
      {
        label: "非常に早かった、あるいはまったく眠れなかった",
        score: 3,
      },
    ],
  },
  {
    id: 4,
    title: "睡眠時間",
    speech: "あと半分だよ",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "足りている", score: 0 },
      { label: "少し足りない", score: 1 },
      { label: "かなり足りない", score: 2 },
      {
        label: "まったく足りない、あるいはまったく眠れなかった",
        score: 3,
      },
    ],
  },
  {
    id: 5,
    title: "睡眠の質（眠りの深さなど）",
    speech: "よく答えてくれてるね",
    nekoSrc: SLEEP_CHECK_IMAGES.ouen,
    options: [
      { label: "満足している", score: 0 },
      { label: "少し不満", score: 1 },
      { label: "かなり不満", score: 2 },
      {
        label: "非常に不満、あるいはまったく眠れなかった",
        score: 3,
      },
    ],
  },
  {
    id: 6,
    title: "日中の気分",
    speech: "もうすこし",
    nekoSrc: SLEEP_CHECK_IMAGES.ouen,
    options: [
      { label: "いつもどおり", score: 0 },
      { label: "少し滅入った", score: 1 },
      { label: "かなり滅入った", score: 2 },
      { label: "非常に滅入った", score: 3 },
    ],
  },
  {
    id: 7,
    title: "日中の活動（身体的・精神的）",
    speech: "あとふたつ",
    nekoSrc: SLEEP_CHECK_IMAGES.ouen,
    options: [
      { label: "いつもどおり", score: 0 },
      { label: "少し低下した", score: 1 },
      { label: "かなり低下した", score: 2 },
      { label: "非常に低下した", score: 3 },
    ],
  },
  {
    id: 8,
    title: "日中の眠気",
    speech: "さいごの質問だよ",
    nekoSrc: SLEEP_CHECK_IMAGES.ouen,
    options: [
      { label: "まったくなかった", score: 0 },
      { label: "少しあった", score: 1 },
      { label: "かなりあった", score: 2 },
      { label: "激しかった", score: 3 },
    ],
  },
];

export type SleepCheckResultBand = {
  min: number;
  max: number;
  heading: string;
  message: string;
  nekoSrc: string;
  showMedical: boolean;
};

export const SLEEP_CHECK_RESULTS: SleepCheckResultBand[] = [
  {
    min: 0,
    max: 3,
    heading: "よく眠れているみたい",
    message:
      "いまの眠りは整っているようです。この調子で、いまの習慣を大切にしてくださいね。",
    nekoSrc: SLEEP_CHECK_IMAGES.gussuri,
    showMedical: false,
  },
  {
    min: 4,
    max: 5,
    heading: "おおむね良好",
    message:
      "大きな問題はなさそうです。もう少し整えられる余地はあるかもしれません。気になることがあれば、少し見直してみるのもいいですね。",
    nekoSrc: SLEEP_CHECK_IMAGES.relax,
    showMedical: false,
  },
  {
    min: 6,
    max: 9,
    heading: "少し乱れているかも",
    message:
      "眠りが少しゆらいでいるようです。気づけたことが第一歩。できることから、ひとつずつ整えていきましょう。",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    showMedical: false,
  },
  {
    min: 10,
    max: 14,
    heading: "おつかれさま",
    message:
      "かなり眠りが乱れているようですね。ここまでよく頑張ってきたと思います。ひとりで抱えこまなくて大丈夫。手を借りるという方法もあります。",
    nekoSrc: SLEEP_CHECK_IMAGES.otsukare,
    showMedical: true,
  },
  {
    min: 15,
    max: 24,
    heading: "しんどいですね",
    message:
      "眠れない状態が続いているようです。それはとてもつらいことだと思います。専門家を頼っていい状態です。まずは誰かに話してみませんか。",
    nekoSrc: SLEEP_CHECK_IMAGES.otsukare,
    showMedical: true,
  },
];

export function resultForScore(score: number): SleepCheckResultBand {
  const band = SLEEP_CHECK_RESULTS.find(
    (item) => score >= item.min && score <= item.max,
  );
  return band ?? SLEEP_CHECK_RESULTS[SLEEP_CHECK_RESULTS.length - 1]!;
}
