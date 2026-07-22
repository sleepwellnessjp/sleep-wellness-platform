/**
 * 固定プロフィール数値の入力バリデーション
 * 不正値は null（未入力）として扱い、既存 DB 値は上書きしない（保存時のみ適用）
 */

export type NumberRule = {
  min?: number;
  max?: number;
  /** true のとき 0 を許可（デフォルト true） */
  allowZero?: boolean;
};

export const NUMBER_RULES = {
  /** 時間・回数・水分量など 0 以上 */
  nonNegative: { min: 0 } satisfies NumberRule,
  /** 身長・体重など 0 より大きい */
  positive: { min: 0, allowZero: false } satisfies NumberRule,
  /** 湿度 0〜100 */
  humidity: { min: 0, max: 100 } satisfies NumberRule,
  /** 室温などの現実的な温度 */
  temperatureC: { min: -20, max: 60 } satisfies NumberRule,
  /** 年齢 */
  age: { min: 0, max: 130 } satisfies NumberRule,
} as const;

/**
 * 文字列から数値をパース。ルール外・負数・NaN は null。
 * 空文字は null（未入力）。
 */
export function parseOptionalNumber(
  value: string,
  rule: NumberRule = NUMBER_RULES.nonNegative,
): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return sanitizeNumber(n, rule);
}

/**
 * 既存値・計算値を画面・保存前に正規化。
 * 不正値は null（表示は「—」、DB 上書きは呼び出し側で制御）。
 */
export function sanitizeNumber(
  value: number | null | undefined,
  rule: NumberRule = NUMBER_RULES.nonNegative,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;

  const allowZero = rule.allowZero !== false;
  if (value === 0) return allowZero ? 0 : null;

  if (rule.min != null && value < rule.min) return null;
  if (rule.max != null && value > rule.max) return null;

  // 明示ルールが無い場合でも負数は拒否（温度の下限は rule.min で扱う）
  if (rule.min == null && value < 0) return null;

  return value;
}

/** HTML number input 用の min 属性値 */
export function htmlMinForRule(rule: NumberRule): number | undefined {
  if (rule.min != null) return rule.min;
  return 0;
}

/** HTML number input 用の max 属性値 */
export function htmlMaxForRule(rule: NumberRule): number | undefined {
  return rule.max;
}
