/**
 * SWI 介入・年代・Journey パターンのカタログ。
 * 改善ランキング・宿題マッチングで共有する。
 */

import type {
  SwiAgeBand,
  SwiGenderBucket,
  SwiJourneyPatternId,
} from "./types";

export type SwiInterventionDef = {
  id: string;
  label: string;
  /** 宿題タイトル / 推薦テキスト照合用 */
  patterns: RegExp[];
};

export const SWI_INTERVENTIONS: SwiInterventionDef[] = [
  {
    id: "morning_sun",
    label: "朝日習慣",
    patterns: [/朝日/, /朝の光/, /日光浴/, /朝陽/, /朝日10分/],
  },
  {
    id: "breath_36",
    label: "3:6呼吸",
    patterns: [/3[:：]?6\s*呼吸/, /3・6呼吸/, /呼吸法/, /リラックス呼吸/],
  },
  {
    id: "melatonin_yoga",
    label: "メラトニンヨガ™",
    patterns: [/メラトニン\s*ヨガ/, /メラトニンヨガ/],
  },
  {
    id: "bath",
    label: "入浴改善",
    patterns: [/入浴/, /お風呂/, /バス/, /就寝.?90.?分.?前/],
  },
  {
    id: "bedtime_fixed",
    label: "就寝時刻固定",
    patterns: [/就寝時刻/, /寝る時刻/, /就寝時間/, /ベッドタイム/, /就寝.?固定/],
  },
];

export const SWI_AGE_BAND_LABELS: Record<SwiAgeBand, string> = {
  "20s": "20代",
  "30s": "30代",
  "40s": "40代",
  "50s": "50代",
  "60plus": "60代以上",
  unknown: "不明",
};

export const SWI_AGE_BAND_ORDER: SwiAgeBand[] = [
  "20s",
  "30s",
  "40s",
  "50s",
  "60plus",
];

export const SWI_GENDER_LABELS: Record<SwiGenderBucket, string> = {
  female: "女性",
  male: "男性",
  other: "その他",
  unknown: "未設定",
};

export const SWI_JOURNEY_PATTERN_META: Record<
  SwiJourneyPatternId,
  { label: string; description: string }
> = {
  steady_climb: {
    label: "着実上昇",
    description: "初回から最新まで Score が段階的に改善しているパターン。",
  },
  early_gain_plateau: {
    label: "初期改善→安定期",
    description: "序盤で改善し、その後スコアが横ばいで安定しているパターン。",
  },
  recovery_after_dip: {
    label: "一時低下から回復",
    description: "中盤に低下したあと、最新で回復しているパターン。",
  },
  volatile: {
    label: "変動型",
    description: "スコアの上下が大きく、安定しきっていないパターン。",
  },
  stable_high: {
    label: "高スコア維持",
    description: "高めの Score を維持できているパターン。",
  },
  needs_attention: {
    label: "要フォロー",
    description: "最新 Score が初回より低下、または低位が続いているパターン。",
  },
  insufficient_data: {
    label: "データ不足",
    description: "分析回数が少なく、傾向分類に十分な点が揃っていない。",
  },
};

export function matchInterventionId(text: string): string | null {
  const normalized = text.trim();
  if (!normalized) return null;
  for (const item of SWI_INTERVENTIONS) {
    if (item.patterns.some((pattern) => pattern.test(normalized))) {
      return item.id;
    }
  }
  return null;
}

export function ageBandFromYears(age: number | null): SwiAgeBand {
  if (age == null || !Number.isFinite(age) || age < 0) return "unknown";
  if (age < 20) return "unknown";
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  if (age < 60) return "50s";
  return "60plus";
}

export function normalizeGender(raw: string | null | undefined): SwiGenderBucket {
  if (!raw) return "unknown";
  const v = raw.trim().toLowerCase();
  if (!v) return "unknown";
  if (
    v === "female" ||
    v === "f" ||
    v === "女" ||
    v === "女性" ||
    v.includes("female") ||
    v.includes("女")
  ) {
    return "female";
  }
  if (
    v === "male" ||
    v === "m" ||
    v === "男" ||
    v === "男性" ||
    v.includes("male") ||
    v.includes("男")
  ) {
    return "male";
  }
  if (v === "other" || v === "その他" || v === "未回答" || v === "x") {
    return "other";
  }
  return "other";
}
