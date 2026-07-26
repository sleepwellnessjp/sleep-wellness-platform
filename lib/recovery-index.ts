/**
 * 回復指数（Recovery Index）
 * HRV（心拍変動）と安静時心拍数を組み合わせた回復状態指標。
 * HRV単独では判定しない。どちらか欠ける場合は算出不可。
 */

import { parseLeadingNumber } from "@/lib/soxai-graphs";

export type RecoveryLevel =
  | "excellent"
  | "good"
  | "mild_fatigue"
  | "fatigue"
  | "insufficient";

export type RecoveryIndexResult =
  | {
      available: false;
      reason: "missing_soxai";
      message: string;
    }
  | {
      available: true;
      /** 0–100 */
      score: number;
      level: RecoveryLevel;
      label: string;
      emoji: string;
      /** 判定本文（1段落） */
      summary: string;
      /** なぜこの判定か（1〜2文） */
      why: string[];
      /** 運動 / 睡眠 / 食事 / ストレス管理 */
      advice: {
        exercise: string;
        sleep: string;
        nutrition: string;
        stress: string;
      };
      hrvMs: number;
      restingHeartRateBpm: number;
      accent: string;
      accentSoft: string;
    };

const HRV_GOOD = 50;
const HRV_FAIR = 35;
const RHR_GOOD_MAX = 60;
const RHR_FAIR_MAX = 72;

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** HRV: 高いほど高評価（0–100） */
export function scoreHrvMs(ms: number): number {
  if (ms >= HRV_GOOD) return clamp100(88 + Math.min(12, (ms - HRV_GOOD) / 5));
  if (ms >= HRV_FAIR) {
    const t = (ms - HRV_FAIR) / (HRV_GOOD - HRV_FAIR);
    return clamp100(58 + t * 28);
  }
  return clamp100(Math.max(18, (ms / HRV_FAIR) * 52));
}

/** 安静時心拍: 低いほど高評価（0–100） */
export function scoreRestingHeartRateBpm(bpm: number): number {
  if (bpm <= RHR_GOOD_MAX) {
    return clamp100(88 + Math.min(12, (RHR_GOOD_MAX - bpm) / 2));
  }
  if (bpm <= RHR_FAIR_MAX) {
    const t = (RHR_FAIR_MAX - bpm) / (RHR_FAIR_MAX - RHR_GOOD_MAX);
    return clamp100(58 + t * 28);
  }
  return clamp100(Math.max(18, 55 - (bpm - RHR_FAIR_MAX) * 1.6));
}

function levelFromScore(score: number): RecoveryLevel {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "mild_fatigue";
  if (score >= 40) return "fatigue";
  return "insufficient";
}

const LEVEL_META: Record<
  RecoveryLevel,
  {
    label: string;
    emoji: string;
    accent: string;
    accentSoft: string;
    summary: string;
  }
> = {
  excellent: {
    label: "非常に良好",
    emoji: "🟢",
    accent: "#0f6b5c",
    accentSoft: "rgba(15, 107, 92, 0.12)",
    summary:
      "HRVが高く、安静時心拍数も低いため、身体は十分に回復しています。運動・仕事・集中力ともに高いパフォーマンスが期待できます。",
  },
  good: {
    label: "良好",
    emoji: "🟢",
    accent: "#0f6b5c",
    accentSoft: "rgba(15, 107, 92, 0.10)",
    summary:
      "回復状態は良好です。通常通り活動して問題ありません。",
  },
  mild_fatigue: {
    label: "やや疲労",
    emoji: "🟡",
    accent: "#a67c1a",
    accentSoft: "rgba(166, 124, 26, 0.12)",
    summary:
      "疲労が少し蓄積しています。今日は強度を少し下げることをおすすめします。",
  },
  fatigue: {
    label: "疲労蓄積",
    emoji: "🟠",
    accent: "#b85c1a",
    accentSoft: "rgba(184, 92, 26, 0.12)",
    summary:
      "身体の回復が十分ではありません。睡眠・栄養・休養を優先してください。",
  },
  insufficient: {
    label: "回復不足",
    emoji: "🔴",
    accent: "#a33a3a",
    accentSoft: "rgba(163, 58, 58, 0.12)",
    summary:
      "身体は十分に回復していません。激しい運動は避け、休養を最優先にしてください。",
  },
};

function buildWhy(
  level: RecoveryLevel,
  hrvMs: number,
  rhrBpm: number,
  hrvScore: number,
  rhrScore: number,
): string[] {
  const hrvHigh = hrvScore >= 70;
  const hrvLow = hrvScore < 55;
  const rhrCalm = rhrScore >= 70;
  const rhrElevated = rhrScore < 55;

  if (level === "excellent" || level === "good") {
    return [
      hrvHigh
        ? `HRV（${Math.round(hrvMs)} ms）が良好で、副交感神経が優位な状態です。`
        : `HRV（${Math.round(hrvMs)} ms）は標準〜良好の範囲です。`,
      rhrCalm
        ? `安静時心拍数（${Math.round(rhrBpm)} bpm）も落ち着いており、身体は十分回復しています。`
        : `安静時心拍数（${Math.round(rhrBpm)} bpm）も大きな負担を示していません。`,
    ];
  }

  if (level === "mild_fatigue") {
    return [
      hrvLow
        ? `HRV（${Math.round(hrvMs)} ms）がやや低下し、回復余力が弱まっています。`
        : `HRV（${Math.round(hrvMs)} ms）はまずまずですが、総合的にやや疲労寄りです。`,
      rhrElevated
        ? `安静時心拍数（${Math.round(rhrBpm)} bpm）もやや高めです。`
        : `安静時心拍数（${Math.round(rhrBpm)} bpm）は許容範囲ですが、負荷の調整が望ましいです。`,
    ];
  }

  return [
    hrvLow
      ? `HRV（${Math.round(hrvMs)} ms）が低下し、自律神経の回復が遅れている可能性があります。`
      : `HRV（${Math.round(hrvMs)} ms）に対し、安静時心拍とのバランスが悪化しています。`,
    rhrElevated
      ? `安静時心拍数（${Math.round(rhrBpm)} bpm）も高めです。疲労やストレスの影響が考えられます。`
      : `安静時心拍数（${Math.round(rhrBpm)} bpm）と合わせて、休養を優先する判断です。`,
  ];
}

function buildAdvice(level: RecoveryLevel): {
  exercise: string;
  sleep: string;
  nutrition: string;
  stress: string;
} {
  switch (level) {
    case "excellent":
      return {
        exercise: "通常〜やや高めの強度でも問題ありません。感覚を大切に調整を。",
        sleep: "良いリズムを維持。就寝・起床時刻のばらつきを小さく保ちましょう。",
        nutrition: "水分とたんぱく質を意識し、回復を支える食事を続けてください。",
        stress: "好調な日こそ短時間の呼吸リセットで余力を温存しましょう。",
      };
    case "good":
      return {
        exercise: "予定通りの運動で大丈夫です。疲労感が出たら強度を一段下げて。",
        sleep: "いつも通りの睡眠時間を確保し、就寝前の画面時間を控えめに。",
        nutrition: "バランスの良い食事と十分な水分補給を続けてください。",
        stress: "軽いストレッチや深呼吸で副交感神経をサポートしましょう。",
      };
    case "mild_fatigue":
      return {
        exercise: "高強度は控え、有酸素やヨガなど中〜低強度を中心に。",
        sleep: "今夜はいつもより15〜30分早めの就寝を検討してください。",
        nutrition: "消化の良い夕食と、就寝3時間前までの食事を意識して。",
        stress: "仕事のピークを分散し、短い休息をこまめに入れてください。",
      };
    case "fatigue":
      return {
        exercise: "激しいトレーニングは避け、歩行や軽いストレッチにとどめて。",
        sleep: "睡眠時間の確保を最優先。昼寝は20分以内で調整を。",
        nutrition: "アルコールを控え、ミネラルとたんぱく質を意識して。",
        stress: "予定を見直し、心理的負荷の高い予定は可能な範囲で後ろへ。",
      };
    case "insufficient":
    default:
      return {
        exercise: "激しい運動は避け、休養日として身体を休めてください。",
        sleep: "今夜の睡眠を最優先。就寝ルーティンを簡潔に整えて。",
        nutrition: "刺激物を控え、温かい食事と十分な水分で回復を支えて。",
        stress: "情報入力を減らし、静かな時間で神経系をリセットしましょう。",
      };
  }
}

/**
 * HRV + 安静時心拍数から回復指数を算出。
 * どちらか一方でも欠ける場合は算出不可。
 */
export function computeRecoveryIndex(input: {
  hrv?: string | number | null;
  restingHeartRate?: string | number | null;
}): RecoveryIndexResult {
  const hrvRaw =
    typeof input.hrv === "number"
      ? input.hrv
      : parseLeadingNumber(String(input.hrv ?? ""));
  const rhrRaw =
    typeof input.restingHeartRate === "number"
      ? input.restingHeartRate
      : parseLeadingNumber(String(input.restingHeartRate ?? ""));

  if (
    hrvRaw == null ||
    !Number.isFinite(hrvRaw) ||
    hrvRaw <= 0 ||
    rhrRaw == null ||
    !Number.isFinite(rhrRaw) ||
    rhrRaw <= 0
  ) {
    return {
      available: false,
      reason: "missing_soxai",
      message: "回復指数は算出できません",
    };
  }

  const hrvScore = scoreHrvMs(hrvRaw);
  const rhrScore = scoreRestingHeartRateBpm(rhrRaw);
  // HRV をやや重視しつつ、必ず両方を組み合わせる
  const score = clamp100(hrvScore * 0.55 + rhrScore * 0.45);
  const level = levelFromScore(score);
  const meta = LEVEL_META[level];

  return {
    available: true,
    score,
    level,
    label: meta.label,
    emoji: meta.emoji,
    summary: meta.summary,
    why: buildWhy(level, hrvRaw, rhrRaw, hrvScore, rhrScore),
    advice: buildAdvice(level),
    hrvMs: hrvRaw,
    restingHeartRateBpm: rhrRaw,
    accent: meta.accent,
    accentSoft: meta.accentSoft,
  };
}
