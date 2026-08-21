/**
 * 睡眠時無呼吸リスク兆候の評価。
 *
 * SpO₂低下 + 複数の補助因子が揃った場合に isElevated = true を返す。
 * 医学的診断ではなく、改善優先順位の昇格トリガーとして使用する。
 *
 * しきい値: 合計 4 以上 かつ SpO₂ が 93 未満。
 * SpO₂ 加点は段階化（90%未満=+3 / 90以上93未満=+2）。
 */

export type SleepRiskFlag = {
  isElevated: boolean;
  /** 加点の根拠（内部・デバッグ用。年齢含む全件） */
  reasons: string[];
  /** クライアント向け表示用。年齢を除外したもの */
  displayReasons: string[];
};

/** buildClientWellnessReport / buildCounselingSheetModel へ渡す補助因子 */
export type SleepRiskHint = {
  snoring?: boolean | null;
  nasalCongestion?: boolean | null;
  age?: number | null;
};

type SleepRiskInput = {
  /**
   * 平均SpO₂（%）。
   * 90 未満で加点3 / 90以上93未満で加点2。
   * 93 未満でない場合は isElevated にしない。
   */
  avgSpo2?: number | null;
  /** いびき。true で加点1 */
  snoring?: boolean | null;
  /** 鼻閉。true で加点1 */
  nasalCongestion?: boolean | null;
  /** 覚醒時間（分）。45 以上で加点1 */
  awakeMinutes?: number | null;
  /** 年齢。50 以上で加点1 */
  age?: number | null;
};

const NEGATIVE_HABIT = new Set([
  "なし",
  "ない",
  "無し",
  "無",
  "no",
  "none",
  "0",
]);

/**
 * 「あり」「なし」系の自由記述を boolean に変換する。
 * 空は null（加点しない）。否定語のみ false、それ以外は true。
 */
function habitToBool(value: string | boolean | null | undefined): boolean | null {
  if (typeof value === "boolean") return value;
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (NEGATIVE_HABIT.has(trimmed.toLowerCase())) return false;
  return true;
}

/**
 * snoring_nasal（text）をいびき / 鼻閉に分解する。
 *
 * Profile V2 由来の結合形「あり / あり」は
 * lib/repositories/client-repository.ts で
 * [health.snoring, health.nasalCongestionHabitual].join(" / ") されている。
 * 逆方向の既存パース関数は無いため、ここで分解する。
 */
export function parseSnoringNasal(raw?: string | null): {
  snoring: boolean | null;
  nasalCongestion: boolean | null;
} {
  if (raw == null || !String(raw).trim()) {
    return { snoring: null, nasalCongestion: null };
  }
  const parts = String(raw)
    .split(/\s*\/\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      snoring: habitToBool(parts[0]),
      nasalCongestion: habitToBool(parts[1]),
    };
  }

  const text = parts[0] ?? String(raw).trim();
  const hasSnore = /いびき|snor/i.test(text);
  const hasNasal = /鼻|nasal|詰/i.test(text);
  return {
    snoring: hasSnore ? habitToBool(text) : null,
    nasalCongestion: hasNasal ? habitToBool(text) : null,
  };
}

/**
 * 呼び出し元で取れるフィールドから SleepRiskHint を組み立てる。
 * 取得できない項目は null のまま（推測で埋めない）。
 */
export function buildSleepRiskHint(source: {
  age?: number | null;
  snoringNasal?: string | null;
  /** 当日の鼻閉（boolean または「あり/なし」文字列） */
  nasalCongestion?: boolean | string | null;
  /** 普段の鼻づまり（Profile V2） */
  nasalCongestionHabitual?: boolean | string | null;
  /** いびき（Profile V2） */
  snoring?: boolean | string | null;
}): SleepRiskHint {
  const parsed = parseSnoringNasal(source.snoringNasal);

  const snoring = habitToBool(source.snoring) ?? parsed.snoring;

  const nasalCongestion =
    habitToBool(source.nasalCongestionHabitual) ??
    habitToBool(source.nasalCongestion) ??
    parsed.nasalCongestion;

  const age =
    typeof source.age === "number" && Number.isFinite(source.age)
      ? source.age
      : null;

  return { snoring, nasalCongestion, age };
}

export function evaluateSleepRiskFlag(input: SleepRiskInput): SleepRiskFlag {
  const reasons: string[] = [];
  let score = 0;

  const spo2Low =
    typeof input.avgSpo2 === "number" && Number.isFinite(input.avgSpo2)
      ? input.avgSpo2 < 93
      : null;

  if (spo2Low === true) {
    if (input.avgSpo2! < 90) {
      reasons.push("平均SpO₂ 90%未満");
      score += 3;
    } else {
      reasons.push(`平均SpO₂ ${input.avgSpo2}%`);
      score += 2;
    }
  }

  if (input.snoring === true) {
    reasons.push("いびきあり");
    score += 1;
  }

  if (input.nasalCongestion === true) {
    reasons.push("鼻閉あり");
    score += 1;
  }

  if (
    typeof input.awakeMinutes === "number" &&
    Number.isFinite(input.awakeMinutes) &&
    input.awakeMinutes >= 45
  ) {
    reasons.push(`覚醒時間 ${Math.round(input.awakeMinutes)}分`);
    score += 1;
  }

  if (
    typeof input.age === "number" &&
    Number.isFinite(input.age) &&
    input.age >= 50
  ) {
    reasons.push(`年齢 ${Math.round(input.age)}歳`);
    score += 1;
  }

  // SpO₂ 低下がない場合は isElevated にしない
  const isElevated = score >= 4 && spo2Low === true;

  // 表示用: 本人が変えられない「年齢」はクライアント向け文面から除外
  const displayReasons = reasons.filter((r) => !r.includes("年齢"));

  return { isElevated, reasons, displayReasons };
}

/**
 * リスク昇格時の「理由」文。displayReasons に該当したものだけ列挙する。
 */
export function formatElevatedBreathingReason(displayReasons: string[]): string {
  const phrases: string[] = [];
  for (const reason of displayReasons) {
    if (/SpO/i.test(reason)) {
      if (!phrases.includes("SpO₂の低さ")) phrases.push("SpO₂の低さ");
    } else if (reason.includes("いびき")) {
      if (!phrases.includes("いびき")) phrases.push("いびき");
    } else if (reason.includes("鼻閉")) {
      if (!phrases.includes("鼻づまり")) phrases.push("鼻づまり");
    } else if (reason.includes("覚醒")) {
      if (!phrases.includes("覚醒時間")) phrases.push("覚醒時間");
    }
  }

  const listed =
    phrases.length > 0 ? phrases.join("・") : "夜間の呼吸に関わる要素";
  return `${listed}など、夜間の呼吸に関わる要素が複数重なっています。他の項目より先に確認したい状態です。`;
}

/** medicalReferral 項目の受診導線文言（UI 共通） */
export const MEDICAL_REFERRAL_NOTICE =
  "呼吸に関わる要素が重なっています。気になる状態が続く場合は、睡眠外来・耳鼻咽喉科などの医療機関にご相談ください。本レポートは医学的な診断ではありません。";
