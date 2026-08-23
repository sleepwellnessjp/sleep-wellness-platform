/**
 * 調査専用: 睡眠バランスの入力・%分母をログ出力（本番コードは変更しない）
 * 実行: npx tsx scripts/debug-sleep-balance-stages.ts
 */

import { buildCounselingReportContent } from "../lib/counseling-report";
import { computeSleepStageSummary, parseDurationMinutes, parsePercent } from "../lib/soxai-graphs";
import { emptyMetrics, type AnalysisMetrics } from "../lib/soxai-metrics";
import type { AnalysisResult } from "../lib/analysis-session";

function mins(v: string) {
  return parseDurationMinutes(v);
}
function pct(v: string) {
  return parsePercent(v);
}

function logCase(
  name: string,
  metrics: AnalysisMetrics,
  note: string,
) {
  console.log("\n" + "=".repeat(72));
  console.log(name);
  console.log(note);
  console.log("=".repeat(72));

  const sleepM = mins(metrics.sleepDuration);
  const awakeM = mins(metrics.awakenings);
  const remM = mins(metrics.remSleep);
  const lightM = mins(metrics.lightSleep);
  const deepM = mins(metrics.deepSleep);
  const remP = pct(metrics.remSleepRate);
  const lightP = pct(metrics.lightSleepRate);
  const deepP = pct(metrics.deepSleepRate);
  const awakeP = pct(metrics.awakeningRate);

  console.log("\n[1] 入力 metrics（生・表示用文字列）");
  console.log({
    sleepDuration: metrics.sleepDuration,
    awakenings: metrics.awakenings,
    awakeningRate: metrics.awakeningRate || "(空)",
    remSleep: metrics.remSleep,
    remSleepRate: metrics.remSleepRate,
    lightSleep: metrics.lightSleep,
    lightSleepRate: metrics.lightSleepRate,
    deepSleep: metrics.deepSleep,
    deepSleepRate: metrics.deepSleepRate,
  });

  console.log("\n[2] 分数パース");
  console.log({
    sleepM,
    awakeM,
    remM,
    lightM,
    deepM,
    "rem+light+deep": (remM ?? 0) + (lightM ?? 0) + (deepM ?? 0),
    "sleep - (rem+light+deep)":
      sleepM != null
        ? sleepM - ((remM ?? 0) + (lightM ?? 0) + (deepM ?? 0))
        : null,
    "timeInBed≈sleep+awake":
      sleepM != null && awakeM != null ? sleepM + awakeM : null,
  });

  console.log("\n[3] 仮説チェック: light ?= sleep - rem - deep - awake");
  if (sleepM != null && remM != null && deepM != null && awakeM != null) {
    const hyp = sleepM - remM - deepM - awakeM;
    console.log({
      formula: "sleep - rem - deep - awake",
      intermediate: `${sleepM} - ${remM} - ${deepM} - ${awakeM}`,
      result: hyp,
      actualLight: lightM,
      match: lightM === hyp,
    });
  }
  console.log("\n[3b] 候補選定用ターゲット（reading-map）: sleep - rem - deep（覚醒なし）");
  if (sleepM != null && remM != null && deepM != null) {
    const target = sleepM - remM - deepM;
    console.log({
      formula: "sleep - rem - deep",
      intermediate: `${sleepM} - ${remM} - ${deepM}`,
      target,
      actualLight: lightM,
      match: lightM === target,
    });
  }

  console.log("\n[4] % と想定分母");
  const bed = sleepM != null && awakeM != null ? sleepM + awakeM : null;
  for (const [label, m, p] of [
    ["awake", awakeM, awakeP],
    ["rem", remM, remP],
    ["light", lightM, lightP],
    ["deep", deepM, deepP],
  ] as const) {
    const vsSleep =
      m != null && sleepM != null && sleepM > 0
        ? Math.round((m / sleepM) * 1000) / 10
        : null;
    const vsBed =
      m != null && bed != null && bed > 0
        ? Math.round((m / bed) * 1000) / 10
        : null;
    console.log({
      label,
      storedRate: p,
      impliedIfDenomSleep: vsSleep,
      impliedIfDenomBed: vsBed,
      closerTo:
        p == null
          ? "n/a"
          : vsSleep != null && vsBed != null
            ? Math.abs(vsSleep - p) <= Math.abs(vsBed - p)
              ? "sleepDuration"
              : "sleep+awake(bed)"
            : "?",
    });
  }
  console.log({
    rateSumRemLightDeep: (remP ?? 0) + (lightP ?? 0) + (deepP ?? 0),
    rateSumAll4: (awakeP ?? 0) + (remP ?? 0) + (lightP ?? 0) + (deepP ?? 0),
  });

  console.log("\n[5] computeSleepStageSummary（浅い睡眠の再計算はしない）");
  const summary = computeSleepStageSummary(metrics);
  console.log({
    rem: summary.rem.combined,
    light: summary.light.combined,
    deep: summary.deep.combined,
    lightMinutesFromSummary: summary.light.minutes,
    lightPercentFromSummary: summary.light.percent,
  });

  console.log("\n[6] PDF buildStages 出力");
  const fake = {
    score: 50,
    scoreBreakdown: {
      sleepDuration: 2,
      sleepEfficiency: 2,
      deepSleep: 2,
      hrv: 3,
      stress: 3,
      spo2: 4,
      recovery: 3,
    },
    categoryScores: { body: 50, mind: 50, lifestyle: 50, environment: 50 },
    metrics,
    summary: "",
    karteSummary: "",
    goodPoints: [],
    improvements: [],
    profileRelation: "",
    scoreComment: "",
    todaysRecommendations: [],
    nextComparisonPoints: [],
    recommendationsUntilNext: [],
    caution: "",
    disclaimer: "",
  } as unknown as AnalysisResult;
  const report = buildCounselingReportContent(fake);
  for (const s of report.stages) {
    console.log(`  ${s.label}: valueText=${s.valueText} barPercent≈${Math.round(s.percent)}%`);
  }
}

// --- 8/06: PDFに出ていた metrics（不整合） ---
const pdf806: AnalysisMetrics = {
  ...emptyMetrics(),
  sleepDuration: "4時間38分",
  awakenings: "1時間15分",
  remSleep: "26分",
  remSleepRate: "7%",
  lightSleep: "2時間17分",
  lightSleepRate: "50%",
  deepSleep: "40分",
  deepSleepRate: "9%",
};

// --- 8/06: SOXAI 原画面（IMG_2790）の実測 ---
const soxai806: AnalysisMetrics = {
  ...emptyMetrics(),
  sleepDuration: "4時間38分",
  awakenings: "1時間15分",
  awakeningRate: "21%",
  remSleep: "26分",
  remSleepRate: "7%",
  lightSleep: "2時間17分",
  lightSleepRate: "39%",
  deepSleep: "1時間55分",
  deepSleepRate: "33%",
};

// --- 8/17: 整合する PDF／画面相当 ---
const ok817: AnalysisMetrics = {
  ...emptyMetrics(),
  sleepDuration: "6時間10分",
  awakenings: "43分",
  awakeningRate: "10%",
  remSleep: "1時間17分",
  remSleepRate: "19%",
  lightSleep: "2時間36分",
  lightSleepRate: "38%",
  deepSleep: "2時間17分",
  deepSleepRate: "33%",
};

logCase(
  "A. 2026-08-06 PDFに出ていた値",
  pdf806,
  "症状再現。深い40分・浅い率50% は原画面と不一致の可能性を検証",
);
logCase(
  "B. 2026-08-06 SOXAI原画面（IMG_2790）実測",
  soxai806,
  "深い1:55・33% / 浅い2:17・39% / 覚醒21%。分母は全就床5:53",
);
logCase(
  "C. 2026-08-17（整合する例）",
  ok817,
  "レム+浅い+深い=睡眠時間。%は睡眠+覚醒が分母",
);

console.log("\n\n### コード上の結論メモ");
console.log(
  "- computeSleepStageSummary / buildStages は浅い睡眠を sleep-rem-deep-awake では計算しない",
);
console.log(
  "- lightSleep は OCR「浅い睡眠」行。候補が複数のとき reading-map が sleep-rem-deep に近い方を優先（覚醒は引かない）",
);
console.log(
  "- PDF③の valueText は metrics の時間・率をほぼそのまま表示（%の再算出は棒グラフ幅用）",
);
