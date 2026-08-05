/**
 * Oura 分析時の AI / ルール入力整理。
 * SOXAI パスには触れず、Oura のみ生活習慣デフォルト値を分析材料から除外する。
 */

import { sanitizeAnalysisNarratives } from "@/lib/analysis-narrative";
import type { AiSleepAnalysisInput } from "@/lib/ai-analysis";
import {
  buildAnalysisAiInput,
  type AnalysisAiInput,
  type BuildAnalysisAiInputArgs,
  type LifestyleFormForDayContext,
} from "@/lib/client-profiles/ai-input";

type LifestyleLike = Partial<LifestyleFormForDayContext> & {
  yogaDone?: string;
  pilatesDone?: string;
  otherExerciseDone?: string;
  alcoholDrank?: string;
  caffeineDone?: string;
  meals?: string;
};

const LIFESTYLE_COMMENT_PATTERN =
  /食事|朝食|昼食|夕食|飲酒|アルコール|カフェイン|入浴|運動|ヨガ|ピラティス|昼寝|間食|夕食を|不規則な食事|食べなかった|摂らなかった|欠食/;

function trim(value: string | undefined | null): string {
  return (value ?? "").trim();
}

function mealWasExplicit(
  eaten?: string,
  time?: string,
  content?: string,
): boolean {
  return eaten === "yes" || Boolean(trim(time)) || Boolean(trim(content));
}

/** 確認画面でユーザーが明示入力した生活習慣があるか */
export function hasExplicitOuraLifestyleInput(
  lifestyle: LifestyleLike | null | undefined,
): boolean {
  if (!lifestyle) return false;

  if (
    mealWasExplicit(
      lifestyle.breakfastEaten,
      lifestyle.breakfastTime,
      lifestyle.breakfastContent,
    ) ||
    mealWasExplicit(
      lifestyle.lunchEaten,
      lifestyle.lunchTime,
      lifestyle.lunchContent,
    ) ||
    mealWasExplicit(
      lifestyle.dinnerEaten,
      lifestyle.dinnerTime,
      lifestyle.dinnerContent,
    )
  ) {
    return true;
  }

  if (lifestyle.alcoholDrank === "yes") return true;
  if (lifestyle.caffeineDone === "yes") return true;
  if (lifestyle.yogaDone === "yes") return true;
  if (lifestyle.pilatesDone === "yes") return true;
  if (lifestyle.otherExerciseDone === "yes") return true;

  const optionalTextFields = [
    lifestyle.alcohol,
    lifestyle.alcoholType,
    lifestyle.alcoholAmount,
    lifestyle.alcoholNotes,
    lifestyle.caffeine,
    lifestyle.caffeineType,
    lifestyle.caffeineAmount,
    lifestyle.caffeineTime,
    lifestyle.caffeineNotes,
    lifestyle.exercise,
    lifestyle.yoga,
    lifestyle.pilates,
    lifestyle.bathing,
    lifestyle.work,
    lifestyle.condition,
    lifestyle.stress,
    lifestyle.notes,
    lifestyle.medications,
  ];
  for (const value of optionalTextFields) {
    const text = trim(value);
    if (!text) continue;
    if (/^(none|なし|摂取なし|していない|入浴していない)$/i.test(text)) {
      continue;
    }
    return true;
  }

  const mealsSummary = trim(lifestyle.meals);
  if (
    mealsSummary &&
    !/食べていない/.test(mealsSummary) &&
    !/^朝食:\s*食べていない/.test(mealsSummary)
  ) {
    return true;
  }

  return false;
}

/** Oura ルールベース分析用。未入力生活習慣はすべて null */
export function ouraLifestyleForRules(
  lifestyle: LifestyleLike,
): AiSleepAnalysisInput["lifestyle"] {
  if (!hasExplicitOuraLifestyleInput(lifestyle)) {
    return {
      breakfast: null,
      lunch: null,
      dinner: null,
      alcohol: null,
      caffeine: null,
      exercise: null,
      bathing: null,
      preBedBehavior: null,
      notes: null,
    };
  }

  const mealValue = (
    eaten?: string,
    time?: string,
    content?: string,
  ): string | null => {
    if (eaten === "yes") {
      return trim(content) || trim(time) || "食べた";
    }
    if (trim(time) || trim(content)) {
      return [trim(time), trim(content)].filter(Boolean).join(" ");
    }
    return null;
  };

  const joinParts = (...parts: Array<string | undefined>): string | null => {
    const text = parts.map(trim).filter(Boolean).join(" ");
    return text || null;
  };

  return {
    breakfast: mealValue(
      lifestyle.breakfastEaten,
      lifestyle.breakfastTime,
      lifestyle.breakfastContent,
    ),
    lunch: mealValue(
      lifestyle.lunchEaten,
      lifestyle.lunchTime,
      lifestyle.lunchContent,
    ),
    dinner: mealValue(
      lifestyle.dinnerEaten,
      lifestyle.dinnerTime,
      lifestyle.dinnerContent,
    ),
    alcohol:
      lifestyle.alcoholDrank === "yes"
        ? joinParts(
            lifestyle.alcohol,
            lifestyle.alcoholType,
            lifestyle.alcoholAmount,
            lifestyle.alcoholNotes,
          )
        : joinParts(lifestyle.alcohol),
    caffeine:
      lifestyle.caffeineDone === "yes"
        ? joinParts(
            lifestyle.caffeine,
            lifestyle.caffeineType,
            lifestyle.caffeineAmount,
            lifestyle.caffeineTime,
            lifestyle.caffeineNotes,
          )
        : joinParts(lifestyle.caffeine),
    exercise: joinParts(
      lifestyle.exercise,
      lifestyle.yoga,
      lifestyle.pilates,
      lifestyle.otherExerciseName,
    ),
    bathing: trim(lifestyle.bathing) || null,
    preBedBehavior: joinParts(lifestyle.condition, lifestyle.stress),
    notes: trim(lifestyle.notes) || null,
  };
}

const OURA_MODEL_NOTES = [
  "【Oura分析モード】測定デバイスは Oura Ring。",
  "優先順位: Oura確認済みメトリクス > Oura固有指標 > 固定プロフィール > 前回分析 > 当日生活習慣（明示入力のみ）。",
  "Total Sleep / Time in Bed / Sleep Efficiency / Sleep Latency / Awake / REM / Light / Deep / RHR / Lowest HR / HRV / Respiratory Rate / SpO2 / Body Temperature Deviation / Readiness / Activity を客観根拠として優先する。",
  "食事・朝食・昼食・夕食・飲酒・カフェイン・運動・入浴・昼寝・本人補足は、確認画面で明示入力がない限り分析材料に含めない。",
  "未取得・未入力の生活習慣について「摂らなかった」「不規則な食事」「カフェインを控える」等の断定コメント・改善提案を生成しない。",
  "生活習慣データがない場合は、Oura客観データ（深睡眠・睡眠効率・覚醒・就床時間・HRV・安静時心拍・就寝時刻の安定・入眠前の光環境・睡眠機会の確保）から改善提案を作る。",
  "Oura Readiness Score を Sleep Wellness Score にコピーしない（SWIJ独自評価を維持）。",
];

export function buildOuraAnalysisAiInput(
  args: BuildAnalysisAiInputArgs,
): AnalysisAiInput {
  const hasLifestyle = hasExplicitOuraLifestyleInput(args.lifestyleForm ?? null);
  const base = buildAnalysisAiInput({
    ...args,
    lifestyleForm: hasLifestyle ? args.lifestyleForm : null,
    dayContext: hasLifestyle ? args.dayContext : null,
  });

  return {
    ...base,
    dayContext: hasLifestyle ? base.dayContext : undefined,
    priorityOrder: hasLifestyle
      ? base.priorityOrder
      : [
          "soxai_measured",
          "fixed_profile",
          "previous_analysis",
          "weather",
          "general_reference",
        ],
    notesForModel: [
      ...OURA_MODEL_NOTES,
      ...base.notesForModel.filter((note) => !note.includes("SOXAI実測")),
    ],
  };
}

export function ouraLifestylePromptBlock(
  lifestyle: LifestyleLike,
): string {
  if (!hasExplicitOuraLifestyleInput(lifestyle)) {
    return `【② 当日の生活習慣】
Oura画像からは取得不可。確認画面でも明示入力なし。
食事・飲酒・カフェイン・運動・入浴・昼寝・本人補足について言及しない。推測・断定禁止。`;
  }

  const rows: Array<[string, string | undefined]> = [
    ["朝食", lifestyle.breakfastEaten === "yes" ? "食べた" : lifestyle.breakfastContent],
    ["昼食", lifestyle.lunchEaten === "yes" ? "食べた" : lifestyle.lunchContent],
    ["夕食", lifestyle.dinnerEaten === "yes" ? "食べた" : lifestyle.dinnerContent],
    ["飲酒", lifestyle.alcoholDrank === "yes" ? lifestyle.alcohol : undefined],
    ["カフェイン", lifestyle.caffeineDone === "yes" ? lifestyle.caffeine : undefined],
    ["運動", lifestyle.exercise],
    ["入浴", lifestyle.bathing],
    ["体調・ストレス", lifestyle.condition || lifestyle.stress],
    ["自由記述", lifestyle.notes],
  ];

  const lines = rows
    .filter(([, value]) => trim(value))
    .map(([label, value]) => `${label}: ${value?.trim()}`);

  return `【② 当日の生活習慣（明示入力のみ）】
${lines.join("\n")}`;
}

function containsUnsubstantiatedLifestyle(text: string): boolean {
  return LIFESTYLE_COMMENT_PATTERN.test(text);
}

export function filterOuraLifestyleText(text: string): string {
  if (!text.trim()) return text;
  const parts = text
    .split(/(?<=。)/)
    .map((part) => part.trim())
    .filter(Boolean);
  const kept = parts.filter((part) => !containsUnsubstantiatedLifestyle(part));
  return kept.join("").trim() || text;
}

function sanitizeStringField(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const filtered = filterOuraLifestyleText(value);
  return filtered || value;
}

function sanitizeStringArray(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value
    .map((item) => (typeof item === "string" ? filterOuraLifestyleText(item) : item))
    .filter((item) => typeof item !== "string" || item.trim().length > 0);
}

function sanitizeImprovements(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return item;
      const row = item as Record<string, unknown>;
      const text =
        typeof row.text === "string" ? filterOuraLifestyleText(row.text) : "";
      const whyNow =
        typeof row.whyNow === "string"
          ? filterOuraLifestyleText(row.whyNow)
          : "";
      if (!text.trim()) return null;
      return {
        ...row,
        text,
        whyNow: whyNow || row.whyNow,
      };
    })
    .filter(Boolean);
}

/** 生活習慣根拠がない Oura 分析文から、食事・カフェイン等の断定を除去 */
export function sanitizeOuraAnalysisNarratives(
  record: Record<string, unknown>,
  hasLifestyleEvidence: boolean,
): void {
  sanitizeAnalysisNarratives(record);
  if (hasLifestyleEvidence) return;

  for (const key of [
    "summary",
    "karteSummary",
    "scoreComment",
    "profileRelation",
    "lifestyleRelation",
  ] as const) {
    record[key] = sanitizeStringField(record[key]);
  }

  record.goodPoints = sanitizeStringArray(record.goodPoints);
  record.todaysRecommendations = sanitizeStringArray(record.todaysRecommendations);
  record.nextComparisonPoints = sanitizeStringArray(record.nextComparisonPoints);
  record.recommendationsUntilNext = sanitizeImprovements(
    record.recommendationsUntilNext,
  );
  record.improvements = sanitizeImprovements(record.improvements);

  if (
    record.categoryScoreRationales &&
    typeof record.categoryScoreRationales === "object"
  ) {
    const rationales = record.categoryScoreRationales as Record<string, unknown>;
    for (const key of ["body", "mind", "lifestyle", "environment"] as const) {
      rationales[key] = sanitizeStringField(rationales[key]);
    }
  }

  if (record.instructorCounseling && typeof record.instructorCounseling === "object") {
    const counseling = record.instructorCounseling as Record<string, unknown>;
    for (const [key, value] of Object.entries(counseling)) {
      if (typeof value === "string") {
        counseling[key] = sanitizeStringField(value);
      } else if (Array.isArray(value)) {
        counseling[key] = sanitizeStringArray(value);
      }
    }
  }
}

/** PDF 用 lifestyle。Oura で未入力なら null を返し生活習慣根拠を抑止 */
export function ouraLifestyleForPdf<T extends LifestyleLike | null | undefined>(
  inputSource: string | undefined,
  lifestyle: T,
): T | null {
  if (inputSource !== "oura") return lifestyle ?? null;
  return hasExplicitOuraLifestyleInput(lifestyle) ? lifestyle ?? null : null;
}
