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
  /** 今夜からできる具体的な行動（1つ） */
  action: string;
};

export type MelatoninYogaDisplay = {
  phase: string;
  /** なぜその Phase か（認定講師向け） */
  phaseReason: string;
  breathing: string;
  yogaMinutes: string;
  meditationMinutes: string;
  /** 合計時間（例: 合計 20分） */
  totalMinutes: string;
  bathing: string;
  morningAction: string;
};

/** 分析結果ページとカウンセリングシートで共有するメラトニンヨガ™処方箋 */
export type MelatoninYogaPrescription = MelatoninYogaDisplay;

export type ClientWellnessReportModel = {
  score: number;
  stars: ScoreStars;
  overallComment: string;
  /** 今日の睡眠に影響した要因（最大5） */
  impactFactors: string[];
  goodPoints: string[];
  improvements: ImprovementPoint[];
  /** 最優先 / 次に改善 / 余裕があれば（該当のみ・最大3） */
  priorityImprovements: PriorityImprovement[];
  melatoninYoga: MelatoninYogaDisplay;
  /** 今日から実行できる行動（最大3・固定文にしない） */
  todaysActions: string[];
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
  const maxHrv = Number(String(metrics.hrvMax ?? "").replace(/[^\d.]/g, ""));
  const stressNum = Number(String(metrics.stress ?? "").replace(/[^\d.]/g, ""));
  const remRate = parsePercent(metrics.remSleepRate);
  const deepRate = parsePercent(metrics.deepSleepRate);
  const awakeRate = parsePercent(metrics.awakeningRate);
  const rhr = Number(
    String(metrics.restingHeartRate ?? "").replace(/[^\d.]/g, ""),
  );

  const lines: string[] = [];
  const goodBits: string[] = [];
  const concernBits: string[] = [];

  if (durationMin != null) {
    if (durationMin >= 420 && durationMin <= 540) {
      goodBits.push("睡眠時間はおおむね確保できている傾向が見られます");
    } else if (durationMin < 360) {
      concernBits.push("睡眠時間がやや短めの傾向が見られます");
    } else if (durationMin > 540) {
      concernBits.push("睡眠時間が長めで、質のばらつきに注意したい傾向が見られます");
    }
  }

  if (efficiency != null) {
    if (efficiency >= 90) {
      goodBits.push("睡眠効率は良好で、ベッドでの時間を休息に活かせている可能性があります");
    } else if (efficiency < 85) {
      concernBits.push("睡眠効率がやや低めのため、就床時間に対する実際の休息が不足気味の可能性があります");
    }
  }

  if (awakeRate != null && awakeRate >= 10) {
    concernBits.push("夜間の覚醒が多めの傾向が見られます");
  } else if (awakeRate != null && awakeRate > 0 && awakeRate < 8) {
    goodBits.push("夜間の覚醒は比較的抑えられている可能性があります");
  }

  if (remRate != null) {
    if (remRate >= 18 && remRate <= 25) {
      goodBits.push("レム睡眠のバランスはおおむね妥当な範囲にある傾向が見られます");
    } else if (remRate < 15) {
      concernBits.push("レム睡眠がやや少なめの傾向が見られます");
    }
  }

  if (deepRate != null) {
    if (deepRate >= 13) {
      goodBits.push("深い睡眠側の比率は比較的保てている可能性があります");
    } else {
      concernBits.push("深い睡眠側の休息が不足気味の可能性があります");
    }
  }

  if (Number.isFinite(hrv) && hrv > 0) {
    if (hrv >= 50) {
      goodBits.push("平均HRVは回復しやすい側に寄っている可能性があります");
    } else if (hrv < 40) {
      concernBits.push("平均HRVが低めのため、副交感神経への切り替えが弱い可能性があります");
    }
  }

  if (Number.isFinite(maxHrv) && maxHrv > 0 && Number.isFinite(hrv) && hrv > 0) {
    if (maxHrv >= hrv * 1.4 && hrv < 45) {
      concernBits.push(
        "最大HRVと平均HRVの差から、回復の波が安定していない可能性があります",
      );
    }
  }

  if (Number.isFinite(rhr) && rhr > 0) {
    if (rhr < 60) {
      goodBits.push("安静時心拍数は落ち着いている傾向が見られます");
    } else if (rhr >= 70) {
      concernBits.push("安静時心拍数がやや高めのため、就寝前のリラックスが特に大切な可能性があります");
    }
  }

  if (goodBits.length > 0) {
    lines.push(`良かった点として、${goodBits.slice(0, 2).join("。また、")}。`);
  } else if (result.score >= 78) {
    lines.push(
      "今日は大きく崩れた睡眠ではなく、回復の土台はある程度できている傾向が見られます。",
    );
  } else {
    lines.push(
      "今日の睡眠は大きく崩れてはいませんが、生活の一部が質に影響している可能性があります。",
    );
  }

  if (concernBits.length > 0) {
    lines.push(
      `一方で、${concernBits.slice(0, 2).join("。また、")}。`,
    );
  } else if (Number.isFinite(stressNum) && stressNum >= 50) {
    lines.push(
      "ストレス指標が高めのため、就寝前に副交感神経へ切り替える時間が短い可能性があります。",
    );
  }

  const lifestyleHints: string[] = [];
  if (!isAbsent(lifestyle?.alcohol) && isPresent(lifestyle?.alcohol)) {
    lifestyleHints.push(
      "飲酒は睡眠後半の覚醒やHRVに影響した可能性があります",
    );
  }
  if (caffeineLate(lifestyle)) {
    lifestyleHints.push(
      "カフェインの残効が入眠や中途覚醒に影響した可能性があります",
    );
  }
  if (lateDinner(lifestyle)) {
    lifestyleHints.push(
      "遅い夕食による消化負担が深い休息を妨げた可能性があります",
    );
  }
  const bath = lifestyle?.bathing ?? "";
  if (
    lifestyle?.bathing != null &&
    (/入浴していない|なし|none|シャワーのみ/i.test(bath) || isAbsent(bath))
  ) {
    lifestyleHints.push(
      "入浴が十分でないと体温リズムの整えにくさに影響した可能性があります",
    );
  } else if (isPresent(bath) && /入浴|湯船|バス/i.test(bath)) {
    lifestyleHints.push(
      "入浴習慣は入眠の助けになった可能性があります",
    );
  }
  if (isPresent(lifestyle?.exercise) && !isAbsent(lifestyle?.exercise)) {
    lifestyleHints.push(
      "運動は日中の覚醒と夜間の深い休息のバランスに影響した可能性があります",
    );
  }
  if (isPresent(lifestyle?.yoga) && !isAbsent(lifestyle?.yoga)) {
    lifestyleHints.push(
      "ヨガは副交感神経への切り替えを助けた可能性があります",
    );
  }
  if (isPresent(lifestyle?.pilates) && !isAbsent(lifestyle?.pilates)) {
    lifestyleHints.push(
      "ピラティスは身体の緊張をほぐし、入眠の助けになった可能性があります",
    );
  }

  if (lifestyleHints.length > 0) {
    lines.push(lifestyleHints.slice(0, 2).join("。") + "。");
  } else {
    lines.push(
      "良い点を維持しつつ、影響しやすい生活習慣から1つずつ整えていくのがおすすめです。",
    );
  }

  if (lines.length < 3) {
    lines.push(
      "認定講師として、数値の良し悪しだけでなく「何が支えになり、何が負担になったか」を一緒に整理して伝えると伝わりやすいです。",
    );
  }

  return lines.slice(0, 5).join("\n");
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

  const deepRate = parsePercent(metrics.deepSleepRate);
  if (deepRate != null && deepRate < 13) {
    hits.push({ label: "深い睡眠不足", weight: 86 });
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

type RankedImprovement = ImprovementPoint & {
  action: string;
  weight: number;
};

function collectImprovementCandidates(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
): RankedImprovement[] {
  const items: RankedImprovement[] = [];

  const push = (
    title: string,
    reason: string,
    action: string,
    weight: number,
  ) => {
    if (items.some((item) => item.title === title)) return;
    items.push({ title, reason, action, weight });
  };

  for (const item of result.improvements ?? []) {
    push(
      item.text,
      item.whyNow?.trim() ||
        "今回の測定データと生活習慣から、優先して整えると効果が期待できるポイントです。",
      "今夜からできる小さな一歩を1つ選んで実践してください。",
      70,
    );
  }

  if (!isAbsent(lifestyle?.alcohol) && isPresent(lifestyle?.alcohol)) {
    push(
      "就寝前の飲酒",
      "睡眠の後半の覚醒やHRVに影響した可能性があります。",
      "飲酒は就寝2〜3時間前までに終えてください。",
      95,
    );
  }
  if (
    caffeineLate(lifestyle) ||
    (!isAbsent(lifestyle?.caffeine) && isPresent(lifestyle?.caffeine))
  ) {
    push(
      "カフェインの摂取タイミング",
      "カフェインの残効が入眠や中途覚醒に影響した可能性があります。",
      caffeineLate(lifestyle)
        ? "カフェインは就寝6時間前までにしてください。"
        : "午後以降のカフェインを控えめにしてください。",
      caffeineLate(lifestyle) ? 82 : 62,
    );
  }
  const durationMin = parseMinutesRough(result.metrics.sleepDuration);
  if (durationMin != null && durationMin < 360) {
    push(
      "睡眠時間の確保",
      "必要睡眠に対して実睡眠が短めの傾向が見られます。",
      "今夜は就寝時刻を15〜30分早めてみてください。",
      90,
    );
  }
  const stressNum = Number(
    String(result.metrics.stress ?? "").replace(/[^\d.]/g, ""),
  );
  if (Number.isFinite(stressNum) && stressNum >= 45) {
    push(
      "就寝前のストレスケア",
      "ストレス指標が高めのため、副交感神経への切り替えが弱い可能性があります。",
      "就寝前にメラトニンヨガ™の呼吸を5分取り入れてください。",
      84,
    );
  }
  if (lateDinner(lifestyle)) {
    push(
      "夕食のタイミング",
      "遅い夕食による消化負担が深い休息を妨げた可能性があります。",
      "夕食は就寝の3時間前までに終えてください。",
      80,
    );
  }

  const hrv = Number(String(result.metrics.hrv ?? "").replace(/[^\d.]/g, ""));
  if (Number.isFinite(hrv) && hrv > 0 && hrv < 40) {
    push(
      "副交感神経への切り替え",
      "平均HRVが低めのため、交感神経優位が残っている可能性があります。",
      "就寝90分前に39〜40℃で15分入浴してください。",
      88,
    );
  }

  const deepRate = parsePercent(result.metrics.deepSleepRate);
  if (deepRate != null && deepRate < 13) {
    push(
      "深い休息を育てる習慣",
      "深い睡眠側の休息が不足気味の可能性があります。",
      "寝る30分前からスマートフォンを見ないようにしてください。",
      86,
    );
  }

  const awakeRate = parsePercent(result.metrics.awakeningRate);
  if (awakeRate != null && awakeRate >= 15) {
    push(
      "中途覚醒への備え",
      "夜間の覚醒が多めの傾向が見られます。",
      "就寝前の照明を落とし、寝室を静かに保ってください。",
      76,
    );
  }

  const bath = lifestyle?.bathing ?? "";
  if (
    lifestyle?.bathing != null &&
    (/入浴していない|なし|none|シャワーのみ/i.test(bath) || isAbsent(bath))
  ) {
    push(
      "湯船での入浴",
      "入浴が十分でないと体温リズムが整いにくい可能性があります。",
      "就寝90分前に湯船へ入ってください。",
      58,
    );
  }

  return items
    .sort((a, b) => b.weight - a.weight)
    .map((item) => ({
      ...item,
      reason: item.reason.slice(0, 180),
      action: item.action.slice(0, 120),
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
    { tier: "highest" as const, tierLabel: "最優先" },
    { tier: "next" as const, tierLabel: "次に改善" },
    { tier: "optional" as const, tierLabel: "余裕があれば" },
  ];
  const candidates = collectImprovementCandidates(result, lifestyle).slice(0, 3);

  // 該当しない項目は無理に埋めない（0件のときのみ、維持の1件を出す）
  if (candidates.length === 0) {
    return [
      {
        ...tiers[0],
        title: "良い習慣の継続",
        reason:
          "大きな乱れは目立たないため、現状のリズムを維持することが安定につながる可能性があります。",
        action: "就寝・起床時刻をできるだけそろえてください。",
      },
    ];
  }

  return candidates.map((item, index) => ({
    ...tiers[index]!,
    title: item.title,
    reason: item.reason,
    action: item.action,
  }));
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

  const normalizePhase = (raw: string): "Phase1" | "Phase2" | "Phase3" => {
    if (/phase\s*3|フェーズ\s*3|回復/i.test(raw)) return "Phase3";
    if (/phase\s*2|フェーズ\s*2|整える/i.test(raw)) return "Phase2";
    if (/phase\s*1|フェーズ\s*1|メンテ/i.test(raw)) return "Phase1";
    return "Phase2";
  };

  const PHASE_LABEL: Record<"Phase1" | "Phase2" | "Phase3", string> = {
    Phase1: "Phase1（メンテ）",
    Phase2: "Phase2（整える）",
    Phase3: "Phase3（回復）",
  };

  let phase: "Phase1" | "Phase2" | "Phase3" = "Phase2";
  if (plan?.recommendedPhase?.trim()) {
    phase = normalizePhase(plan.recommendedPhase);
  } else if (shortSleep || (score < 55 && (highStress || lowHrv))) {
    phase = "Phase3";
  } else if (alcoholOn || highStress || (score >= 55 && score < 78)) {
    phase = "Phase2";
  } else if (score >= 78) {
    phase = "Phase1";
  } else {
    phase = "Phase2";
  }

  let phaseReason = "";
  if (phase === "Phase3") {
    phaseReason = shortSleep
      ? "睡眠時間が短めの傾向が見られるため、回復を厚くするPhase3が適している可能性があります。"
      : highStress || lowHrv
        ? "ストレスやHRVから回復負荷が大きめの傾向が見られるため、Phase3でじっくり整えるのがよい可能性があります。"
        : "総合的に回復を優先したい状態のため、Phase3が適している可能性があります。";
  } else if (phase === "Phase2") {
    phaseReason = alcoholOn
      ? "生活習慣の影響が残っている可能性があるため、Phase2で整えつつリラックスを促すのがよい可能性があります。"
      : highStress
        ? "ストレスが高く、副交感神経への切り替えを促したい状態です。"
        : "大きく崩れてはいませんが改善余地があるため、Phase2が続けやすい可能性があります。";
  } else {
    phaseReason =
      "睡眠と生活習慣のバランスが比較的良い傾向が見られるため、Phase1で良い状態を維持するのが適している可能性があります。";
  }

  const breathMin = phase === "Phase1" ? 3 : 5;
  const yogaMin = phase === "Phase3" ? 20 : 10;
  const meditationMin = phase === "Phase3" ? 10 : 5;
  const total = breathMin + yogaMin + meditationMin;

  return {
    phase: PHASE_LABEL[phase],
    phaseReason,
    breathing: `腹式呼吸 ${breathMin}分`,
    yogaMinutes: `ヨガ ${yogaMin}分`,
    meditationMinutes: `瞑想 ${meditationMin}分`,
    totalMinutes: `合計 ${total}分`,
    bathing: plan?.bathing?.trim() || "39〜40℃で15分の湯船",
    morningAction:
      plan?.morningAction?.trim() || "起床後すぐ Curtain Open＋軽いストレッチ",
  };
}

function buildTodaysActions(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
): string[] {
  const actions: string[] = [];
  const push = (text: string) => {
    if (!text.trim()) return;
    if (actions.includes(text)) return;
    actions.push(text);
  };

  if (!isAbsent(lifestyle?.alcohol) && isPresent(lifestyle?.alcohol)) {
    push("飲酒は就寝2〜3時間前までに終える");
  }
  if (caffeineLate(lifestyle) || isPresent(lifestyle?.caffeine)) {
    push(
      caffeineLate(lifestyle)
        ? "カフェインは就寝6時間前までにする"
        : "午後のカフェインを控えめにする",
    );
  }
  if (lateDinner(lifestyle)) {
    push("夕食は就寝の3時間前までに終える");
  }

  const bath = lifestyle?.bathing ?? "";
  if (
    lifestyle?.bathing != null &&
    (/入浴していない|なし|none|シャワーのみ/i.test(bath) || isAbsent(bath))
  ) {
    push("39〜40℃で15分入浴する");
  }

  const hrv = Number(String(result.metrics.hrv ?? "").replace(/[^\d.]/g, ""));
  const stressNum = Number(
    String(result.metrics.stress ?? "").replace(/[^\d.]/g, ""),
  );
  if (
    (Number.isFinite(hrv) && hrv > 0 && hrv < 40) ||
    (Number.isFinite(stressNum) && stressNum >= 45)
  ) {
    push("寝る前にメラトニンヨガ™の呼吸を5分行う");
  }

  const durationMin = parseMinutesRough(result.metrics.sleepDuration);
  if (durationMin != null && durationMin < 360) {
    push("今夜はいつもより15〜30分早く床につく");
  }

  const deepRate = parsePercent(result.metrics.deepSleepRate);
  const awakeRate = parsePercent(result.metrics.awakeningRate);
  if (
    (deepRate != null && deepRate < 13) ||
    (awakeRate != null && awakeRate >= 12)
  ) {
    push("寝る30分前からスマートフォンを見ない");
  }

  if (
    lifestyle?.yogaDone === "none" ||
    (lifestyle?.yoga != null && isAbsent(lifestyle.yoga))
  ) {
    push("今夜は短いヨガまたはストレッチを10分取り入れる");
  }

  if (actions.length === 0) {
    push("就寝・起床の時刻をできるだけそろえる");
    push("寝室の照明を就寝1時間前から落とす");
    push("起床後すぐにカーテンを開けて光を取り入れる");
  }

  return actions.slice(0, 3);
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

/** 分析結果ページと PDF シートで同一のメラトニンヨガ™処方箋を返す */
export function buildMelatoninYogaPrescription(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot | null,
): MelatoninYogaPrescription {
  return buildMelatoninYoga(result, lifestyle ?? undefined);
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

  // Expert AI 本文と食い違わないよう、確定済みフィールドを優先する
  const aiSummary = (result.summary ?? "").trim();
  const aiGood = (result.goodPoints ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
  const aiImprovements = (result.improvements ?? []).filter(
    (item) => item && typeof item.text === "string" && item.text.trim(),
  );
  const tiers = [
    { tier: "highest" as const, tierLabel: "最優先" },
    { tier: "next" as const, tierLabel: "次に改善" },
    { tier: "optional" as const, tierLabel: "余裕があれば" },
  ];
  const fromAiPriority: PriorityImprovement[] = aiImprovements
    .slice(0, 3)
    .map((item, index) => ({
      ...tiers[index]!,
      title: item.text.trim().slice(0, 40),
      reason: (item.whyNow ?? "").trim() || "今回の測定データから優先しています。",
      action: item.text.trim(),
    }));

  return {
    score,
    stars,
    overallComment: aiSummary || buildOverallComment(result, snap),
    impactFactors: buildImpactFactors(result, snap),
    goodPoints: aiGood.length > 0 ? aiGood : buildGoodPoints(result, snap),
    improvements: buildImprovements(result, snap),
    priorityImprovements:
      fromAiPriority.length > 0
        ? fromAiPriority
        : buildPriorityImprovements(result, snap),
    melatoninYoga,
    todaysActions:
      (result.todaysRecommendations ?? []).filter(Boolean).slice(0, 3).length > 0
        ? (result.todaysRecommendations ?? []).filter(Boolean).slice(0, 3)
        : buildTodaysActions(result, snap),
    lifestyleStars: buildLifestyleStars(result, snap),
  };
}
