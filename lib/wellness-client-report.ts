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
import {
  evaluateSleepRiskFlag,
  formatElevatedBreathingReason,
  type SleepRiskHint,
} from "@/lib/sleep-risk-flag";

export type { SleepRiskHint };

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

/** day_context.formLifestyle → LifestyleSnapshot（旧レコードは null） */
export function lifestyleSnapshotFromDayContext(
  dayContext: { formLifestyle?: LifestyleSnapshot | null } | null | undefined,
): LifestyleSnapshot | null {
  const form = dayContext?.formLifestyle;
  if (!form || typeof form !== "object") return null;
  const snap: LifestyleSnapshot = {};
  const assign = (key: keyof LifestyleSnapshot) => {
    const v = form[key];
    if (typeof v === "string" && v.trim()) snap[key] = v.trim();
  };
  assign("alcohol");
  assign("alcoholDrank");
  assign("caffeine");
  assign("caffeineDone");
  assign("bathing");
  assign("yoga");
  assign("yogaDone");
  assign("pilates");
  assign("pilatesDone");
  assign("meals");
  assign("otherExerciseDone");
  assign("exercise");
  assign("dinnerTime");
  assign("stress");
  return Object.keys(snap).length > 0 ? snap : null;
}

/**
 * 当日生活習慣の解決順:
 * 1. sessionStorage 由来の pending / draft
 * 2. DB day_context（formLifestyle）
 * 3. なし
 */
export function resolveLifestyleSnapshot(args: {
  pending?: LifestyleSnapshot | null;
  dayContext?: { formLifestyle?: LifestyleSnapshot | null } | null;
}): LifestyleSnapshot | null {
  if (args.pending && Object.keys(args.pending).length > 0) {
    return args.pending;
  }
  return lifestyleSnapshotFromDayContext(args.dayContext);
}

export type LifestyleStarRow = {
  label: string;
  /** null = データ欠損（「—」表示）。カフェイン・飲酒の明示的な「なし」は ★5（良い） */
  stars: ScoreStars | null;
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
  /** 今夜からできる具体的な行動（1つ）。空なら UI で非表示 */
  action: string;
  /** 医療機関への相談を促す導線を表示するか（リスクフラグ昇格時のみ true） */
  medicalReferral?: boolean;
};

/**
 * AI improvements.text を見出し（1文目）と行動（2文目以降）に分割する。
 * ルールパスの title/action には使わない。
 */
export function splitAiImprovementText(text: string): {
  title: string;
  action: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return { title: "", action: "" };

  const match = /[。．]/.exec(trimmed);
  if (!match || match.index == null) {
    return { title: trimmed, action: "" };
  }

  const end = match.index + match[0].length;
  const title = trimmed.slice(0, end).trim();
  const action = trimmed.slice(end).trim();

  // 1文のみ、または2文目が極端に短い場合は分割しない
  if (!action || action.length < 10) {
    return { title: trimmed, action: "" };
  }

  return { title, action };
}

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

/** 生活習慣評価用。データ欠損は「—」（未評価） */
export function formatLifestyleStars(stars: ScoreStars | null): string {
  if (stars == null) return "—";
  return formatStars(stars);
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
  // 「シャワーのみ」を「なし」扱いにしない（のみ ≠ なし）
  if (/シャワー|湯船|半身浴/i.test(v) && !/入浴していない/i.test(v)) {
    return false;
  }
  return (
    /^(なし|無し|ない|none)$/i.test(v) ||
    /摂取なし|飲まない|していない|入浴していない/i.test(v) ||
    /なし$/i.test(v)
  );
}

function isPresent(value?: string): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  if (isAbsent(v)) return false;
  return /あり|実施|飲んだ|摂取|湯船|シャワー|yes/i.test(v) || v.length > 0;
}

/** 入浴の種類。シャワーと「なし」は別状態 */
export type BathingKind = "bath" | "shower" | "none" | "unknown";

export function classifyBathing(text?: string | null): BathingKind | null {
  const v = (text ?? "").trim();
  if (!v) return null;
  if (/入浴していない/i.test(v)) return "none";
  if (/^(なし|無し|ない|none)$/i.test(v)) return "none";
  if (/湯船|半身浴|\bbath\b/i.test(v)) return "bath";
  if (/シャワー|shower/i.test(v)) return "shower";
  return "unknown";
}

function parseClockMinutes(text?: string | null): number | null {
  if (!text?.trim()) return null;
  const m = text
    .normalize("NFKC")
    .match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** 入浴時刻テキスト（「時刻:22:00」等）と就寝時刻の差（分）。日跨ぎ対応 */
export function bathingMinutesBeforeBed(
  bathingText: string | null | undefined,
  bedtime: string | null | undefined,
): number | null {
  const bathClock =
    parseClockMinutes(bathingText?.match(/時刻\s*[:：]?\s*([0-9：:]+)/)?.[1]) ??
    parseClockMinutes(bathingText);
  const bedClock = parseClockMinutes(bedtime);
  if (bathClock == null || bedClock == null) return null;
  let gap = bedClock - bathClock;
  if (gap < 0) gap += 24 * 60;
  if (gap > 18 * 60) return null; // 異常値は無視
  return gap;
}

/**
 * 入浴が「不足寄り」か（湯船推奨に届いていない）。
 * シャワーは「なし」ではないが、湯船不足としてアドバイス対象になり得る。
 */
function bathingNeedsImprovement(kind: BathingKind | null): boolean {
  return kind === "none" || kind === "shower";
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

/**
 * 睡眠の星 = 睡眠時間 × 睡眠負債（同じ測定 metrics）。
 * どちらも欠損なら null（「—」）。scoreBreakdown は使わない。
 */
function sleepStarsFromMetrics(metrics: AnalysisMetrics): ScoreStars | null {
  const durationMin = parseMinutesRough(metrics.sleepDuration);
  const debtRaw = parseMinutesRough(metrics.sleepDebt);
  const debtMin = debtRaw == null ? null : Math.abs(debtRaw);

  if (durationMin == null && debtMin == null) return null;

  let durationStars: number | null = null;
  if (durationMin != null) {
    if (durationMin >= 420 && durationMin <= 540) durationStars = 5;
    else if (durationMin >= 390) durationStars = 4;
    else if (durationMin >= 360) durationStars = 3;
    else if (durationMin >= 300) durationStars = 2;
    else durationStars = 1;
  }

  let debtStars: number | null = null;
  if (debtMin != null) {
    if (debtMin <= 15) debtStars = 5;
    else if (debtMin <= 30) debtStars = 4;
    else if (debtMin <= 60) debtStars = 3;
    else if (debtMin <= 90) debtStars = 2;
    else debtStars = 1;
  }

  if (durationStars != null && debtStars != null) {
    return clampStars(Math.round((durationStars + debtStars) / 2));
  }
  return clampStars(durationStars ?? debtStars ?? 3);
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
  const bathKind = classifyBathing(lifestyle?.bathing);
  if (bathingNeedsImprovement(bathKind)) {
    lifestyleHints.push(
      bathKind === "shower"
        ? "シャワーのみだと体温リズムの整えにくさに影響した可能性があります"
        : "入浴がないと体温リズムの整えにくさに影響した可能性があります",
    );
  } else if (bathKind === "bath") {
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

  return lines.join("\n");
}

/** ③表示と揃える SpO₂ 表示（数値＋%）。欠損時は null */
function spo2DisplayMatchingMetrics(metrics: AnalysisMetrics): string | null {
  const raw = metrics.spo2;
  if (raw == null) return null;
  const text = String(raw).trim();
  if (
    !text ||
    /^(未測定|取得できず|データなし|要確認|--|—|－|-|n\/a|na)$/i.test(text)
  ) {
    return null;
  }
  const p = parsePercent(text);
  if (p == null) {
    const leading = Number(text.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(leading)) return null;
    const num = Number.isInteger(leading)
      ? String(Math.round(leading))
      : String(leading);
    return `${num}%`;
  }
  const num = Number.isInteger(p) ? String(Math.round(p)) : String(p);
  return `${num}%`;
}

const PRIORITY_OVERALL_CLOSING =
  "改善優先順位で最優先の確認事項として整理しています。";

/** 最優先トピックが AI summary 内で既に言及されているか */
function priorityMetricAlreadyInSummary(
  summary: string,
  highest: PriorityImprovement,
): boolean {
  const title = highest.title;
  const spo2Related =
    Boolean(highest.medicalReferral) ||
    /SpO|酸素|呼吸・酸素|呼吸・酸素の状態/i.test(title);
  if (spo2Related) {
    return /SpO[₂2]|酸素飽和|平均酸素/i.test(summary);
  }
  if (/睡眠時間/.test(title)) return /睡眠時間/.test(summary);
  if (/HRV|心拍のゆらぎ/.test(title)) return /HRV|心拍のゆらぎ/.test(summary);
  if (/睡眠効率/.test(title)) return /睡眠効率/.test(summary);
  if (/入眠/.test(title)) return /入眠/.test(summary);
  if (/覚醒/.test(title)) return /覚醒/.test(summary);
  if (/ストレス/.test(title)) return /ストレス/.test(summary);
  if (/飲酒/.test(title)) return /飲酒|アルコール/.test(summary);
  if (/カフェイン/.test(title)) return /カフェイン/.test(summary);
  // タイトル先頭の短い名詞が本文にあれば重複とみなす
  const compact = title.replace(/\s+/g, "").slice(0, 8);
  return compact.length >= 4 && summary.replace(/\s+/g, "").includes(compact);
}

/**
 * ⑤最優先を①総合コメントへ穏やかに反映する文。
 * 診断断定・原因推測・受診導線は書かない（⑤が単一の真実）。
 * @param options.shorten 指標が AI summary に既出のとき、事実の再述を避けて短縮する
 */
export function buildHighestPriorityOverallSentence(
  highest: PriorityImprovement,
  metrics: AnalysisMetrics,
  options?: { shorten?: boolean },
): string {
  const title = highest.title.trim().replace(/[。．]+$/u, "");
  const shorten = options?.shorten === true;
  const spo2Related =
    Boolean(highest.medicalReferral) ||
    /SpO|酸素|呼吸・酸素|呼吸・酸素の状態/i.test(title);

  if (spo2Related) {
    if (shorten) {
      return `平均SpO₂を、${PRIORITY_OVERALL_CLOSING}`;
    }
    const spo2 = spo2DisplayMatchingMetrics(metrics);
    if (spo2) {
      const p = parsePercent(spo2);
      if (p != null && p < 95) {
        return `平均SpO₂は${spo2}で、一般的な目安（95%以上）を下回っています。${PRIORITY_OVERALL_CLOSING}`;
      }
      return `平均SpO₂は${spo2}です。${PRIORITY_OVERALL_CLOSING}`;
    }
    return `夜間の呼吸・酸素の状態を、${PRIORITY_OVERALL_CLOSING}`;
  }

  if (/睡眠時間/.test(title)) {
    if (shorten) {
      return `睡眠時間を、${PRIORITY_OVERALL_CLOSING}`;
    }
    const duration = String(metrics.sleepDuration ?? "").trim();
    if (
      duration &&
      !/^(未測定|取得できず|データなし|要確認|--|—|－|-)$/i.test(duration)
    ) {
      return `睡眠時間は${duration}で、整えの余地が見られます。${PRIORITY_OVERALL_CLOSING}`;
    }
    return `睡眠時間を、${PRIORITY_OVERALL_CLOSING}`;
  }

  if (/HRV|心拍のゆらぎ/.test(title)) {
    if (shorten) {
      return `平均HRVを、${PRIORITY_OVERALL_CLOSING}`;
    }
    const hrv = String(metrics.hrv ?? "").trim();
    if (hrv && !/^(未測定|要確認|--|—)$/i.test(hrv)) {
      const withUnit = /ms/i.test(hrv) ? hrv : `${hrv}ms`;
      return `平均HRVは${withUnit}です。${PRIORITY_OVERALL_CLOSING}`;
    }
  }

  if (/睡眠効率/.test(title)) {
    if (shorten) {
      return `睡眠効率を、${PRIORITY_OVERALL_CLOSING}`;
    }
    const eff = String(metrics.sleepEfficiency ?? "").trim();
    if (eff && !/^(未測定|要確認|--|—)$/i.test(eff)) {
      const withPct = /%|％/.test(eff) ? eff.replace("％", "%") : `${eff}%`;
      return `睡眠効率は${withPct}です。${PRIORITY_OVERALL_CLOSING}`;
    }
  }

  if (shorten) {
    const topic = title.length > 32 ? `${title.slice(0, 31)}…` : title;
    return `「${topic}」は、${PRIORITY_OVERALL_CLOSING}`;
  }

  const topic = title.length > 48 ? `${title.slice(0, 47)}…` : title;
  return `「${topic}」は、${PRIORITY_OVERALL_CLOSING}`;
}

function enrichOverallCommentWithHighestPriority(
  base: string,
  highest: PriorityImprovement | undefined,
  metrics: AnalysisMetrics,
): string {
  const trimmed = base.trim();
  if (!highest || !highest.title.trim()) return trimmed;

  // 既に改善優先順位の最優先案内がある場合は二重追記しない
  if (/改善優先順位で最優先|⑤で最優先/.test(trimmed)) return trimmed;

  const shorten = priorityMetricAlreadyInSummary(trimmed, highest);
  const sentence = buildHighestPriorityOverallSentence(highest, metrics, {
    shorten,
  });
  if (!sentence) return trimmed;

  if (!trimmed) return sentence;
  // 最優先を先頭、AI summary / ルール本文をその後
  return `${sentence}\n${trimmed}`;
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

  const bathKind = classifyBathing(lifestyle?.bathing);
  if (bathKind === "none") {
    hits.push({ label: "入浴なし", weight: 55 });
  } else if (bathKind === "shower") {
    const gap = bathingMinutesBeforeBed(
      lifestyle?.bathing,
      metrics.bedtime,
    );
    hits.push({
      label:
        gap != null && (gap < 60 || gap > 120)
          ? "シャワーのみ（就寝との間隔が推奨から外れている）"
          : "シャワーのみ",
      weight: gap != null && (gap < 60 || gap > 120) ? 62 : 52,
    });
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

  const bathKind = classifyBathing(lifestyle?.bathing);
  if (bathingNeedsImprovement(bathKind)) {
    push(
      bathKind === "shower" ? "湯船での入浴" : "湯船での入浴",
      bathKind === "shower"
        ? "シャワーのみのため、体温リズムが整いにくい可能性があります。"
        : "入浴が十分でないと体温リズムが整いにくい可能性があります。",
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

/** リスクフラグ昇格処理を PriorityImprovement 配列に適用するヘルパー */
function applyBreathingRiskElevation(
  items: PriorityImprovement[],
  result: AnalysisResult,
  hint?: SleepRiskHint,
): PriorityImprovement[] {
  const tiers = [
    { tier: "highest" as const, tierLabel: "最優先" },
    { tier: "next" as const, tierLabel: "次に改善" },
    { tier: "optional" as const, tierLabel: "余裕があれば" },
  ];

  const spo2Num = parsePercent(result.metrics.spo2);
  const awakeMin = parseMinutesRough(result.metrics.awakenings);
  const riskFlag = evaluateSleepRiskFlag({
    avgSpo2: spo2Num,
    snoring: hint?.snoring ?? null,
    nasalCongestion: hint?.nasalCongestion ?? null,
    awakeMinutes: awakeMin,
    age: hint?.age ?? null,
  });

  if (!riskFlag.isElevated) return items;

  const elevatedReason = formatElevatedBreathingReason(riskFlag.displayReasons);

  // ImprovementItem に metric キーが無いため文字列マッチ。
  // 「呼吸」単独は入眠潜時等に誤マッチするため除外し、SpO₂ / 酸素のみ対象。
  const SPO2_KEYWORDS = /SpO|酸素/i;
  const existingIdx = items.findIndex((item) => SPO2_KEYWORDS.test(item.title));
  const breathingItem: PriorityImprovement =
    existingIdx >= 0
      ? {
          ...items[existingIdx]!,
          tier: "highest",
          tierLabel: "最優先",
          reason: elevatedReason,
          medicalReferral: true,
        }
      : {
          tier: "highest",
          tierLabel: "最優先",
          title: "呼吸・酸素の状態確認",
          reason: elevatedReason,
          action: "医療機関での睡眠相談をご検討ください。",
          medicalReferral: true,
        };

  const rest = items
    .filter((_, i) => i !== existingIdx)
    .slice(0, 2)
    .map((item, i) => ({ ...item, ...tiers[i + 1]! }));

  return [breathingItem, ...rest];
}

function buildPriorityImprovements(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot,
  hint?: SleepRiskHint,
): PriorityImprovement[] {
  const tiers = [
    { tier: "highest" as const, tierLabel: "最優先" },
    { tier: "next" as const, tierLabel: "次に改善" },
    { tier: "optional" as const, tierLabel: "余裕があれば" },
  ];
  const candidates = collectImprovementCandidates(result, lifestyle).slice(0, 3);

  // 該当しない項目は無理に埋めない（0件のときのみ、維持の1件を出す）
  if (candidates.length === 0) {
    return applyBreathingRiskElevation(
      [
        {
          ...tiers[0],
          title: "良い習慣の継続",
          reason:
            "大きな乱れは目立たないため、現状のリズムを維持することが安定につながる可能性があります。",
          action: "就寝・起床時刻をできるだけそろえてください。",
        },
      ],
      result,
      hint,
    );
  }

  const items: PriorityImprovement[] = candidates.map((item, index) => ({
    ...tiers[index]!,
    title: item.title,
    reason: item.reason,
    action: item.action,
  }));

  return applyBreathingRiskElevation(items, result, hint);
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

  const bathKind = classifyBathing(lifestyle?.bathing);
  if (bathingNeedsImprovement(bathKind)) {
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
  const sleep = sleepStarsFromMetrics(result.metrics);

  // 当日スナップショット自体が無い（過去レコード等）→ 睡眠以外は未評価
  if (!lifestyle) {
    return [
      { label: "睡眠", stars: sleep },
      { label: "食事", stars: null },
      { label: "運動", stars: null },
      { label: "ヨガ", stars: null },
      { label: "ピラティス", stars: null },
      { label: "カフェイン", stars: null },
      { label: "飲酒", stars: null },
      { label: "入浴", stars: null },
    ];
  }

  const hasText = (value?: string) => Boolean(value?.trim());
  /** 空文字は欠損。明示的な「なし」のみ true */
  const recordedAbsent = (value?: string) => {
    const v = (value ?? "").trim();
    if (!v) return false;
    return (
      /^(なし|無し|ない|none)$/i.test(v) ||
      /摂取なし|飲まない|していない|入浴していない/i.test(v)
    );
  };

  const yogaDone =
    lifestyle.yogaDone === "yes" || isPresent(lifestyle.yoga);
  const yogaNone =
    lifestyle.yogaDone === "none" || recordedAbsent(lifestyle.yoga);
  const pilatesDone =
    lifestyle.pilatesDone === "yes" || isPresent(lifestyle.pilates);
  const pilatesNone =
    lifestyle.pilatesDone === "none" || recordedAbsent(lifestyle.pilates);
  const otherDone =
    lifestyle.otherExerciseDone === "yes" || isPresent(lifestyle.exercise);
  const otherNone =
    lifestyle.otherExerciseDone === "none" ||
    recordedAbsent(lifestyle.exercise);

  let meals: ScoreStars | null = null;
  const mealsText = lifestyle.meals ?? "";
  if (hasText(mealsText)) {
    if (/食べていない/.test(mealsText) && /朝食|昼食/.test(mealsText)) {
      meals = 2;
    } else if (lateDinner(lifestyle)) {
      meals = 2;
    } else if (/朝食.*食べた|昼食.*食べた|夕食.*食べた/.test(mealsText)) {
      meals = 4;
    } else {
      meals = 3;
    }
  }

  /** ヨガ・ピラティス・その他運動を同一入力から評価（矛盾しないよう統合） */
  let exercise: ScoreStars | null = null;
  if (yogaDone || pilatesDone || otherDone) {
    const practicedCount = [yogaDone, pilatesDone, otherDone].filter(
      Boolean,
    ).length;
    exercise = practicedCount >= 2 ? 5 : yogaDone || pilatesDone ? 5 : 4;
  } else if (yogaNone || pilatesNone || otherNone) {
    // いずれかが明示「なし」で実施なし → 低評価（全部未記入は欠損）
    const anySignal =
      yogaNone ||
      pilatesNone ||
      otherNone ||
      hasText(lifestyle.yoga) ||
      hasText(lifestyle.pilates) ||
      hasText(lifestyle.exercise) ||
      Boolean(lifestyle.yogaDone) ||
      Boolean(lifestyle.pilatesDone) ||
      Boolean(lifestyle.otherExerciseDone);
    exercise = anySignal && !yogaDone && !pilatesDone && !otherDone ? 2 : null;
  }

  let yoga: ScoreStars | null = null;
  if (yogaDone) yoga = 5;
  else if (yogaNone) yoga = 2;
  else if (hasText(lifestyle.yoga) || lifestyle.yogaDone) yoga = 3;

  let pilates: ScoreStars | null = null;
  if (pilatesDone) pilates = 5;
  else if (pilatesNone) pilates = 2;
  else if (hasText(lifestyle.pilates) || lifestyle.pilatesDone) pilates = 3;

  let caffeine: ScoreStars | null = null;
  if (lifestyle.caffeineDone === "none" || recordedAbsent(lifestyle.caffeine)) {
    caffeine = 5;
  } else if (caffeineLate(lifestyle)) {
    caffeine = 2;
  } else if (isPresent(lifestyle.caffeine) || lifestyle.caffeineDone === "yes") {
    caffeine = 3;
  } else if (hasText(lifestyle.caffeine) || lifestyle.caffeineDone) {
    caffeine = 4;
  }

  let alcohol: ScoreStars | null = null;
  if (lifestyle.alcoholDrank === "none" || recordedAbsent(lifestyle.alcohol)) {
    alcohol = 5;
  } else if (alcoholLate(lifestyle)) {
    alcohol = 2;
  } else if (isPresent(lifestyle.alcohol) || lifestyle.alcoholDrank === "yes") {
    alcohol = 3;
  } else if (hasText(lifestyle.alcohol) || lifestyle.alcoholDrank) {
    alcohol = 4;
  }

  let bathing: ScoreStars | null = null;
  const bathKind = classifyBathing(lifestyle.bathing);
  if (bathKind != null) {
    const gap = bathingMinutesBeforeBed(
      lifestyle.bathing,
      result.metrics.bedtime,
    );
    // 推奨: 就寝 60〜90 分前の湯船
    const inIdealWindow = gap != null && gap >= 60 && gap <= 90;
    const nearWindow = gap != null && gap >= 45 && gap <= 120;
    if (bathKind === "bath") {
      if (inIdealWindow) bathing = 5;
      else if (nearWindow) bathing = 4;
      else if (gap != null) bathing = 3;
      else bathing = 4; // 湯船だが時刻不明
    } else if (bathKind === "shower") {
      if (inIdealWindow) bathing = 3;
      else if (nearWindow) bathing = 2;
      else if (gap != null) bathing = 2; // 推奨から外れたシャワー
      else bathing = 3; // シャワー・時刻不明
    } else if (bathKind === "none") {
      bathing = 1;
    } else {
      bathing = 3;
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[lifestyle-stars] sources", {
      sleep: {
        sleepDuration: result.metrics.sleepDuration,
        sleepDebt: result.metrics.sleepDebt,
        stars: sleep,
      },
      meals: { meals: lifestyle.meals, dinnerTime: lifestyle.dinnerTime, stars: meals },
      exercise: {
        yogaDone: lifestyle.yogaDone,
        yoga: lifestyle.yoga,
        pilatesDone: lifestyle.pilatesDone,
        pilates: lifestyle.pilates,
        otherExerciseDone: lifestyle.otherExerciseDone,
        exercise: lifestyle.exercise,
        stars: exercise,
      },
      yoga: { yogaDone: lifestyle.yogaDone, yoga: lifestyle.yoga, stars: yoga },
      pilates: {
        pilatesDone: lifestyle.pilatesDone,
        pilates: lifestyle.pilates,
        stars: pilates,
      },
      caffeine: {
        caffeineDone: lifestyle.caffeineDone,
        caffeine: lifestyle.caffeine,
        stars: caffeine,
      },
      alcohol: {
        alcoholDrank: lifestyle.alcoholDrank,
        alcohol: lifestyle.alcohol,
        stars: alcohol,
      },
      bathing: {
        bathing: lifestyle.bathing,
        bedtime: result.metrics.bedtime,
        kind: bathKind,
        gapMin: bathingMinutesBeforeBed(
          lifestyle.bathing,
          result.metrics.bedtime,
        ),
        stars: bathing,
      },
    });
  }

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
  hint?: SleepRiskHint,
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
    .map((item, index) => {
      const { title, action } = splitAiImprovementText(item.text);
      return {
        ...tiers[index]!,
        title,
        reason:
          (item.whyNow ?? "").trim() ||
          "今回の測定データから優先しています。",
        action,
      };
    });

  const rawPriority =
    fromAiPriority.length > 0
      ? fromAiPriority
      : buildPriorityImprovements(result, snap, hint);

  const priorityImprovements = applyBreathingRiskElevation(
    rawPriority,
    result,
    hint,
  );
  const highestPriority =
    priorityImprovements.find((item) => item.tier === "highest") ??
    priorityImprovements[0];
  const baseOverallComment = aiSummary || buildOverallComment(result, snap);

  return {
    score,
    stars,
    overallComment: enrichOverallCommentWithHighestPriority(
      baseOverallComment,
      highestPriority,
      result.metrics,
    ),
    impactFactors: buildImpactFactors(result, snap),
    goodPoints: aiGood.length > 0 ? aiGood : buildGoodPoints(result, snap),
    improvements: buildImprovements(result, snap),
    priorityImprovements,
    melatoninYoga,
    todaysActions:
      (result.todaysRecommendations ?? []).filter(Boolean).slice(0, 3).length > 0
        ? (result.todaysRecommendations ?? []).filter(Boolean).slice(0, 3)
        : buildTodaysActions(result, snap),
    lifestyleStars: buildLifestyleStars(result, snap),
  };
}
