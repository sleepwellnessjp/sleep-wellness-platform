/**
 * 「睡眠のための言葉」格言データ。
 *
 * 追加するときはこの配列にオブジェクトを足すだけでよい。
 * ※ 綿本哲氏の言葉は、確認済みのものだけを登録すること（創作しない）。
 */

export type SleepWordQuote = {
  /** 安定した ID（URL や分析用） */
  id: string;
  /** 格言本文（「」は付けない） */
  text: string;
  /** 著者表示名 */
  author: string;
  /** 出典ラベル（任意） */
  source?: string;
};

export const SLEEP_WORD_QUOTES: readonly SleepWordQuote[] = [
  {
    id: "kuu-erabu-basho",
    text: "空とは、選ぶことができる場所のことである。",
    author: "綿本哲",
    source: "間の書",
  },
  {
    id: "ma-omoidasu",
    text: "間は、つくるものではない。思い出すものである。",
    author: "綿本哲",
    source: "間の書",
  },
] as const;

export function getSleepWordQuoteById(
  id: string,
): SleepWordQuote | undefined {
  return SLEEP_WORD_QUOTES.find((q) => q.id === id);
}

export function getSleepWordQuoteIndex(id: string): number {
  return SLEEP_WORD_QUOTES.findIndex((q) => q.id === id);
}
