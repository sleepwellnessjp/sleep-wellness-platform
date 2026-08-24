/**
 * circadianRhythm / sleepDebt の符号と定性語から、
 * 方向（進み/遅れ・負債/余裕）を断定できないか判定する。
 */

export type DurationDirectionContext = "circadian" | "sleepDebt";

export type DurationDirectionAmbiguity = {
  ambiguous: boolean;
  reason?: "sign_qualitative_conflict" | "no_direction_cue";
};

/** 体内時計：前倒し・進み側の定性語 */
const CIRCADIAN_ADVANCED_PHRASES: readonly string[] = [
  "進み気味",
  "やや進み",
  "進み",
  "前倒し気味",
  "前倒し",
  "朝型",
];

/** 体内時計：遅れ側の定性語 */
const CIRCADIAN_DELAYED_PHRASES: readonly string[] = [
  "遅れ気味",
  "やや遅れ",
  "遅れ",
  "夜型",
  "ディレイ",
];

/** 睡眠負債：プラス（負債）側の定性語 */
const SLEEP_DEBT_POSITIVE_PHRASES: readonly string[] = [
  "負債",
  "不足",
  "積み",
  "多い",
  "多め",
];

/** 睡眠負債：マイナス（前倒し余地）側の定性語 */
const SLEEP_DEBT_NEGATIVE_PHRASES: readonly string[] = [
  "前倒し",
  "進み",
  "余地",
  "早め就寝",
  "早めに",
];

function normalize(raw: string): string {
  return raw.normalize("NFKC").trim();
}

function includesPhrase(text: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

/** 数値リテラル直前の明示マイナス符号 */
function hasExplicitNegativeSign(text: string): boolean {
  return /(?:^|[\s(（])[-−－]\s*\d/.test(text) || /^[-−－]/.test(text);
}

/** 数値リテラル直前の明示プラス符号 */
function hasExplicitPositiveSign(text: string): boolean {
  return /(?:^|[\s(（])[+＋]\s*\d/.test(text) || /^[+＋]/.test(text);
}

function hasCircadianAdvancedQualitative(text: string): boolean {
  if (includesPhrase(text, CIRCADIAN_ADVANCED_PHRASES)) return true;
  if (/朝型|早型|やや早|早め/.test(text)) return true;
  return false;
}

function hasCircadianDelayedQualitative(text: string): boolean {
  if (includesPhrase(text, CIRCADIAN_DELAYED_PHRASES)) return true;
  return /遅/.test(text);
}

function hasSleepDebtPositiveQualitative(text: string): boolean {
  return includesPhrase(text, SLEEP_DEBT_POSITIVE_PHRASES);
}

function hasSleepDebtNegativeQualitative(text: string): boolean {
  return includesPhrase(text, SLEEP_DEBT_NEGATIVE_PHRASES);
}

/**
 * 条件A: 明示符号と定性語の方向が矛盾する
 * 条件B: 明示符号も方向を示す定性語もない
 */
export function isDurationDirectionAmbiguous(
  raw: string | null | undefined,
  context: DurationDirectionContext,
): DurationDirectionAmbiguity {
  const text = normalize(raw ?? "");
  if (!text) return { ambiguous: false };

  const negativeSign = hasExplicitNegativeSign(text);
  const positiveSign = hasExplicitPositiveSign(text);

  if (context === "circadian") {
    const advanced = hasCircadianAdvancedQualitative(text);
    const delayed = hasCircadianDelayedQualitative(text);

    if (negativeSign && advanced) {
      return { ambiguous: true, reason: "sign_qualitative_conflict" };
    }
    if (positiveSign && delayed) {
      return { ambiguous: true, reason: "sign_qualitative_conflict" };
    }
    if (!negativeSign && !positiveSign && !advanced && !delayed) {
      return { ambiguous: true, reason: "no_direction_cue" };
    }
    return { ambiguous: false };
  }

  const debtPositive = hasSleepDebtPositiveQualitative(text);
  const debtNegative = hasSleepDebtNegativeQualitative(text);

  if (negativeSign && debtPositive) {
    return { ambiguous: true, reason: "sign_qualitative_conflict" };
  }
  if (positiveSign && debtNegative) {
    return { ambiguous: true, reason: "sign_qualitative_conflict" };
  }
  if (!negativeSign && !positiveSign && !debtPositive && !debtNegative) {
    return { ambiguous: true, reason: "no_direction_cue" };
  }
  return { ambiguous: false };
}

/** PDF / 指標カード向けの中立ラベル */
export const DURATION_AMBIGUOUS_LABEL_CIRCADIAN = "ずれあり";
export const DURATION_AMBIGUOUS_LABEL_SLEEP_DEBT = "参考値";
