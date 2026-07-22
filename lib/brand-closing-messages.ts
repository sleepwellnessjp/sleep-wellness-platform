/**
 * Sleep Wellness Institute Japan ブランドクロージングメッセージ。
 * 分析ごとに文言を少し変えつつ、トーンは統一する。
 */

export type BrandClosingMessage = {
  paragraphs: string[];
};

const BRAND_CLOSING_MESSAGES: BrandClosingMessage[] = [
  {
    paragraphs: [
      "睡眠は\n1日だけで評価するものではありません。",
      "継続的な改善を重ねることで\n身体・心・生活の質は少しずつ変化します。",
      "次回の分析では\n今回との変化を一緒に確認しましょう。",
    ],
  },
  {
    paragraphs: [
      "よい睡眠は\n一夜にして完成するものではありません。",
      "日々の小さな積み重ねが\n回復力とリズムを育んでいきます。",
      "次回は、今回の気づきが\nどのように表れたかを見ていきましょう。",
    ],
  },
  {
    paragraphs: [
      "睡眠の質は\n単一の数値では語りきれません。",
      "生活・環境・心の状態が重なり\nゆっくりと整っていきます。",
      "次回の測定で\n今回からの変化を丁寧に読み解きます。",
    ],
  },
  {
    paragraphs: [
      "今日の結果は\nひとつの通過点です。",
      "無理のない改善を続けることで\n睡眠は着実に育まれていきます。",
      "次回は、今回との違いを\nともに確認していきましょう。",
    ],
  },
  {
    paragraphs: [
      "睡眠は\n短期の結果より、持続する習慣が大切です。",
      "少しずつ整えることで\n身体も心も、静かに回復していきます。",
      "次回の分析で\n変化の兆しを一緒に見つけましょう。",
    ],
  },
  {
    paragraphs: [
      "測定結果は\nいまのコンディションを映す鏡です。",
      "完璧を目指すより\n続けられる一歩を大切にしてください。",
      "次回は、今回の取り組みが\nどう現れたかを確認しましょう。",
    ],
  },
  {
    paragraphs: [
      "睡眠の改善は\n直線ではなく、ゆるやかな曲線です。",
      "日々の選択が積み重なり\nやがて確かな変化となります。",
      "次回のレポートで\n今回からの歩みを振り返りましょう。",
    ],
  },
  {
    paragraphs: [
      "一夜の睡眠は\n長いウェルネスの旅の一場面です。",
      "小さな調整を重ねることで\n生活全体の質が静かに高まっていきます。",
      "次回は、今回との差を\n丁寧に見比べていきましょう。",
    ],
  },
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** 同一分析では同じ文言、分析が変わると別文言になるよう選択する */
export function pickBrandClosingMessage(seed: string): BrandClosingMessage {
  const index = hashSeed(seed || "swij") % BRAND_CLOSING_MESSAGES.length;
  return BRAND_CLOSING_MESSAGES[index]!;
}
