/**
 * 回復指数（Recovery Index）
 * 睡眠時間・深い睡眠・睡眠効率・HRV・ストレス・安静時心拍・SpO₂・呼吸数を重み付けして100点換算。
 * 睡眠時間だけで極端に下がらないよう、睡眠時間の重みは控えめにする。
 */

import { parseDurationMinutes, parseLeadingNumber } from "@/lib/soxai-graphs";

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
      score: number;
      level: RecoveryLevel;
      label: string;
      emoji: string;
      summary: string;
      why: string[];
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

export type RecoveryIndexInput = {
  sleepDuration?: string | number | null;
  deepSleep?: string | number | null;
  sleepEfficiency?: string | number | null;
  hrv?: string | number | null;
  stress?: string | number | null;
  restingHeartRate?: string | number | null;
  spo2?: string | number | null;
  respiratoryRate?: string | number | null;
  /**
   * Oura Readiness など参考スコア（任意）。
   * 未指定時は従来どおり（SOXAI 互換）。指定時のみ重み再配分に参加。
   */
  readinessScore?: string | number | null;
};

/** 合計 1.0。睡眠時間は 10% に抑え、他指標でバランスを取る */
const WEIGHTS = {
  sleepDuration: 0.1,
  deepSleep: 0.14,
  sleepEfficiency: 0.14,
  hrv: 0.14,
  stress: 0.12,
  restingHeartRate: 0.12,
  spo2: 0.12,
  respiratoryRate: 0.12,
  /** Oura 等の参考スコア。未取得時は計算に入らない */
  readinessScore: 0.08,
} as const;

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseNumber(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const n = parseLeadingNumber(String(value ?? ""));
  return n != null && Number.isFinite(n) ? n : null;
}

function parseMinutes(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return parseDurationMinutes(raw) ?? parseLeadingNumber(raw);
}

/** 睡眠時間（短くても極端に落とさない） */
export function scoreSleepDurationMinutes(minutes: number): number {
  if (minutes >= 7 * 60 && minutes <= 9 * 60) return 88;
  if (minutes >= 6 * 60) {
    const t = (minutes - 6 * 60) / 60;
    return clamp100(68 + t * 18);
  }
  if (minutes >= 5 * 60) {
    const t = (minutes - 5 * 60) / 60;
    return clamp100(58 + t * 10);
  }
  if (minutes >= 4 * 60) {
    const t = (minutes - 4 * 60) / 60;
    return clamp100(50 + t * 8);
  }
  if (minutes > 9 * 60) return 66;
  return clamp100(Math.max(42, 42 + (minutes / (4 * 60)) * 8));
}

export function scoreDeepSleepMinutes(minutes: number): number {
  if (minutes >= 75) return clamp100(84 + Math.min(8, (minutes - 75) / 30));
  if (minutes >= 55) {
    const t = (minutes - 55) / 20;
    return clamp100(62 + t * 20);
  }
  return clamp100(Math.max(30, (minutes / 55) * 58));
}

export function scoreHrvMs(ms: number): number {
  if (ms >= 50) return clamp100(84 + Math.min(10, (ms - 50) / 6));
  if (ms >= 35) {
    const t = (ms - 35) / 15;
    return clamp100(58 + t * 24);
  }
  return clamp100(Math.max(24, (ms / 35) * 52));
}

export function scoreRestingHeartRateBpm(bpm: number): number {
  if (bpm <= 60) return clamp100(86 + Math.min(8, (60 - bpm) / 2));
  if (bpm <= 72) {
    const t = (72 - bpm) / 12;
    return clamp100(60 + t * 22);
  }
  return clamp100(Math.max(24, 54 - (bpm - 72) * 1.4));
}

export function scoreStressLevel(level: number): number {
  if (level <= 35) return clamp100(86 + Math.min(8, (35 - level) / 3));
  if (level <= 50) {
    const t = (50 - level) / 15;
    return clamp100(58 + t * 24);
  }
  return clamp100(Math.max(24, 54 - (level - 50) * 0.9));
}

export function scoreSleepEfficiencyPercent(pct: number): number {
  if (pct >= 90) return 90;
  if (pct >= 85) return clamp100(74 + ((pct - 85) / 5) * 14);
  if (pct >= 75) return clamp100(56 + ((pct - 75) / 10) * 16);
  return clamp100(Math.max(28, (pct / 75) * 52));
}

export function scoreSpo2Percent(pct: number): number {
  if (pct >= 96) return 92;
  if (pct >= 94) return clamp100(74 + ((pct - 94) / 2) * 14);
  if (pct >= 92) return clamp100(58 + ((pct - 92) / 2) * 14);
  return clamp100(Math.max(28, (pct / 92) * 54));
}

/** 呼吸数（安静時おおよそ 12–20。12–16 を良好帯） */
export function scoreRespiratoryRateRpm(rpm: number): number {
  if (rpm >= 12 && rpm <= 16) return 88;
  if (rpm > 16 && rpm <= 20) {
    const t = (20 - rpm) / 4;
    return clamp100(62 + t * 20);
  }
  if (rpm >= 10 && rpm < 12) {
    const t = (rpm - 10) / 2;
    return clamp100(62 + t * 20);
  }
  if (rpm > 20 && rpm <= 24) return clamp100(48 - (rpm - 20) * 4);
  return clamp100(Math.max(28, 40 - Math.abs(rpm - 14) * 2));
}

/** Oura Readiness 等の参考スコア（0–100）。SWIJ Recovery と同値にはしない */
export function scoreReadinessReference(score: number): number {
  if (score >= 85) return clamp100(82 + Math.min(8, (score - 85) / 2));
  if (score >= 70) return clamp100(68 + ((score - 70) / 15) * 14);
  if (score >= 55) return clamp100(52 + ((score - 55) / 15) * 16);
  return clamp100(Math.max(28, (score / 55) * 50));
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
      "睡眠の質と自律神経・呼吸指標のバランスが良く、身体は十分に回復しています。",
  },
  good: {
    label: "良好",
    emoji: "🟢",
    accent: "#0f6b5c",
    accentSoft: "rgba(15, 107, 92, 0.10)",
    summary: "回復状態は良好です。通常通り活動して問題ありません。",
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

function buildWhy(parts: {
  scores: Array<{ key: string; score: number; label: string }>;
  hrvMs: number;
  rhrBpm: number;
}): string[] {
  const sorted = [...parts.scores].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const weak = [...parts.scores].sort((a, b) => a.score - b.score)[0];
  const lines: string[] = [];
  if (best) {
    lines.push(`${best.label}が回復を支える前向きな要素です。`);
  }
  if (weak && weak.score < 70) {
    lines.push(
      `一方で${weak.label}に整え余地があり、総合的な回復指数に反映しています。`,
    );
  } else {
    lines.push(
      `HRV（${Math.round(parts.hrvMs)} ms）と安静時心拍（${Math.round(parts.rhrBpm)} bpm）を含む複数指標で総合判定しています。`,
    );
  }
  return lines.slice(0, 2);
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
 * 回復指数を算出。
 * HRV と安静時心拍は必須。他項目は取れたものだけ重み再配分。
 */
export function computeRecoveryIndex(
  input: RecoveryIndexInput,
): RecoveryIndexResult {
  const hrvRaw = parseNumber(input.hrv);
  const rhrRaw = parseNumber(input.restingHeartRate);

  if (hrvRaw == null || hrvRaw <= 0 || rhrRaw == null || rhrRaw <= 0) {
    return {
      available: false,
      reason: "missing_soxai",
      message: "回復指数は算出できません",
    };
  }

  const scored: Array<{
    key: keyof typeof WEIGHTS;
    score: number;
    label: string;
  }> = [
    { key: "hrv", score: scoreHrvMs(hrvRaw), label: "HRV" },
    {
      key: "restingHeartRate",
      score: scoreRestingHeartRateBpm(rhrRaw),
      label: "安静時心拍",
    },
  ];

  const durationMin = parseMinutes(input.sleepDuration);
  if (durationMin != null && durationMin > 0) {
    scored.push({
      key: "sleepDuration",
      score: scoreSleepDurationMinutes(durationMin),
      label: "睡眠時間",
    });
  }
  const deepMin = parseMinutes(input.deepSleep);
  if (deepMin != null && deepMin > 0) {
    scored.push({
      key: "deepSleep",
      score: scoreDeepSleepMinutes(deepMin),
      label: "深い睡眠",
    });
  }
  const eff = parseNumber(input.sleepEfficiency);
  if (eff != null && eff > 0) {
    scored.push({
      key: "sleepEfficiency",
      score: scoreSleepEfficiencyPercent(eff),
      label: "睡眠効率",
    });
  }
  const stress = parseNumber(input.stress);
  if (stress != null && stress >= 0) {
    scored.push({
      key: "stress",
      score: scoreStressLevel(stress),
      label: "ストレス",
    });
  }
  const spo2 = parseNumber(input.spo2);
  if (spo2 != null && spo2 > 0) {
    scored.push({
      key: "spo2",
      score: scoreSpo2Percent(spo2),
      label: "SpO₂",
    });
  }
  const resp = parseNumber(input.respiratoryRate);
  if (resp != null && resp > 0) {
    scored.push({
      key: "respiratoryRate",
      score: scoreRespiratoryRateRpm(resp),
      label: "呼吸数",
    });
  }
  const readiness = parseNumber(input.readinessScore);
  if (readiness != null && readiness > 0) {
    scored.push({
      key: "readinessScore",
      score: scoreReadinessReference(readiness),
      label: "Readiness（参考）",
    });
  }

  const weightSum = scored.reduce((sum, item) => sum + WEIGHTS[item.key], 0);
  const score = clamp100(
    scored.reduce(
      (sum, item) => sum + item.score * (WEIGHTS[item.key] / weightSum),
      0,
    ),
  );
  const level = levelFromScore(score);
  const meta = LEVEL_META[level];

  return {
    available: true,
    score,
    level,
    label: meta.label,
    emoji: meta.emoji,
    summary: meta.summary,
    why: buildWhy({
      scores: scored.map((s) => ({
        key: s.key,
        score: s.score,
        label: s.label,
      })),
      hrvMs: hrvRaw,
      rhrBpm: rhrRaw,
    }),
    advice: buildAdvice(level),
    hrvMs: hrvRaw,
    restingHeartRateBpm: rhrRaw,
    accent: meta.accent,
    accentSoft: meta.accentSoft,
  };
}
