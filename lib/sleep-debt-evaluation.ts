/**
 * 睡眠負債（SOXAI 由来）の表示評価。
 * 値そのものは変更せず、符号を保った星・文言のみを返す。
 * wellness 用の数値スコアは別途 abs ベースを維持すること。
 *
 * マイナス（早く就寝する余地）: ★は出さずラベルのみ（案A）。
 * プラス／0: 現行どおり★＋ラベル。
 */

export type MetricStars = 1 | 2 | 3 | 4 | 5;

export type SleepDebtDirection = "negative" | "positive" | "zero";

export type SleepDebtDisplayEvaluation = {
  signedMinutes: number;
  absMinutes: number;
  direction: SleepDebtDirection;
  /**
   * 表示用の星。マイナス時は null（★非表示）。
   * ラベル選定用のバンドは bandStars。
   */
  stars: MetricStars | null;
  /** ラベル選定・note 用の絶対値バンド（表示の有無とは独立） */
  bandStars: MetricStars;
  /** 画面／PDF の短い評価ラベル */
  label: string;
};

/** 表示用の絶対値バンド（report-metric-guide の現行刻み） */
const DISPLAY_BANDS: ReadonlyArray<{ maxAbs: number; stars: MetricStars }> = [
  { maxAbs: 15, stars: 5 },
  { maxAbs: 45, stars: 4 },
  { maxAbs: 90, stars: 3 },
  { maxAbs: 150, stars: 2 },
  { maxAbs: Number.POSITIVE_INFINITY, stars: 1 },
];

/** プラス（負債が積み上がっている）— 現行文言を維持 */
const POSITIVE_LABELS: Record<MetricStars, string> = {
  5: "とても良い",
  4: "良い",
  3: "普通",
  2: "やや多い",
  1: "要改善",
};

/**
 * マイナス（早く就寝する余地）— 案 A
 * ★は出さないが、ラベル選定には同じ刻みを使う。
 */
const NEGATIVE_LABELS: Record<MetricStars, string> = {
  5: "とても良い",
  4: "余裕あり",
  3: "前倒し余地",
  2: "早め就寝の余地",
  1: "大きく前倒し可",
};

function starsFromAbs(absMinutes: number): MetricStars {
  for (const band of DISPLAY_BANDS) {
    if (absMinutes <= band.maxAbs) return band.stars;
  }
  return 1;
}

/**
 * 符号付き分から表示用の星・文言を返す。
 * @param signedMinutes parseDurationMinutes の結果（符号保持）
 */
export function evaluateSleepDebtDisplay(
  signedMinutes: number,
): SleepDebtDisplayEvaluation | null {
  if (!Number.isFinite(signedMinutes)) return null;

  const absMinutes = Math.abs(signedMinutes);
  const bandStars = starsFromAbs(absMinutes);

  let direction: SleepDebtDirection;
  if (signedMinutes < 0) direction = "negative";
  else if (signedMinutes > 0) direction = "positive";
  else direction = "zero";

  const label =
    direction === "negative"
      ? NEGATIVE_LABELS[bandStars]
      : POSITIVE_LABELS[bandStars];

  return {
    signedMinutes,
    absMinutes,
    direction,
    // マイナスは★非表示（誤解防止）。プラス／0 は従来どおり
    stars: direction === "negative" ? null : bandStars,
    bandStars,
    label,
  };
}

/**
 * AI 分析アイテム用の短い note（スコア計算とは独立）。
 * プラス側は従来調、マイナス側は案 A に合わせた説明。
 */
export function sleepDebtAnalysisNote(
  evaluation: SleepDebtDisplayEvaluation,
): string {
  if (evaluation.direction === "negative") {
    switch (evaluation.bandStars) {
      case 5:
        return "睡眠負債は小さいです";
      case 4:
        return "早めに就寝する余地が少しあります";
      case 3:
        return "早めに就寝する余地があります";
      case 2:
        return "それだけ早く就寝する余地があります";
      case 1:
        return "大きく前倒しして就寝する余地があります";
    }
  }

  // positive / zero — 従来に近い表現
  switch (evaluation.bandStars) {
    case 5:
      return "睡眠負債は小さいです";
    case 4:
      return "睡眠負債は軽度です";
    case 3:
      return "睡眠負債がややあります。回復夜の確保が有効です";
    case 2:
      return "睡眠負債がややあります。回復夜の確保が有効です";
    case 1:
      return "睡眠負債が大きめです。総睡眠の底上げを優先します";
  }
}
