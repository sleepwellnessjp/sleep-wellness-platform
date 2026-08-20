import { SLEEP_CHECK_IMAGES } from "@/lib/sleep-check/content";

export const DAYTIME_PREAMBLE =
  "この1か月、日中にどれくらい眠気を感じたか教えてください";

export type DaytimeOption = {
  label: string;
  score: 0 | 1 | 2 | 3 | null;
};

export type DaytimeQuestion = {
  id: number;
  title: string;
  options: DaytimeOption[];
  speech: string;
  nekoSrc: string;
};

export const DAYTIME_QUESTIONS: DaytimeQuestion[] = [
  {
    id: 1,
    title: "午後のデスクワーク中",
    speech: "いっしょに見ていこうね",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "眠くならない", score: 0 },
      { label: "たまに眠い", score: 1 },
      { label: "よく眠くなる", score: 2 },
      { label: "こらえるのが難しい", score: 3 },
    ],
  },
  {
    id: 2,
    title: "電車やバスに座っているとき",
    speech: "ふむふむ",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "眠くならない", score: 0 },
      { label: "たまにうとうとする", score: 1 },
      { label: "よく寝てしまう", score: 2 },
      { label: "ほぼ毎回寝てしまう", score: 3 },
    ],
  },
  {
    id: 3,
    title: "昼食のあと",
    speech: "そっか",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "いつも通り過ごせる", score: 0 },
      { label: "少しぼんやりする", score: 1 },
      { label: "強い眠気がくる", score: 2 },
      { label: "横になりたくなる", score: 3 },
    ],
  },
  {
    id: 4,
    title: "会議や打ち合わせの最中",
    speech: "あと半分だよ",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "眠くならない", score: 0 },
      { label: "たまに眠気を感じる", score: 1 },
      { label: "こらえていることがある", score: 2 },
      { label: "意識が飛ぶことがある", score: 3 },
    ],
  },
  {
    id: 5,
    title: "テレビや動画を見ているとき",
    speech: "よく答えてくれてるね",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "最後まで見られる", score: 0 },
      { label: "たまに寝落ちする", score: 1 },
      { label: "よく寝落ちする", score: 2 },
      { label: "ほぼ毎回寝落ちする", score: 3 },
    ],
  },
  {
    id: 6,
    title: "人と話しているとき",
    speech: "もうすこし",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "眠くならない", score: 0 },
      { label: "まれに眠い", score: 1 },
      { label: "ときどき眠い", score: 2 },
      { label: "会話中に眠くなる", score: 3 },
    ],
  },
  {
    id: 7,
    title: "車を運転しているとき",
    speech: "あとふたつ",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "眠くならない", score: 0 },
      { label: "たまに眠気を感じる", score: 1 },
      { label: "窓を開けるなどの対処が必要", score: 2 },
      { label: "危ないと感じたことがある", score: 3 },
      { label: "あてはまらない", score: null },
    ],
  },
  {
    id: 8,
    title: "何もしていない静かな時間",
    speech: "さいごの質問だよ",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "眠くならない", score: 0 },
      { label: "たまにうとうとする", score: 1 },
      { label: "よくうとうとする", score: 2 },
      { label: "気づくと寝ている", score: 3 },
    ],
  },
];

export function calcDaytimeScore(
  answers: Array<0 | 1 | 2 | 3 | null>,
): number {
  const valid = answers.filter((value): value is 0 | 1 | 2 | 3 => value !== null);
  if (valid.length === 0) return 0;

  const sum = valid.reduce<number>((acc, value) => acc + value, 0);
  const average = sum / valid.length;
  // 0-3 の平均を 24 点満点に換算（3 * 8 = 24）
  return Math.round((average / 3) * 24);
}
