/**
 * 睡眠カウンセリングシート（PDF）専用の表示文生成。
 * Expert Report / Vision / AI分析ロジックは変更しない。
 * 既存の分析結果・測定値から毎回動的に組み立てる。
 */

import type { AnalysisResult } from "@/lib/analysis-session";
import type { LifestyleSnapshot, SleepRiskHint } from "@/lib/wellness-client-report";
import {
  evaluateSleepRiskFlag,
  formatElevatedBreathingReason,
} from "@/lib/sleep-risk-flag";

export type CounselingImpactFactor = {
  /** 短い見出し（任意表示） */
  label: string;
  /** 理由一文（約40文字） */
  reason: string;
};

export type CounselingPriorityItem = {
  tier: "highest" | "next" | "optional";
  tierLabel: "最優先" | "次に改善" | "余裕があれば";
  /** 改善内容 */
  content: string;
  /** 改善理由 */
  reason: string;
  /** 今日やること */
  action: string;
  /** 医療機関への相談を促す導線を表示するか（リスクフラグ昇格時のみ true） */
  medicalReferral?: boolean;
};

/** AIから認定講師への提案（4ブロック） */
export type InstructorGuidanceBlocks = {
  /** ①最初に褒める */
  praise: string;
  /** ②確認する質問 */
  questions: string[];
  /** ③生活改善提案 */
  lifestyle: string[];
  /** ④次回評価ポイント */
  nextEval: string;
};

export type CounselingSheetModel = {
  /** 今回のテーマ（一文） */
  sessionTheme: string;
  impactFactors: CounselingImpactFactor[];
  priorities: CounselingPriorityItem[];
  /** 講師専用・4ブロック構成 */
  instructorBlocks: InstructorGuidanceBlocks;
};

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

function formatDurationJa(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function num(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isAbsent(value?: string): boolean {
  const v = (value ?? "").trim();
  if (!v) return true;
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
  if (!v || isAbsent(v)) return false;
  return true;
}

function alcoholLate(lifestyle?: LifestyleSnapshot | null): boolean {
  const text = `${lifestyle?.alcohol ?? ""} ${lifestyle?.alcoholDrank ?? ""}`;
  return /終了|23:|22:|21:|0:|01:|飲酒/.test(text) && !isAbsent(text);
}

function lateDinner(lifestyle?: LifestyleSnapshot | null): boolean {
  const blob = `${lifestyle?.meals ?? ""} ${lifestyle?.dinnerTime ?? ""}`;
  return /夕食.*(2[12]|22|23)|22:|23:|21:3|21:0/.test(blob);
}

function caffeineLate(lifestyle?: LifestyleSnapshot | null): boolean {
  const text = `${lifestyle?.caffeine ?? ""}`;
  return /1[5-9]:|2[0-3]:|夕方|夜|午後/.test(text) && !isAbsent(text);
}

function clampChars(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function normalizeSentence(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (!/[。．!?！？]$/.test(t)) t = `${t}。`;
  return t;
}

function extractKarteChallenge(karteSummary: string): string {
  const text = karteSummary.trim();
  if (!text) return "";
  const match = text.match(
    /■\s*最重要課題\s*([\s\S]*?)(?=■\s*(?:判断根拠|最も改善効果が高い行動)|$)/,
  );
  if (!match?.[1]) return "";
  return match[1]
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[。．]+$/u, "");
}

/** クライアント向け「今回のテーマ」一文 */
function buildSessionTheme(
  result: AnalysisResult,
  topPriority: CounselingPriorityItem | undefined,
  lifestyle?: LifestyleSnapshot | null,
): string {
  const metrics = result.metrics;
  const durationMin = parseMinutesRough(metrics.sleepDuration);
  const deepRate = parsePercent(metrics.deepSleepRate);
  const efficiency = parsePercent(metrics.sleepEfficiency);
  const latency = parseMinutesRough(metrics.sleepLatency);
  const awakeRate = parsePercent(metrics.awakeningRate);
  const stress = num(metrics.stress);
  const hrv = num(metrics.hrv);

  // 測定値から最優先テーマを1つ決める（固定文禁止・データ依存）
  type Candidate = { weight: number; theme: string };
  const candidates: Candidate[] = [];

  if (durationMin != null && durationMin < 330) {
    candidates.push({
      weight: 100,
      theme: "今日はまず睡眠時間を30分延ばすことを最優先にしましょう",
    });
  } else if (durationMin != null && durationMin < 390) {
    candidates.push({
      weight: 92,
      theme: "今夜はいつもより15〜30分早く床につき、睡眠時間を確保しましょう",
    });
  }

  if (deepRate != null && deepRate < 12) {
    candidates.push({
      weight: 88,
      theme: "今日は深い睡眠を増やすことを目標にしましょう",
    });
  } else if (deepRate != null && deepRate < 15) {
    candidates.push({
      weight: 78,
      theme: "深い睡眠を育てる夜のルーティンを今日から整えましょう",
    });
  }

  if (efficiency != null && efficiency < 82) {
    candidates.push({
      weight: 86,
      theme: "睡眠効率の改善を今日の最優先にしましょう",
    });
  } else if (efficiency != null && efficiency < 88) {
    candidates.push({
      weight: 72,
      theme: "ベッドでの休息を無駄にしないよう、睡眠効率を意識しましょう",
    });
  }

  if (latency != null && latency >= 30) {
    candidates.push({
      weight: 84,
      theme: "入眠をスムーズにすることを今日のテーマにしましょう",
    });
  }

  if (awakeRate != null && awakeRate >= 15) {
    candidates.push({
      weight: 80,
      theme: "中途覚醒を減らすことを今日の目標にしましょう",
    });
  }

  if (stress != null && stress >= 50) {
    candidates.push({
      weight: 76,
      theme: "就寝前のストレスケアを今日の最優先にしましょう",
    });
  }

  if (hrv != null && hrv < 35) {
    candidates.push({
      weight: 74,
      theme: "副交感神経への切り替えを今日のテーマにしましょう",
    });
  }

  if (
    lifestyle &&
    !isAbsent(lifestyle.alcohol) &&
    isPresent(lifestyle.alcohol)
  ) {
    candidates.push({
      weight: alcoholLate(lifestyle) ? 95 : 70,
      theme: "就寝前の飲酒を見直し、睡眠の質を守ることを最優先にしましょう",
    });
  }

  candidates.sort((a, b) => b.weight - a.weight);
  if (candidates[0]) return candidates[0].theme;

  // AI Insight の最重要課題をクライアント向け一文に圧縮
  const challenge = extractKarteChallenge(result.karteSummary ?? "");
  if (challenge) {
    const short = clampChars(challenge, 42).replace(/[。．…]+$/u, "");
    if (/しましょう|整え|優先|目標/.test(short)) {
      return normalizeSentence(short).replace(/。$/, "");
    }
    return `${short}ことを今日のテーマにしましょう`;
  }

  if (topPriority?.content) {
    const c = topPriority.content.replace(/[。．]+$/u, "");
    return `${c}を今日の最優先にしましょう`;
  }

  return "良い習慣を維持しつつ、今夜できる小さな整えを1つ実践しましょう";
}

function buildImpactFactors(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot | null,
): CounselingImpactFactor[] {
  type Hit = { label: string; reason: string; weight: number };
  const hits: Hit[] = [];
  const metrics = result.metrics;

  const durationMin = parseMinutesRough(metrics.sleepDuration);
  if (durationMin != null && durationMin < 360) {
    hits.push({
      label: "睡眠時間不足",
      reason: `睡眠時間が${formatDurationJa(durationMin)}と短く、身体回復が十分でなかった可能性があります。`,
      weight: 90,
    });
  }

  const efficiency = parsePercent(metrics.sleepEfficiency);
  if (efficiency != null && efficiency < 85) {
    hits.push({
      label: "睡眠効率の低下",
      reason: `睡眠効率が${Math.round(efficiency)}%と低めのため、ベッド時間に対する休息が不足気味です。`,
      weight: 78,
    });
  }

  const deepRate = parsePercent(metrics.deepSleepRate);
  if (deepRate != null && deepRate < 13) {
    hits.push({
      label: "深い睡眠不足",
      reason: `深い睡眠が${Math.round(deepRate)}%と少なめのため、身体の回復が弱まった可能性があります。`,
      weight: 86,
    });
  }

  const hrv = num(metrics.hrv);
  if (hrv != null && hrv < 40) {
    hits.push({
      label: "HRV低下",
      reason: `平均HRVが${Math.round(hrv)}msと低めのため、交感神経優位が残っている可能性があります。`,
      weight: 84,
    });
  }

  const stress = num(metrics.stress);
  if (stress != null && stress >= 45) {
    hits.push({
      label: "ストレス高値",
      reason: `ストレス指標が${Math.round(stress)}と高めのため、入眠や深い休息に影響した可能性があります。`,
      weight: 82,
    });
  }

  const awakeRate = parsePercent(metrics.awakeningRate);
  if (awakeRate != null && awakeRate >= 12) {
    hits.push({
      label: "中途覚醒",
      reason: `夜間覚醒が${Math.round(awakeRate)}%と多めのため、睡眠の連続性が崩れた可能性があります。`,
      weight: 74,
    });
  }

  const latency = parseMinutesRough(metrics.sleepLatency);
  if (latency != null && latency >= 25) {
    hits.push({
      label: "入眠の遅れ",
      reason: `入眠まで約${latency}分かかっており、就寝前の切り替えが弱かった可能性があります。`,
      weight: 72,
    });
  }

  if (lifestyle && !isAbsent(lifestyle.alcohol) && isPresent(lifestyle.alcohol)) {
    hits.push({
      label: alcoholLate(lifestyle) ? "遅い時間の飲酒" : "飲酒",
      reason: alcoholLate(lifestyle)
        ? "就寝に近い飲酒があり、深い睡眠や中途覚醒に影響した可能性があります。"
        : "飲酒があり、睡眠後半の質や回復に影響した可能性があります。",
      weight: alcoholLate(lifestyle) ? 93 : 80,
    });
  }

  if (lifestyle && caffeineLate(lifestyle)) {
    hits.push({
      label: "遅いカフェイン",
      reason: "午後以降のカフェインが残効し、入眠や中途覚醒に影響した可能性があります。",
      weight: 76,
    });
  } else if (
    lifestyle &&
    !isAbsent(lifestyle.caffeine) &&
    isPresent(lifestyle.caffeine)
  ) {
    hits.push({
      label: "カフェイン摂取",
      reason: "カフェイン摂取があり、眠りへの切り替わりに影響した可能性があります。",
      weight: 58,
    });
  }

  if (lifestyle && lateDinner(lifestyle)) {
    hits.push({
      label: "遅い夕食",
      reason: "夕食が遅めのため、消化負担が深い休息を妨げた可能性があります。",
      weight: 70,
    });
  }

  const bath = lifestyle?.bathing ?? "";
  const bathKind = (() => {
    const v = bath.trim();
    if (!v) return null;
    if (/入浴していない/i.test(v) || /^(なし|無し|ない|none)$/i.test(v)) {
      return "none" as const;
    }
    if (/湯船|半身浴|\bbath\b/i.test(v)) return "bath" as const;
    if (/シャワー|shower/i.test(v)) return "shower" as const;
    return "unknown" as const;
  })();
  if (bathKind === "none") {
    hits.push({
      label: "入浴なし",
      reason: "入浴がないと体温リズムが整いにくく、入眠に影響した可能性があります。",
      weight: 55,
    });
  } else if (bathKind === "shower") {
    hits.push({
      label: "シャワーのみ",
      reason: "シャワーのみのため、湯船と比べて体温リズムが整いにくい可能性があります。",
      weight: 52,
    });
  }

  // AI要因があれば、まだ埋まっていない枠を自然な一文で補完
  const aiFactors = [
    ...(result.instructorCounseling?.possibleFactors ?? []),
  ]
    .map((t) => t.trim())
    .filter(Boolean);

  hits.sort((a, b) => b.weight - a.weight);
  const out: CounselingImpactFactor[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    const key = hit.label;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label: hit.label,
      reason: clampChars(normalizeSentence(hit.reason), 52),
    });
    if (out.length >= 5) break;
  }

  for (const factor of aiFactors) {
    if (out.length >= 5) break;
    const key = clampChars(factor, 12);
    if ([...seen].some((s) => factor.includes(s) || s.includes(key))) continue;
    seen.add(key);
    out.push({
      label: key,
      reason: clampChars(normalizeSentence(factor), 52),
    });
  }

  if (out.length === 0) {
    out.push({
      label: "大きな乱れなし",
      reason: "大きな乱れは目立たず、習慣の安定が今日の睡眠を支えた可能性があります。",
    });
  }

  return out;
}

function metricActionForTitle(title: string, result: AnalysisResult): string {
  const t = title.toLowerCase();
  if (/睡眠時間|短眠|足り/.test(t)) {
    return "今夜は就寝時刻を15〜30分早めてください。";
  }
  if (/深|ディープ|深い/.test(t)) {
    return "寝る30分前からスマートフォンを見ない時間をつくってください。";
  }
  if (/効率/.test(t)) {
    return "眠くなってから床につき、ベッドでは睡眠以外を減らしてください。";
  }
  if (/入眠|潜時/.test(t)) {
    return "就寝前にメラトニンヨガ™の呼吸を5分取り入れてください。";
  }
  if (/覚醒|中途/.test(t)) {
    return "就寝前の照明を落とし、寝室を静かに保ってください。";
  }
  if (/飲酒|アルコール/.test(t)) {
    return "飲酒は就寝の2〜3時間前までに終えてください。";
  }
  if (/カフェイン/.test(t)) {
    return "カフェインは就寝6時間前までにしてください。";
  }
  if (/ストレス/.test(t)) {
    return "就寝前に呼吸法を5分行い、交感神経を落ち着かせてください。";
  }
  if (/hrv|心拍|副交感/.test(t)) {
    return "就寝90分前に39〜40℃で15分入浴してください。";
  }
  if (/入浴|風呂/.test(t)) {
    return "就寝90分前に湯船へ入ってください。";
  }
  if (/夕食|食事/.test(t)) {
    return "夕食は就寝の3時間前までに終えてください。";
  }
  const durationMin = parseMinutesRough(result.metrics.sleepDuration);
  if (durationMin != null && durationMin < 360) {
    return "今夜はいつもより15〜30分早く床についてください。";
  }
  return "今夜できる小さな一歩を1つだけ選んで実践してください。";
}

function splitReasonAndAction(
  whyNow: string | undefined,
  title: string,
  result: AnalysisResult,
): { reason: string; action: string } {
  const raw = (whyNow ?? "").trim();
  if (!raw) {
    return {
      reason: `${title}が今回の睡眠データに影響している可能性があります。`,
      action: metricActionForTitle(title, result),
    };
  }

  const parts = raw
    .split(/(?<=[。．])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const reason = normalizeSentence(parts[0]!);
    let action = normalizeSentence(parts.slice(1).join(""));
    // 理由と行動がほぼ同じなら、行動を測定ベースに差し替え
    if (
      action.replace(/[。．\s]/g, "") === reason.replace(/[。．\s]/g, "") ||
      action.includes(title) && reason.includes(title) && action.length < 20
    ) {
      action = metricActionForTitle(title, result);
    }
    // 「〜してください」が理由側にしかない場合の入れ替え
    if (/してください|しましょう|してみて/.test(reason) && !/してください|しましょう/.test(action)) {
      return {
        reason: clampChars(
          normalizeSentence(`${title}が今日の睡眠に影響した可能性があります。`),
          48,
        ),
        action: reason,
      };
    }
    return {
      reason: clampChars(reason, 48),
      action: clampChars(action, 42),
    };
  }

  if (/してください|しましょう|してみて/.test(raw)) {
    return {
      reason: clampChars(
        normalizeSentence(`${title}が今日の睡眠に影響した可能性があります。`),
        48,
      ),
      action: clampChars(normalizeSentence(raw), 42),
    };
  }

  return {
    reason: clampChars(normalizeSentence(raw), 48),
    action: metricActionForTitle(title, result),
  };
}

/** リスクフラグ昇格処理を CounselingPriorityItem 配列に適用するヘルパー */
function applyBreathingRiskElevationCounseling(
  items: CounselingPriorityItem[],
  result: AnalysisResult,
  hint?: SleepRiskHint,
): CounselingPriorityItem[] {
  const tiers: Array<{
    tier: CounselingPriorityItem["tier"];
    tierLabel: CounselingPriorityItem["tierLabel"];
  }> = [
    { tier: "highest", tierLabel: "最優先" },
    { tier: "next", tierLabel: "次に改善" },
    { tier: "optional", tierLabel: "余裕があれば" },
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
  const existingIdx = items.findIndex((item) => SPO2_KEYWORDS.test(item.content));
  const breathingItem: CounselingPriorityItem =
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
          content: "呼吸・酸素の状態確認",
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

function buildPriorities(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot | null,
  hint?: SleepRiskHint,
): CounselingPriorityItem[] {
  const tiers: Array<{
    tier: CounselingPriorityItem["tier"];
    tierLabel: CounselingPriorityItem["tierLabel"];
  }> = [
    { tier: "highest", tierLabel: "最優先" },
    { tier: "next", tierLabel: "次に改善" },
    { tier: "optional", tierLabel: "余裕があれば" },
  ];

  type Cand = {
    content: string;
    reason: string;
    action: string;
    weight: number;
  };
  const cands: Cand[] = [];
  const usedContents = new Set<string>();
  const usedActions = new Set<string>();

  const push = (content: string, reason: string, action: string, weight: number) => {
    const c = content.replace(/[。．]+$/u, "").trim();
    const r = clampChars(normalizeSentence(reason), 48);
    let a = clampChars(normalizeSentence(action), 42);
    if (!c || !r || !a) return;
    if (usedContents.has(c)) return;
    // 理由と行動の重複を避ける
    if (r.replace(/[。．\s]/g, "") === a.replace(/[。．\s]/g, "")) {
      a = metricActionForTitle(c, result);
    }
    if (usedActions.has(a)) {
      a = metricActionForTitle(`${c}-${weight}`, result);
      if (usedActions.has(a)) return;
    }
    usedContents.add(c);
    usedActions.add(a);
    cands.push({ content: c, reason: r, action: a, weight });
  };

  // AI改善（動的）を優先しつつ、理由/行動を分離
  const aiImprovements = [...(result.improvements ?? [])].sort(
    (a, b) => (b.stars ?? 0) - (a.stars ?? 0),
  );
  for (const item of aiImprovements) {
    const title = (item.text ?? "").trim();
    if (!title) continue;
    const { reason, action } = splitReasonAndAction(item.whyNow, title, result);
    const weight =
      item.stars === 5 ? 100 : item.stars === 4 ? 80 : 60;
    push(title, reason, action, weight);
  }

  // 測定値ベースの補完（AIが足りないとき）
  const durationMin = parseMinutesRough(result.metrics.sleepDuration);
  if (durationMin != null && durationMin < 360) {
    push(
      "睡眠時間の確保",
      `実睡眠が${formatDurationJa(durationMin)}と短く、回復が足りない可能性があります。`,
      "今夜は就寝時刻を15〜30分早めてください。",
      95,
    );
  }
  const deepRate = parsePercent(result.metrics.deepSleepRate);
  if (deepRate != null && deepRate < 13) {
    push(
      "深い睡眠の増加",
      `深い睡眠が${Math.round(deepRate)}%と少なめのため、身体回復が弱まった可能性があります。`,
      "寝る30分前から画面を見ない時間をつくってください。",
      88,
    );
  }
  const efficiency = parsePercent(result.metrics.sleepEfficiency);
  if (efficiency != null && efficiency < 85) {
    push(
      "睡眠効率の改善",
      `睡眠効率が${Math.round(efficiency)}%と低めのため、ベッド時間が休息に活かしきれていません。`,
      "眠くなってから床につき、ベッドでの作業を減らしてください。",
      84,
    );
  }
  if (lifestyle && !isAbsent(lifestyle.alcohol) && isPresent(lifestyle.alcohol)) {
    push(
      "就寝前の飲酒見直し",
      "飲酒が睡眠後半の質や深い休息に影響した可能性があります。",
      "飲酒は就寝の2〜3時間前までに終えてください。",
      93,
    );
  }
  const stress = num(result.metrics.stress);
  if (stress != null && stress >= 45) {
    push(
      "就寝前のストレスケア",
      `ストレスが${Math.round(stress)}と高めのため、副交感神経への切り替えが弱い可能性があります。`,
      "就寝前にメラトニンヨガ™の呼吸を5分行ってください。",
      82,
    );
  }
  if (lifestyle && caffeineLate(lifestyle)) {
    push(
      "カフェインのタイミング",
      "午後以降のカフェインが残効し、入眠に影響した可能性があります。",
      "カフェインは就寝6時間前までにしてください。",
      76,
    );
  }
  if (lifestyle && lateDinner(lifestyle)) {
    push(
      "夕食のタイミング",
      "遅い夕食による消化負担が深い休息を妨げた可能性があります。",
      "夕食は就寝の3時間前までに終えてください。",
      70,
    );
  }

  cands.sort((a, b) => b.weight - a.weight);
  const top = cands.slice(0, 3);

  if (top.length === 0) {
    return applyBreathingRiskElevationCounseling(
      [
        {
          ...tiers[0]!,
          content: "良い習慣の継続",
          reason: "大きな乱れは目立たないため、現状のリズム維持が安定につながります。",
          action: "就寝・起床時刻をできるだけそろえてください。",
        },
      ],
      result,
      hint,
    );
  }

  const items = top.map((item, index) => ({
    ...tiers[index]!,
    content: item.content,
    reason: item.reason,
    action: item.action,
  }));

  return applyBreathingRiskElevationCounseling(items, result, hint);
}

function buildInstructorBlocks(
  result: AnalysisResult,
  priorities: CounselingPriorityItem[],
  lifestyle?: LifestyleSnapshot | null,
): InstructorGuidanceBlocks {
  const counseling = result.instructorCounseling;
  const good = (counseling?.goodPoints ?? result.goodPoints ?? [])
    .map((t) => t.trim())
    .filter(Boolean);
  const questionsRaw = (counseling?.questionCandidates ?? [])
    .map((t) => t.trim())
    .filter(Boolean);
  const needs = (counseling?.needsImprovement ?? [])
    .map((t) => t.trim())
    .filter(Boolean);

  // ①最初に褒める
  let praise = "";
  if (good[0]) {
    praise = `「${clampChars(good[0], 32)}」を最初に具体的に褒める`;
  } else {
    const durationMin = parseMinutesRough(result.metrics.sleepDuration);
    praise =
      durationMin != null && durationMin >= 390
        ? "睡眠時間を確保できている点を最初に褒める"
        : "測定を続けている姿勢と、今日の良い点を1つ最初に褒める";
  }

  // ②確認する質問
  const questions: string[] = [];
  for (const q of questionsRaw.slice(0, 2)) {
    questions.push(clampChars(q, 42));
  }
  const deepRate = parsePercent(result.metrics.deepSleepRate);
  if (questions.length < 2 && deepRate != null && deepRate < 13) {
    questions.push("夜のルーティン（光・入浴・画面）を確認する");
  }
  if (questions.length === 0) {
    questions.push("就寝前の過ごし方を確認する");
  }

  // ③生活改善提案
  const lifestyleTips: string[] = [];
  if (priorities[0]?.action) {
    lifestyleTips.push(clampChars(priorities[0].action, 42));
  } else if (needs[0]) {
    lifestyleTips.push(clampChars(`${needs[0]}から整える`, 42));
  }
  if (lifestyle && !isAbsent(lifestyle.alcohol) && isPresent(lifestyle.alcohol)) {
    lifestyleTips.push("飲酒は就寝2〜3時間前までに終える");
  }
  if (lifestyle && (caffeineLate(lifestyle) || isPresent(lifestyle.caffeine))) {
    lifestyleTips.push("カフェインの最終摂取時刻を見直す");
  }
  if (lifestyleTips.length < 2) {
    lifestyleTips.push("朝食・運動・入浴の実施状況を整える");
  }
  const uniqueLifestyle = [...new Set(lifestyleTips)].slice(0, 2);

  // ④次回評価ポイント
  const nextEval = priorities[0]
    ? `次回は「${clampChars(priorities[0].content, 24)}」の変化を重点評価する`
    : "次回は睡眠時間・深い睡眠・睡眠効率の変化を重点評価する";

  return {
    praise: clampChars(praise, 48),
    questions: uniqueQuestions(questions).slice(0, 2),
    lifestyle: uniqueLifestyle,
    nextEval: clampChars(nextEval, 48),
  };
}

function uniqueQuestions(items: string[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (!item) continue;
    if (out.some((x) => x === item || x.includes(item) || item.includes(x))) {
      continue;
    }
    out.push(item);
  }
  return out;
}

export function buildCounselingSheetModel(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot | null,
  hint?: SleepRiskHint,
): CounselingSheetModel {
  const priorities = buildPriorities(result, lifestyle, hint);
  const impactFactors = buildImpactFactors(result, lifestyle);
  const sessionTheme = buildSessionTheme(result, priorities[0], lifestyle);
  const instructorBlocks = buildInstructorBlocks(result, priorities, lifestyle);

  return {
    sessionTheme,
    impactFactors,
    priorities,
    instructorBlocks,
  };
}
