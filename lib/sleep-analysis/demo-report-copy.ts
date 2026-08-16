/**
 * デモ版レポート用の短い文言生成（UI専用）。
 * Score / Priority エンジン結果のみ参照。将来予測は出さない。
 * エンジン文章は維持し、表示時の重複だけを整理する。
 */

import type { CounselingPriorityCard } from "@/lib/sleep-analysis/counseling-view-model";
import type { SleepWellnessGrade } from "@/lib/sleep-analysis/sleep-wellness-score";
import type { SleepWellnessScoreFactor } from "@/lib/sleep-analysis/sleep-wellness-score";
import type { SwmYogaGuidance } from "@/lib/sleep-analysis/swm-yoga-content";

export function buildScoreLeadCopy(input: {
  total: number | null;
  grade: SleepWellnessGrade | null;
  topPriorityLabel: string | null;
}): { evaluation: string; priorityLine: string } {
  const { total, topPriorityLabel } = input;

  let evaluation =
    "今回の睡眠コンディションを確認し、Method で無理なく整えていきましょう。";
  if (total == null) {
    evaluation =
      "指標が限られるため、数値と体感をあわせて、Method を丁寧に進めていきましょう。";
  } else if (total >= 80) {
    evaluation =
      "睡眠コンディションはおおむね安定しています。強みを保ちながら、Method で細かな改善を続けていきましょう。";
  } else if (total >= 65) {
    evaluation =
      "大きな崩れはありません。回復力にはまだ余白があるので、今日は一点に絞って Method を進めましょう。";
  } else if (total >= 50) {
    evaluation =
      "いくつかの指標に改善の余地があります。優先順位をつけて、Method を無理なく進めましょう。";
  } else {
    evaluation =
      "いまは回復を優先する時期です。無理のない範囲で、Method の一歩から始めましょう。";
  }

  const priorityLine = topPriorityLabel
    ? `今日の Method テーマは「${topPriorityLabel}」です。`
    : "今日の Method テーマは、睡眠リズムを保つことです。";

  return { evaluation, priorityLine };
}

/** 良い点・注意点の定型語尾を外し、ラベル中心にする（深さは項目分析・原因へ） */
export function compactSummaryPoint(text: string): string {
  return text
    .replace(/は比較的保たれています。?$/u, "")
    .replace(/に改善余地が見られます。?$/u, "")
    .replace(/を中心に整える余地があります。?$/u, "")
    .trim();
}

/**
 * 分析サマリー：概要（Insight）があるときはそれを核にし、
 * 定型の currentState との重複を避ける。
 */
export function pickAnalysisSummaryBody(input: {
  currentState: string;
  overview?: string | null;
}): { lead: string | null; body: string } {
  const overview = input.overview?.trim() || "";
  const state = input.currentState.trim();
  if (overview) {
    // overview が要因の核。currentState は headline / Goal と重なりやすいので出さない
    return { lead: null, body: overview };
  }
  return { lead: null, body: state };
}

/** PAGE1 総合アセスメント（睡眠アセスメント） */
export type TodayBriefing = {
  /** 現在のアセスメント（3〜4行） */
  diagnosisParagraphs: string[];
  /** 今日の改善テーマ */
  todayTheme: string;
  /** 良かった点 */
  goodPoints: string[];
  /** 改善ポイント */
  improvePoints: string[];
};

export function buildTodayBriefing(input: {
  currentState: string;
  headline: string;
  evaluation: string;
  todayGoal: string;
  top: CounselingPriorityCard | null;
  priorities: CounselingPriorityCard[];
  overview?: string | null;
  totalScore: number | null;
  factors: SleepWellnessScoreFactor[];
}): TodayBriefing {
  const available = input.factors.filter(
    (f) => f.available && f.score != null,
  );
  const strong = available
    .filter((f) => (f.score as number) >= 75)
    .sort((a, b) => {
      const prefer = [
        "sleepDuration",
        "rem",
        "respiratoryRate",
        "restingHeartRate",
      ];
      const ai = prefer.indexOf(a.key);
      const bi = prefer.indexOf(b.key);
      if (ai !== -1 || bi !== -1) {
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      }
      return (b.score as number) - (a.score as number);
    })
    .map((f) => f.label)
    .slice(0, 4);
  const weak = available
    .filter((f) => (f.score as number) < 60)
    .sort((a, b) => (a.score as number) - (b.score as number))
    .map((f) => f.label)
    .slice(0, 3);

  const overlappingItems =
    weak.length > 0
      ? weak
      : input.priorities.slice(0, 3).map((p) => p.label);

  const total = input.totalScore;
  const todayTheme = input.top?.label ?? "睡眠リズム";
  const joined =
    overlappingItems.length > 0 ? overlappingItems.join("・") : "";

  const diagnosisParagraphs: string[] = [];

  if (total == null) {
    diagnosisParagraphs.push(
      "今回は評価に使える指標が限られるため、数値と体感をあわせたアセスメントとします。",
    );
  } else if (total < 50) {
    diagnosisParagraphs.push(
      "現在は、回復を優先したい睡眠コンディションです。",
    );
  } else if (total < 65) {
    diagnosisParagraphs.push(
      "現在は、いくつかの指標に改善余地がある状態です。",
    );
  } else {
    diagnosisParagraphs.push(
      "現在は、大きな睡眠障害は認められません。",
    );
  }

  if (joined) {
    diagnosisParagraphs.push(
      `一方で、${joined}が同時に低下しています。`,
    );
    diagnosisParagraphs.push(
      "これにより、身体の回復力が十分に発揮できていない状態です。",
    );
  } else {
    diagnosisParagraphs.push(
      "主要な指標の組み合わせに、強い悪化パターンは見当たりません。",
    );
  }

  diagnosisParagraphs.push(
    `本日のセッションでは、まず「${todayTheme}」の改善を優先します。`,
  );

  const goodPoints =
    strong.length > 0
      ? strong
      : ["総合点だけで判断せず、強みの観察を続けます"];

  const improvePoints =
    overlappingItems.length > 0 ? overlappingItems : [todayTheme];

  return {
    diagnosisParagraphs,
    todayTheme,
    goodPoints,
    improvePoints,
  };
}

/** アセスメントの根拠用：エンジン文章を短く整形（ロジック非変更） */
export function shortenEvidenceCopy(text: string, keepRatio = 0.62): string {
  const t = text.trim();
  if (!t) return t;
  const max = Math.max(36, Math.round(t.length * keepRatio));
  return shortenReason(t, max).replace(/…$/u, "。");
}

export type FactorInsightRow = {
  key: string;
  label: string;
  score: number;
  status: "strong" | "fair" | "weak";
  measured: string;
  /** 例: 参考値（40〜50代女性）：85〜90% */
  reference: string;
  /** 良好 / 平均 / 低め */
  evalLabel: string;
  reason: string;
};

function formatEvidenceValue(factor: SleepWellnessScoreFactor): string {
  if (factor.inputValue == null) return "未取得";
  const v = factor.inputValue;
  const u = factor.unit;
  if (u === "%") return `${Math.round(v * 10) / 10}%`;
  if (u === "ms") return `${Math.round(v)} ms`;
  if (u === "bpm") return `${Math.round(v)} bpm`;
  if (u === "rpm") return `${Math.round(v * 10) / 10} rpm`;
  if (u === "°C") return `${Math.round(v * 100) / 100} °C`;
  if (u === "min") {
    const h = Math.floor(v / 60);
    const m = Math.round(v % 60);
    if (h > 0) return m === 0 ? `${h}時間` : `${h}時間${m}分`;
    return `${Math.round(v)}分`;
  }
  return String(Math.round(v * 10) / 10);
}

function cohortLabel(
  age: number | null,
  gender: "female" | "male" | "other" | null,
): string {
  let band = "同年代";
  if (age != null) {
    if (age < 30) band = "20代";
    else if (age < 40) band = "30代";
    else if (age < 50) band = "40〜50代";
    else if (age < 60) band = "50代";
    else band = "60代以上";
  }
  if (gender === "female") return `${band}女性`;
  if (gender === "male") return `${band}男性`;
  return `${band}平均`;
}

function hrvReferenceBand(age: number | null): string {
  if (age == null) return "45〜65 ms";
  if (age < 30) return "55〜75 ms";
  if (age < 40) return "50〜70 ms";
  if (age < 50) return "45〜60 ms";
  if (age < 60) return "40〜55 ms";
  return "35〜50 ms";
}

function referenceLineForFactor(
  key: SleepWellnessScoreFactor["key"],
  age: number | null,
  gender: "female" | "male" | "other" | null,
): string {
  const cohort = cohortLabel(age, gender);
  switch (key) {
    case "sleepEfficiency":
      return `参考値（${cohort}）：85〜90%`;
    case "deepSleep":
      return "参考値：60〜100分";
    case "hrv":
      return `参考値（${cohort}）：${hrvReferenceBand(age)}`;
    case "sleepDuration":
      return `参考値（${cohort}）：7〜9時間`;
    case "rem":
      return "参考値：総睡眠の20〜25%";
    case "restingHeartRate":
      return `参考値（${cohort}）：50〜70 bpm`;
    case "respiratoryRate":
      return "参考値：12〜20 回/分";
    case "temperatureDeviation":
      return "参考値：概ね ±0.5 °C以内";
    case "stress":
      return "参考値：日中ストレス負荷が過大でないこと";
    case "recovery":
      return "参考値：回復時間が活動負荷に見合うこと";
    default:
      return `参考値（${cohort}）：一般的な健全帯`;
  }
}

function evalLabelFromScore(score: number): string {
  if (score >= 75) return "良好";
  if (score >= 55) return "平均";
  return "低め";
}

function statusFromScore(score: number): "strong" | "fair" | "weak" {
  if (score >= 75) return "strong";
  if (score >= 55) return "fair";
  return "weak";
}

function reasonForFactor(
  factor: SleepWellnessScoreFactor,
  companions: string[],
): string {
  const score = factor.score ?? 0;
  const others =
    companions.filter((l) => l !== factor.label).slice(0, 2).join("・") || null;

  switch (factor.key) {
    case "sleepEfficiency":
      return score < 60
        ? "同年代平均を大きく下回り、中途覚醒や浅い睡眠の影響が考えられます。"
        : "目安に近づいており、覚醒の少なさが点数を支えています。";
    case "deepSleep":
      return score < 60
        ? others
          ? `深睡眠が少なく身体回復が不足気味です。${others}とも一致します。`
          : "深睡眠が少なく、身体回復の中核が弱い状態です。"
        : "深睡眠はおおむね保たれており、回復を支える強みです。";
    case "hrv":
      return score < 55
        ? others
          ? `年齢を踏まえると極端ではありませんが、${others}と合わせると回復不足の根拠です。`
          : "年齢を踏まえると極端ではありませんが、回復の余白が残ります。"
        : "年齢を踏まえると妥当な範囲で、維持したい指標です。";
    case "sleepDuration":
      return score < 60
        ? "睡眠時間が目安を下回り、他指標を押し下げやすい状態です。"
        : "睡眠時間は確保できています。質の改善が次の焦点です。";
    case "rem":
      return score < 60
        ? "REMが少なめです。気分や記憶の回復に余白があります。"
        : "REMは比較的保たれています。";
    default:
      if (score < 55) {
        return others
          ? `目安より弱く、${others}との重なりが総合点を下げています。`
          : "目安より弱く、総合点を押し下げる要因です。";
      }
      if (score >= 75) {
        return "目安を満たし、総合点を支える強みです。";
      }
      return "おおむね妥当ですが、もう一段整えられる余地があります。";
  }
}

/**
 * 「複数指標から見た読み解き」用の表示行。
 * スコアエンジンは変更せず、全取得項目を表示する。
 */
export function buildFactorInsightRows(input: {
  factors: SleepWellnessScoreFactor[];
  age?: number | null;
  gender?: "female" | "male" | "other" | null;
}): FactorInsightRow[] {
  const age = input.age ?? null;
  const gender = input.gender ?? null;
  const available = input.factors
    .filter((f) => f.available && f.score != null)
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100));

  const weakLabels = available
    .filter((f) => (f.score as number) < 60)
    .map((f) => f.label);

  return available.map((f) => {
    const score = f.score as number;
    return {
      key: f.key,
      label: f.label,
      score,
      status: statusFromScore(score),
      measured: formatEvidenceValue(f),
      reference: referenceLineForFactor(f.key, age, gender),
      evalLabel: evalLabelFromScore(score),
      reason: reasonForFactor(f, weakLabels),
    };
  });
}

/** @deprecated buildFactorInsightRows を使用 */
export type AssessmentEvidenceRow = {
  key: string;
  label: string;
  score: number | null;
  valueDisplay: string;
  reference: string;
  assessment: string;
};

/** @deprecated buildFactorInsightRows を使用 */
export function buildAssessmentEvidenceRows(input: {
  factors: SleepWellnessScoreFactor[];
  age?: number | null;
  gender?: "female" | "male" | "other" | null;
}): AssessmentEvidenceRow[] {
  return buildFactorInsightRows(input).map((r) => ({
    key: r.key,
    label: r.label,
    score: r.score,
    valueDisplay: r.measured,
    reference: r.reference,
    assessment: r.reason,
  }));
}

/**
 * 優先理由の表示用整理。
 * 数値・スコア行や Insight 定型（Page1 で既出）だけ外し、判断の芯は残す。
 */
export function compactPriorityReason(
  reason: string,
  options?: { isTop?: boolean },
): string {
  let t = reason.trim();
  // Page1 の項目スコアと重複
  t = t.replace(/項目スコアは\s*\d+\s*点で、改善余地が大きいです。?/gu, "");
  // Page1 原因分析と重複する定型
  t = t.replace(/Insight\s*でも関連する複合パターンが検出されています。?/gu, "");
  // 「低い状態です。現在値は 67% です。」→「低い状態です（現在値 67%）。」
  t = t.replace(/。現在値は\s*([^。]+?)\s*です。/u, (_, v: string) => `（現在値 ${v.trim()}）。`);
  // 余分な空白
  t = t.replace(/\s+。/g, "。").replace(/。\s+/g, "。");
  // 2位以降は「複合的な優先課題」の言い回しが Top1 と被りやすい
  if (!options?.isTop) {
    t = t.replace(
      /あわせて\s*([^。]+)\s*も弱いため、単独指標ではなく複合的な優先課題です。?/gu,
      "あわせて $1 も弱い状態です。",
    );
  }
  return t.replace(/\s{2,}/g, " ").replace(/。\s*。/g, "。").trim();
}

/** Prescription 用：なぜこの優先か（一文） */
export function priorityWhyOneLiner(item: CounselingPriorityCard): string {
  const compact = compactPriorityReason(item.reason, {
    isTop: item.rank === 1,
  });
  const parts = compact
    .split(/。/u)
    .map((s) => s.trim())
    .filter(Boolean);
  const preferred =
    parts.find((s) => /てこ|中核|波及|優先|比率|回復/.test(s)) ??
    parts.find((s) => !/現在値|低い状態|不足気味|評価が低め/.test(s)) ??
    parts[0] ??
    compact;
  const line = preferred.endsWith("。") ? preferred : `${preferred}。`;
  return shortenReason(line, 68).replace(/…$/u, "。");
}

/** 評価ラベル（点数に対応） */
export function factorEvalLabel(score: number | null): string {
  if (score == null) return "未取得";
  if (score >= 85) return "良好";
  if (score >= 70) return "おおむね良好";
  if (score >= 55) return "改善余地あり";
  return "優先して整えたい";
}

/** スコア内訳の「なぜ」一行（短く） */
export function factorWhyLine(factor: SleepWellnessScoreFactor): string {
  if (!factor.available || factor.score == null) return "今回は未取得です。";
  const measured =
    factor.inputValue != null
      ? `${factor.inputValue}${factor.unit ? ` ${factor.unit}` : ""} · `
      : "";
  const s = factor.score;
  if (s >= 75) return `${measured}総合点を支えている強みです。`;
  if (s >= 60) return `${measured}もう一段整えられる余地があります。`;
  if (s >= 45) return `${measured}総合点を押し下げている要因です。`;
  return `${measured}最優先で整える候補です。`;
}

/** Prescription の優先度スター（視覚用） */
export function prescriptionStars(rank: 1 | 2 | 3): string {
  if (rank === 1) return "★★★★★";
  if (rank === 2) return "★★★★☆";
  return "★★★☆☆";
}

/** Prescription の「今日やること」短文 */
export function prescriptionTodayAction(item: CounselingPriorityCard): string {
  const policy = item.shortPolicy.trim();
  if (policy.startsWith("まずは「") && policy.endsWith("」を優先します。")) {
    return policy.slice("まずは「".length, -"」を優先します。".length);
  }
  return policy || "今日できる小さな一歩から始めましょう。";
}

/** 理由文を読み上げやすい長さに整える */
export function shortenReason(reason: string, max = 96): string {
  const t = reason.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildYogaWhyToday(
  kind: "day" | "night",
  top: CounselingPriorityCard | null,
): string {
  // 「今日は◯◯がテーマ」は Goal / 優先順位で既出のため、処方の接続だけ書く
  if (!top) {
    return kind === "day"
      ? "日中の切り替えを整え、夜の休息へつなげるためです。"
      : "就寝前に、活動から休息へ切り替えるためです。";
  }
  if (kind === "day") {
    if (top.key === "stress" || top.key === "hrv" || top.key === "recovery") {
      return "日中に短い切り替えを入れ、負荷を溜めすぎないことが大切です。";
    }
    if (top.key === "sleepEfficiency" || top.key === "sleepLatency") {
      return "昼のリズムを整えることが、夜の入眠と効率の改善につながります。";
    }
    if (top.key === "temperatureDeviation") {
      return "日中の活動と休息のメリハリが、リズムの安定を助けます。";
    }
    return `「${top.label}」を支えるため、まず昼の切り替えから整えます。`;
  }
  if (
    top.key === "deepSleep" ||
    top.key === "sleepLatency" ||
    top.key === "sleepEfficiency" ||
    top.key === "rem"
  ) {
    return "就寝前に、休息へ向かう準備を丁寧に行います。";
  }
  return `「${top.label}」に合わせて、夜は刺激を増やさず休息へ切り替えます。`;
}

/** Today's Action（Page3）用の短リスト */
export function buildTodayActionLines(input: {
  priorities: CounselingPriorityCard[];
  dayYoga: SwmYogaGuidance;
  nightYoga: SwmYogaGuidance;
}): string[] {
  const lines: string[] = [];
  const top = input.priorities[0];
  if (top) {
    lines.push(`${top.label}：${prescriptionTodayAction(top)}`);
  }
  lines.push(
    `${input.dayYoga.brandName}（${input.dayYoga.timeOfDay}）`,
  );
  lines.push(
    `${input.nightYoga.brandName}（${input.nightYoga.timeOfDay}）`,
  );
  return lines;
}

/** 認定講師がクライアントへ話しかける読み上げ（寄り添い・自然体） */
export function buildInstructorReadAloud(input: {
  clientName?: string | null;
  evaluation: string;
  priorityLine: string;
  priorities: CounselingPriorityCard[];
  dayYoga: SwmYogaGuidance;
  nightYoga: SwmYogaGuidance;
  dayWhy: string;
  nightWhy: string;
  weeklyPoint?: string | null;
  analysisOverview?: string | null;
}): string {
  const name = input.clientName?.trim() || "";
  const top = input.priorities[0];
  const action = top ? prescriptionTodayAction(top) : "";

  const paragraphs: string[] = [];

  paragraphs.push(
    name ? `${name}様、今日もお疲れさまです。` : "今日もお疲れさまです。",
  );

  if (top) {
    paragraphs.push(
      `いまの睡眠は、大きく崩れているわけではありません。今日は「${top.label}」を、ていねいに見ていきましょう。`,
    );
    paragraphs.push(
      `まずは「${action}」からで大丈夫です。昼は${input.dayYoga.brandName}、夜は${input.nightYoga.brandName}で支えていきます。`,
    );
  } else {
    paragraphs.push(input.evaluation);
  }

  paragraphs.push(
    "無理に変えなくて大丈夫です。来週、また一緒に確認しましょう。",
  );

  return paragraphs.join("\n\n");
}
