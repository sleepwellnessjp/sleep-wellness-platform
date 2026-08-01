/**
 * 認定講師向けクライアントレポート用の表示データ生成。
 * 既存の分析結果・生活習慣から UI 側だけで組み立てる（分析ロジックは変更しない）。
 */

import type {
  AnalysisResult,
  MelatoninYogaPlan,
  ScoreStars,
} from "@/lib/analysis-session";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";

export type LifestyleSnapshot = {
  alcohol?: string;
  alcoholDrank?: string;
  caffeine?: string;
  caffeineDone?: string;
  bathing?: string;
  yoga?: string;
  yogaDone?: string;
  pilates?: string;
  pilatesDone?: string;
  meals?: string;
  otherExerciseDone?: string;
  exercise?: string;
  dinnerTime?: string;
  stress?: string;
};

export type LifestyleStarRow = {
  label: string;
  stars: ScoreStars;
};

export type ImprovementPoint = {
  title: string;
  reason: string;
};

/** 改善優先順位（3段階） */
export type PriorityImprovement = {
  tier: "highest" | "next" | "optional";
  tierLabel: string;
  title: string;
  reason: string;
};

export type MelatoninYogaDisplay = {
  phase: string;
  /** なぜその Phase か（認定講師向け） */
  phaseReason: string;
  breathing: string;
  yogaMinutes: string;
  meditationMinutes: string;
  bathing: string;
  morningAction: string;
};

export type ClientWellnessReportModel = {
  score: number;
  stars: ScoreStars;
  overallComment: string;
  /** 今日の睡眠に影響した要因（最大5） */
  impactFactors: string[];
  goodPoints: string[];
  improvements: ImprovementPoint[];
  /** ①最優先 / ②次に改善 / ③余裕があれば */
  priorityImprovements: PriorityImprovement[];
  melatoninYoga: MelatoninYogaDisplay;
  lifestyleStars: LifestyleStarRow[];
};

function clampStars(value: number): ScoreStars {
  if (value <= 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  if (value === 4) return 4;
  return 5;
}

export function formatStars(stars: ScoreStars): string {
  const filled = clampStars(stars);
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

function parsePercent(value?: string): number | null {
  if (!value?.trim()) return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  return Number(match[1]);
}

function parseMinutesRough(value?: string): number | null {
  if (!value?.trim()) return null;
  const hourMin = value.match(/(\d+)\s*時間\s*(\d+)?/);
  if (hourMin) {
    return Number(hourMin[1]) * 60 + Number(hourMin[2] ?? 0);
  }
  const colon = value.match(/(\d+)\s*[:：]\s*(\d+)/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  const minOnly = value.match(/(\d+)\s*分/);
  if (minOnly) return Number(minOnly[1]);
  return null;
}

function isAbsent(value?: string): boolean {
  const v = (value ?? "").trim();
  if (!v) return true;
  return /なし|摂取なし|飲まない|していない|入浴していない|none/i.test(v);
}

function isPresent(value?: string): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  if (isAbsent(v)) return false;
  return /あり|実施|飲んだ|摂取|湯船|シャワー|yes/i.test(v) || v.length > 0;
}

function alcoholLate(lifestyle?: LifestyleSnapshot): boolean {
  const text = `${lifestyle?.alcohol ?? ""} ${lifestyle?.alcoholDrank ?? ""}`;
  return /終了|23:|22:|21:|0:|01:|飲酒/.test(text) && !isAbsent(text);
}

function lateDinner(lifestyle?: LifestyleSnapshot): boolean {
  const meals = lifestyle?.meals ?? "";
  const dinner = lifestyle?.dinnerTime ?? "";
  const blob = `${meals} ${dinner}`;
  return /夕食.*(2[12]|22|23)|22:|23:|21:3|21:0/.test(blob);
}

function caffeineLate(lifestyle?: LifestyleSnapshot): boolean {
  const text = `${lifestyle?.caffeine ?? ""}`;
  return /1[5-9]:|2[0-3]:|夕方|夜|午後/.test(text) && !isAbsent(text);
}

function sleepStarsFromMetrics(
  metrics: AnalysisMetrics,
  breakdown: AnalysisResult["scoreBreakdown"],
): ScoreStars {
  const durationMin = parseMinutesRough(metrics.sleepDuration);
  const efficiency = parsePercent(metrics.sleepEfficiency);
  let score = breakdown.sleepDuration + breakdown.sleepEfficiency;
  if (durationMin != null) {
    if (durationMin >= 420) score += 1;
    else if (durationMin < 300) score -= 1;
  }
  if (efficiency != null) {
    if (efficiency >= 90) score += 1;
    else if (efficiency < 80) score -= 1;
  }
  return clampStars(Math.round(score / 2));
}

function buildOverallComment(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
): string {
  const metrics = result.metrics;
  const durationMin = parseMinutesRough(metrics.sleepDuration);
  const efficiency = parsePercent(metrics.sleepEfficiency);
  const hrv = Number(String(metrics.hrv ?? "").replace(/[^\d.]/g, ""));
  const stressNum = Number(String(metrics.stress ?? "").replace(/[^\d.]/g, ""));
  const deepRate =
    parsePercent(metrics.deepSleepRate) ?? parsePercent(metrics.nonRemSleepRate);
  const rhr = Number(
    String(metrics.restingHeartRate ?? "").replace(/[^\d.]/g, ""),
  );

  const parasympatheticWeak =
    (Number.isFinite(hrv) && hrv > 0 && hrv < 40) ||
    (Number.isFinite(stressNum) && stressNum >= 50) ||
    (!isAbsent(lifestyle?.alcohol) && isPresent(lifestyle?.alcohol));

  const recoveryWeak =
    (deepRate != null && deepRate < 13) ||
    (durationMin != null && durationMin < 360) ||
    (efficiency != null && efficiency < 85);

  const lines: string[] = [];

  if (parasympatheticWeak && recoveryWeak) {
    lines.push(
      "今日は副交感神経への切り替えが弱く、睡眠の回復側にも負担が残っている印象です。",
    );
  } else if (parasympatheticWeak) {
    lines.push(
      "今日は副交感神経への切り替えが弱く、心と身体が眠りに入りきれていない可能性があります。",
    );
  } else if (recoveryWeak) {
    lines.push(
      "今日は眠り自体は取れていても、回復に必要な深い休息が十分でない可能性があります。",
    );
  } else if (result.score >= 78) {
    lines.push(
      "今日は自律神経と睡眠のバランスが比較的整っており、回復の土台はできています。",
    );
  } else {
    lines.push(
      "今日の眠りは大きく崩れてはいませんが、生活の一部が睡眠の質に影響している可能性があります。",
    );
  }

  if (efficiency != null && efficiency < 85) {
    lines.push("睡眠効率も低下しており、就床時間に対して実際の休息がやや不足気味です。");
  } else if (efficiency != null && efficiency >= 90) {
    lines.push("睡眠効率は良好で、ベッドにいる時間を休息として活かせています。");
  }

  if (!isAbsent(lifestyle?.alcohol) && isPresent(lifestyle?.alcohol)) {
    lines.push(
      "飲酒の影響で中途覚醒や深い睡眠の減少が起きやすい状態なので、今夜の整え方が特に大切です。",
    );
  } else if (caffeineLate(lifestyle)) {
    lines.push(
      "カフェインの残効が入眠や中途覚醒に影響している可能性があるため、摂取タイミングの見直しが有効です。",
    );
  } else if (lateDinner(lifestyle)) {
    lines.push(
      "遅い夕食による消化負担が、深い睡眠を妨げている可能性があります。",
    );
  } else if (Number.isFinite(rhr) && rhr >= 70) {
    lines.push(
      "安静時心拍がやや高めのため、就寝前のリラックスで回復モードへ切り替えましょう。",
    );
  } else {
    lines.push(
      "良い点を維持しつつ、優先度の高い改善から1つずつ整えていくのがおすすめです。",
    );
  }

  return lines.slice(0, 3).join("\n");
}

function buildImpactFactors(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
): string[] {
  type Hit = { label: string; weight: number };
  const hits: Hit[] = [];
  const metrics = result.metrics;

  if (!isAbsent(lifestyle?.alcohol) && isPresent(lifestyle?.alcohol)) {
    const text = `${lifestyle?.alcohol ?? ""} ${lifestyle?.alcoholDrank ?? ""}`;
    if (/22:|23:|0:|01:|21:[3-5]|終了.*2[0-3]/.test(text) || alcoholLate(lifestyle)) {
      hits.push({ label: "22時以降の飲酒", weight: 95 });
    } else {
      hits.push({ label: "飲酒あり", weight: 85 });
    }
  }

  if (lateDinner(lifestyle)) {
    hits.push({ label: "夕食が遅い", weight: 80 });
  }

  const hrv = Number(String(metrics.hrv ?? "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(hrv) && hrv > 0 && hrv < 40) {
    hits.push({ label: "HRV低下", weight: 88 });
  }

  const deepRate =
    parsePercent(metrics.deepSleepRate) ?? parsePercent(metrics.nonRemSleepRate);
  if (deepRate != null && deepRate < 13) {
    hits.push({ label: "深睡眠不足", weight: 86 });
  }

  const bath = lifestyle?.bathing ?? "";
  if (
    lifestyle?.bathing != null &&
    (/入浴していない|なし|none|シャワーのみ/i.test(bath) || isAbsent(bath))
  ) {
    hits.push({ label: "入浴なし", weight: 55 });
  }

  if (
    caffeineLate(lifestyle) ||
    (!isAbsent(lifestyle?.caffeine) && isPresent(lifestyle?.caffeine))
  ) {
    hits.push({
      label: caffeineLate(lifestyle) ? "遅い時間のカフェイン摂取" : "カフェイン摂取",
      weight: caffeineLate(lifestyle) ? 78 : 60,
    });
  }

  const stressNum = Number(String(metrics.stress ?? "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(stressNum) && stressNum >= 45) {
    hits.push({ label: "ストレス高値", weight: 82 });
  }

  const durationMin = parseMinutesRough(metrics.sleepDuration);
  if (durationMin != null && durationMin < 360) {
    hits.push({ label: "睡眠時間の不足", weight: 84 });
  }

  const efficiency = parsePercent(metrics.sleepEfficiency);
  if (efficiency != null && efficiency < 85) {
    hits.push({ label: "睡眠効率の低下", weight: 75 });
  }

  const awakeRate = parsePercent(metrics.awakeningRate);
  if (awakeRate != null && awakeRate >= 15) {
    hits.push({ label: "中途覚醒が多い", weight: 70 });
  }

  const latency = parseMinutesRough(metrics.sleepLatency);
  if (latency != null && latency >= 30) {
    hits.push({ label: "入眠に時間がかかっている", weight: 65 });
  }

  hits.sort((a, b) => b.weight - a.weight);
  const unique: string[] = [];
  for (const hit of hits) {
    if (!unique.includes(hit.label)) unique.push(hit.label);
    if (unique.length >= 5) break;
  }

  if (unique.length === 0) {
    unique.push("大きな乱れは目立たず、習慣の安定が主な影響要因です");
  }

  return unique;
}

function buildGoodPoints(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
): string[] {
  const points: string[] = [];
  const push = (text: string) => {
    if (!points.includes(text)) points.push(text);
  };

  for (const item of result.goodPoints ?? []) {
    if (item.trim()) push(item.trim());
  }

  const durationMin = parseMinutesRough(result.metrics.sleepDuration);
  if (durationMin != null && durationMin >= 390) push("睡眠時間が十分");

  const efficiency = parsePercent(result.metrics.sleepEfficiency);
  if (efficiency != null && efficiency >= 88) push("睡眠効率が高い");

  const hrv = result.metrics.hrv?.trim();
  if (hrv && !/未|—|-/.test(hrv)) {
    const n = Number(hrv.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(n) || n >= 40) push("HRVが良好");
  }

  const circ = result.metrics.circadianRhythm?.trim();
  if (circ && !/遅れ|大幅/.test(circ)) push("体内時計が整っている");

  if (isAbsent(lifestyle?.alcohol)) push("飲酒なしで睡眠環境を守れている");
  if (isAbsent(lifestyle?.caffeine)) push("カフェイン摂取が控えめ");
  if (/湯船|bath/i.test(lifestyle?.bathing ?? "")) push("入浴で体温リズムを整えられている");
  if (isPresent(lifestyle?.yoga) || lifestyle?.yogaDone === "yes") {
    push("ヨガを実施できている");
  }

  if (points.length < 3) {
    push("本日のデータをもとに個別の改善計画を立てられます");
  }

  return points.slice(0, 5);
}

type RankedImprovement = ImprovementPoint & { weight: number };

function collectImprovementCandidates(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
): RankedImprovement[] {
  const items: RankedImprovement[] = [];

  const push = (title: string, reason: string, weight: number) => {
    if (items.some((item) => item.title === title)) return;
    items.push({ title, reason, weight });
  };

  for (const item of result.improvements ?? []) {
    push(
      item.text,
      item.whyNow?.trim() ||
        "今回の測定データと生活習慣から、優先して整えると効果が期待できるポイントです。",
      70,
    );
  }

  if (!isAbsent(lifestyle?.alcohol) && isPresent(lifestyle?.alcohol)) {
    push(
      "飲酒タイミングを見直す",
      "飲酒は入眠を早めても中途覚醒や深い睡眠の減少につながりやすいです。就寝の2時間前までに終えると、睡眠の質が安定しやすくなります。",
      95,
    );
  }
  if (
    caffeineLate(lifestyle) ||
    (!isAbsent(lifestyle?.caffeine) && isPresent(lifestyle?.caffeine))
  ) {
    push(
      "カフェインの摂取タイミングを整える",
      "カフェインは数時間にわたり覚醒作用が残ります。午後以降の摂取を控えめにすると、入眠潜時と中途覚醒の改善が期待できます。",
      caffeineLate(lifestyle) ? 82 : 62,
    );
  }
  const durationMin = parseMinutesRough(result.metrics.sleepDuration);
  if (durationMin != null && durationMin < 360) {
    push(
      "睡眠時間を確保する",
      "必要睡眠に対して実睡眠が短めです。就寝時刻を15〜30分早めるだけでも、翌日の回復感と日中パフォーマンスに差が出やすくなります。",
      90,
    );
  }
  const stressNum = Number(
    String(result.metrics.stress ?? "").replace(/[^\d.]/g, ""),
  );
  if (Number.isFinite(stressNum) && stressNum >= 45) {
    push(
      "就寝前にストレスをほぐす",
      "ストレス指標が高めです。就寝前の呼吸法やメラトニンヨガ™で自律神経を整えると、入眠と回復の両方に良い影響が期待できます。",
      84,
    );
  }
  if (lateDinner(lifestyle)) {
    push(
      "夕食を早めに終える",
      "遅い時間の食事は消化活動が残り、深い睡眠を妨げやすいです。就寝の3時間前までに夕食を終えると、睡眠の質が上がりやすくなります。",
      80,
    );
  }

  const hrv = Number(String(result.metrics.hrv ?? "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(hrv) && hrv > 0 && hrv < 40) {
    push(
      "副交感神経への切り替えを促す",
      "HRVが低めのため、交感神経優位が残っている可能性があります。入浴・呼吸・メラトニンヨガ™で回復モードへ切り替えると効果的です。",
      88,
    );
  }

  const deepRate =
    parsePercent(result.metrics.deepSleepRate) ??
    parsePercent(result.metrics.nonRemSleepRate);
  if (deepRate != null && deepRate < 13) {
    push(
      "深い睡眠を増やす習慣づくり",
      "深い睡眠が少なめです。就寝前の刺激を減らし、体温を下げる入浴と規則正しい就寝で、回復睡眠を育てていきましょう。",
      86,
    );
  }

  const bath = lifestyle?.bathing ?? "";
  if (
    lifestyle?.bathing != null &&
    (/入浴していない|なし|none|シャワーのみ/i.test(bath) || isAbsent(bath))
  ) {
    push(
      "湯船での入浴を取り入れる",
      "入浴がないと体温リズムが整いにくく、入眠と深い睡眠に影響しやすいです。就寝90分前の湯船がおすすめです。",
      58,
    );
  }

  if (items.length === 0) {
    push(
      "生活リズムの安定を続ける",
      "大きな乱れは見当たりません。就寝・起床時刻をそろえ、良い習慣を継続することが次の改善につながります。",
      40,
    );
  }

  return items
    .sort((a, b) => b.weight - a.weight)
    .map((item) => ({
      ...item,
      reason: item.reason.slice(0, 180),
    }));
}

function buildImprovements(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
): ImprovementPoint[] {
  return collectImprovementCandidates(result, lifestyle)
    .slice(0, 3)
    .map(({ title, reason }) => ({ title, reason }));
}

function buildPriorityImprovements(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
): PriorityImprovement[] {
  const tiers = [
    { tier: "highest" as const, tierLabel: "① 最優先" },
    { tier: "next" as const, tierLabel: "② 次に改善" },
    { tier: "optional" as const, tierLabel: "③ 余裕があれば" },
  ];
  const candidates = collectImprovementCandidates(result, lifestyle);
  const fallbacks: ImprovementPoint[] = [
    {
      title: "就寝・起床時刻をそろえる",
      reason:
        "リズムが整うと、自律神経とメラトニン分泌のタイミングが安定しやすくなります。",
    },
    {
      title: "就寝前の光刺激を減らす",
      reason:
        "強い光は覚醒を延長しやすいです。寝る1時間前から照明を落とし、スマホを控えると入眠がスムーズになります。",
    },
    {
      title: "朝の光を取り入れる",
      reason:
        "起床後の自然光は体内時計のリセットに役立ち、夜の眠気を生みやすくします。",
    },
  ];

  while (candidates.length < 3) {
    const next = fallbacks[candidates.length];
    if (!next) break;
    if (!candidates.some((item) => item.title === next.title)) {
      candidates.push({ ...next, weight: 10 - candidates.length });
    } else {
      break;
    }
  }

  return tiers.map((tier, index) => {
    const item = candidates[index] ?? fallbacks[index]!;
    return {
      ...tier,
      title: item.title,
      reason: item.reason,
    };
  });
}

function buildMelatoninYoga(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
): MelatoninYogaDisplay {
  const plan: MelatoninYogaPlan | undefined = result.melatoninYogaPlan;
  const score = result.score;
  const durationMin = parseMinutesRough(result.metrics.sleepDuration);
  const stressNum = Number(
    String(result.metrics.stress ?? "").replace(/[^\d.]/g, ""),
  );
  const hrv = Number(String(result.metrics.hrv ?? "").replace(/[^\d.]/g, ""));
  const alcoholOn =
    !isAbsent(lifestyle?.alcohol) && isPresent(lifestyle?.alcohol);
  const shortSleep = durationMin != null && durationMin < 330;
  const highStress = Number.isFinite(stressNum) && stressNum >= 50;
  const lowHrv = Number.isFinite(hrv) && hrv > 0 && hrv < 35;

  let phase =
    plan?.recommendedPhase?.trim() ||
    (score >= 78
      ? "Phase1（メンテナンス）"
      : score >= 55
        ? "Phase2（整える）"
        : "Phase3（回復集中）");

  let phaseReason = "";

  if (!plan?.recommendedPhase) {
    if (shortSleep || (score < 55 && (highStress || lowHrv))) {
      phase = "Phase3（回復集中）";
    } else if (alcoholOn || highStress || (score >= 55 && score < 78)) {
      phase = "Phase2（整える）";
    } else if (score >= 78) {
      phase = "Phase1（メンテナンス）";
    }
  }

  if (phase.includes("3") || /Phase\s*3/i.test(phase)) {
    phaseReason =
      shortSleep
        ? "睡眠時間が短く回復が不足しているため、Phase3で呼吸・ヨガ・瞑想の時間を厚くし、副交感神経への切り替えを集中的に促します。"
        : highStress || lowHrv
          ? "自律神経の回復負荷が大きいため、Phase3でじっくり整えるメニューが適しています。"
          : "総合的に回復優先の状態のため、Phase3で睡眠の土台づくりを重点的に行うのが効果的です。";
  } else if (phase.includes("2") || /Phase\s*2/i.test(phase)) {
    phaseReason = alcoholOn
      ? "飲酒や生活リズムの乱れが睡眠に影響しているため、Phase2で習慣を整えつつ、就寝前のリラックスを強化するのがおすすめです。"
      : highStress
        ? "ストレス負荷が残っているため、Phase2で呼吸とヨガを中心に副交感神経へ切り替えやすいメニューを提案します。"
        : "大きく崩れてはいませんが改善余地があるため、Phase2で整えるペースが無理なく続けやすいです。";
  } else {
    phaseReason =
      "睡眠と生活習慣のバランスが比較的良いため、Phase1で良い状態を維持しつつ、無理のないメンテナンスを続けるのが適しています。";
  }

  const breathing =
    plan?.breathing?.trim() ||
    (phase.includes("3")
      ? "4-7-8呼吸 × 4セット（約5分）"
      : phase.includes("2")
        ? "腹式呼吸 5分"
        : "鼻呼吸リセット 3分");

  const yogaMinutes = phase.includes("3")
    ? "ヨガ 20分"
    : phase.includes("2")
      ? "ヨガ 15分"
      : "ヨガ 10分";

  const meditationMinutes = phase.includes("3")
    ? "瞑想 10分"
    : phase.includes("2")
      ? "瞑想 7分"
      : "瞑想 5分";

  return {
    phase,
    phaseReason,
    breathing,
    yogaMinutes,
    meditationMinutes,
    bathing: plan?.bathing?.trim() || "39〜40℃で15分の湯船",
    morningAction: plan?.morningAction?.trim() || "起床後すぐ Curtain Open＋軽いストレッチ",
  };
}

function buildLifestyleStars(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
): LifestyleStarRow[] {
  const sleep = sleepStarsFromMetrics(result.metrics, result.scoreBreakdown);

  let meals: ScoreStars = 3;
  const mealsText = lifestyle?.meals ?? "";
  if (!mealsText.trim()) meals = 3;
  else if (/食べていない/.test(mealsText) && /朝食|昼食/.test(mealsText)) meals = 2;
  else if (lateDinner(lifestyle)) meals = 2;
  else if (/朝食.*食べた|昼食.*食べた|夕食.*食べた/.test(mealsText)) meals = 4;

  let exercise: ScoreStars = 3;
  if (
    lifestyle?.otherExerciseDone === "yes" ||
    isPresent(lifestyle?.exercise) ||
    (result.exerciseHabit && !isAbsent(result.exerciseHabit))
  ) {
    exercise = 4;
  } else if (
    lifestyle?.otherExerciseDone === "none" ||
    isAbsent(lifestyle?.exercise)
  ) {
    exercise = 2;
  }

  let yoga: ScoreStars = 3;
  if (lifestyle?.yogaDone === "yes" || isPresent(lifestyle?.yoga)) yoga = 5;
  else if (lifestyle?.yogaDone === "none" || isAbsent(lifestyle?.yoga)) yoga = 2;

  let pilates: ScoreStars = 3;
  if (lifestyle?.pilatesDone === "yes" || isPresent(lifestyle?.pilates)) {
    pilates = 5;
  } else if (
    lifestyle?.pilatesDone === "none" ||
    isAbsent(lifestyle?.pilates)
  ) {
    pilates = 2;
  }

  let caffeine: ScoreStars = 4;
  if (isAbsent(lifestyle?.caffeine) || lifestyle?.caffeineDone === "none") {
    caffeine = 5;
  } else if (caffeineLate(lifestyle)) {
    caffeine = 2;
  } else if (isPresent(lifestyle?.caffeine)) {
    caffeine = 3;
  }

  let alcohol: ScoreStars = 4;
  if (isAbsent(lifestyle?.alcohol) || lifestyle?.alcoholDrank === "none") {
    alcohol = 5;
  } else if (alcoholLate(lifestyle)) {
    alcohol = 2;
  } else if (isPresent(lifestyle?.alcohol)) {
    alcohol = 3;
  }

  let bathing: ScoreStars = 3;
  const bath = lifestyle?.bathing ?? "";
  if (/湯船|bath/i.test(bath)) bathing = 5;
  else if (/シャワー|shower/i.test(bath)) bathing = 4;
  else if (/入浴していない|なし|none/i.test(bath)) bathing = 2;

  return [
    { label: "睡眠", stars: sleep },
    { label: "食事", stars: meals },
    { label: "運動", stars: exercise },
    { label: "ヨガ", stars: yoga },
    { label: "ピラティス", stars: pilates },
    { label: "カフェイン", stars: caffeine },
    { label: "飲酒", stars: alcohol },
    { label: "入浴", stars: bathing },
  ];
}

export function buildClientWellnessReport(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot | null,
): ClientWellnessReportModel {
  const snap = lifestyle ?? undefined;
  const score = Math.max(0, Math.min(100, Math.round(result.score)));
  const stars = clampStars(
    score >= 90 ? 5 : score >= 78 ? 4 : score >= 62 ? 3 : score >= 45 ? 2 : 1,
  );
  const melatoninYoga = buildMelatoninYoga(result, snap);

  return {
    score,
    stars,
    overallComment: buildOverallComment(result, snap),
    impactFactors: buildImpactFactors(result, snap),
    goodPoints: buildGoodPoints(result, snap),
    improvements: buildImprovements(result, snap),
    priorityImprovements: buildPriorityImprovements(result, snap),
    melatoninYoga,
    lifestyleStars: buildLifestyleStars(result, snap),
  };
}
