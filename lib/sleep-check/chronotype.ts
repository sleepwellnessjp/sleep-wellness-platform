import { SLEEP_CHECK_IMAGES } from "@/lib/sleep-check/content";

export const CHRONOTYPE_PREAMBLE =
  "予定のない休日を思い浮かべて答えてください";

export type ChronotypeOption = {
  label: string;
  score: 1 | 2 | 3 | 4;
};

export type ChronotypeQuestion = {
  id: number;
  title: string;
  options: ChronotypeOption[];
  speech: string;
  nekoSrc: string;
};

export const CHRONOTYPE_QUESTIONS: ChronotypeQuestion[] = [
  {
    id: 1,
    title: "目覚まし時計がなければ、何時ごろ目が覚めますか",
    speech: "いっしょに見ていこうね",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "6時より前", score: 4 },
      { label: "6〜7時半", score: 3 },
      { label: "7時半〜9時", score: 2 },
      { label: "9時より後", score: 1 },
    ],
  },
  {
    id: 2,
    title: "自然に眠くなるのは何時ごろですか",
    speech: "ふむふむ",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "21時より前", score: 4 },
      { label: "21〜23時", score: 3 },
      { label: "23〜翌1時", score: 2 },
      { label: "1時より後", score: 1 },
    ],
  },
  {
    id: 3,
    title: "朝起きてから、頭がはっきりするまで",
    speech: "そっか",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "すぐにはっきりする", score: 4 },
      { label: "30分ほど", score: 3 },
      { label: "1時間ほど", score: 2 },
      { label: "午前中はぼんやり", score: 1 },
    ],
  },
  {
    id: 4,
    title: "朝食は",
    speech: "あと半分だよ",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "起きてすぐ食べたくなる", score: 4 },
      { label: "1時間以内には食べる", score: 3 },
      { label: "あまり食欲がない", score: 2 },
      { label: "ほとんど食べない", score: 1 },
    ],
  },
  {
    id: 5,
    title: "頭を使う作業がはかどるのは",
    speech: "よく答えてくれてるね",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "午前中", score: 4 },
      { label: "昼過ぎ", score: 3 },
      { label: "夕方", score: 2 },
      { label: "夜", score: 1 },
    ],
  },
  {
    id: 6,
    title: "平日と休日で、起きる時刻の差は",
    speech: "もうすこし",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "ほとんど同じ", score: 4 },
      { label: "1時間以内", score: 3 },
      { label: "1〜2時間", score: 2 },
      { label: "2時間以上", score: 1 },
    ],
  },
  {
    id: 7,
    title: "朝7時に運動をするとしたら",
    speech: "あとふたつ",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "問題なくできそう", score: 4 },
      { label: "なんとかできそう", score: 3 },
      { label: "かなりつらい", score: 2 },
      { label: "とても無理", score: 1 },
    ],
  },
  {
    id: 8,
    title: "夜、眠らずに起きていられるのは",
    speech: "さいごの質問だよ",
    nekoSrc: SLEEP_CHECK_IMAGES.tsujo,
    options: [
      { label: "22時ごろが限界", score: 4 },
      { label: "24時ごろまで", score: 3 },
      { label: "深夜2時ごろまで", score: 2 },
      { label: "明け方まで平気", score: 1 },
    ],
  },
];

export type ChronotypeKind = "morning" | "intermediate" | "evening";

export type ChronotypeJudgement = {
  total: number;
  type: ChronotypeKind;
  socialJetlag: boolean;
};

export function judgeChronotype(
  answers: Array<1 | 2 | 3 | 4>,
): ChronotypeJudgement {
  const total = answers.reduce((sum, score) => sum + score, 0);
  const type: ChronotypeKind =
    total >= 26 ? "morning" : total <= 14 ? "evening" : "intermediate";
  // 設問6（index=5）で「2時間以上」= score 1 の場合 true
  const socialJetlag = answers[5] === 1;

  return { total, type, socialJetlag };
}
