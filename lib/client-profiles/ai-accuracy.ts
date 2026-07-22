/**
 * AI分析精度予測
 * プロフィール完成率とは別に、AI重要度で重み付けした入力充足から予測精度を算出する。
 */

import {
  PROFILE_AI_IMPORTANCE,
  type AiImportanceStars,
} from "@/lib/client-profiles/ai-importance";
import {
  PROFILE_COMPLETION_FIELDS,
  calculateProfileCompletion,
  type ProfileCompletionOverrides,
} from "@/lib/client-profiles/completion";
import type { ClientProfileSections } from "@/lib/client-profiles/types";

/** 予測精度の下限・上限（%） */
const ACCURACY_FLOOR = 48;
const ACCURACY_CEILING = 96;

export type AiAccuracyPrediction = {
  /** 0〜100 の整数（表示用） */
  percent: number;
  /** 1〜5 の星 */
  stars: AiImportanceStars;
  /** ★★★★★ 形式 */
  starsLabel: string;
  /** 重み付き充足 0〜1 */
  weightedRatio: number;
  filledWeight: number;
  totalWeight: number;
  /** 重要項目（★3以上）の未入力数 */
  missingImportantCount: number;
};

function fieldWeight(key: (typeof PROFILE_COMPLETION_FIELDS)[number]["key"]): number {
  const importance = PROFILE_AI_IMPORTANCE[key];
  if (importance != null) return importance;
  // 重要度未設定の項目もわずかに寄与（完成率との連動感を残す）
  return 1;
}

function starsFromPercent(percent: number): AiImportanceStars {
  if (percent >= 90) return 5;
  if (percent >= 80) return 4;
  if (percent >= 68) return 3;
  if (percent >= 55) return 2;
  return 1;
}

function formatStars(stars: AiImportanceStars): string {
  return `${"★".repeat(stars)}${"☆".repeat(5 - stars)}`;
}

/**
 * 入力不足に応じて自動変化する AI分析精度予測。
 * 重要度の高い未入力ほど精度が下がる。
 */
export function calculateAiAccuracyPrediction(
  sections: ClientProfileSections,
  overrides?: ProfileCompletionOverrides,
): AiAccuracyPrediction {
  const completion = calculateProfileCompletion(sections, overrides);
  const missingKeys = new Set(
    completion.missingFields.map((field) => field.key),
  );

  let filledWeight = 0;
  let totalWeight = 0;
  let missingImportantCount = 0;

  for (const field of PROFILE_COMPLETION_FIELDS) {
    const weight = fieldWeight(field.key);
    totalWeight += weight;
    if (!missingKeys.has(field.key)) {
      filledWeight += weight;
      continue;
    }
    const importance = PROFILE_AI_IMPORTANCE[field.key];
    if (importance != null && importance >= 3) {
      missingImportantCount += 1;
    }
  }

  const weightedRatio = totalWeight === 0 ? 0 : filledWeight / totalWeight;
  const percent = Math.round(
    ACCURACY_FLOOR + weightedRatio * (ACCURACY_CEILING - ACCURACY_FLOOR),
  );
  const clamped = Math.max(0, Math.min(100, percent));
  const stars = starsFromPercent(clamped);

  return {
    percent: clamped,
    stars,
    starsLabel: formatStars(stars),
    weightedRatio,
    filledWeight,
    totalWeight,
    missingImportantCount,
  };
}
