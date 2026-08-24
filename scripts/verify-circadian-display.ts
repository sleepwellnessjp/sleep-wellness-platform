/**
 * 体内時計の表示を「〜時間〜分」に統一する検証。
 * 実行: npx tsx scripts/verify-circadian-display.ts
 */

import { buildCounselingReportContent } from "../lib/counseling-report";
import {
  formatDurationDisplay,
  normalizeMetricDisplayValue,
} from "../lib/soxai-display-normalize";
import type { AnalysisResult } from "../lib/analysis-session";
import { emptyMetrics } from "../lib/soxai-metrics";

const CASES = [
  { label: "2026-08-20 相当（負）", circadian: "-1:21", expect: "-1時間21分" },
  { label: "負の短い偏移", circadian: "-0:39", expect: "-39分" },
  {
    label: "OCR suffix 付き（進み気味）",
    circadian: "-1:00 進み気味",
    expect: "-1時間",
  },
  {
    label: "正の値（時間分・変更なし）",
    circadian: "1時間32分",
    expect: "1時間32分",
  },
  { label: "正の値（分のみ・変更なし）", circadian: "21分", expect: "21分" },
] as const;

function findCircadianValue(result: ReturnType<typeof buildCounselingReportContent>): string | null {
  const all = [...result.keyMetrics, ...result.analysisGuideMetrics];
  const hit = all.find((m) => m.key === "circadianRhythm" || m.label === "体内時計");
  return hit?.value ?? null;
}

function baseResult(circadian: string): AnalysisResult {
  return {
    score: 77,
    scoreBreakdown: {
      sleepDuration: 3,
      sleepEfficiency: 4,
      deepSleep: 4,
      hrv: 4,
      stress: 4,
      spo2: 4,
      recovery: 4,
    },
    categoryScores: { body: 74, mind: 87, lifestyle: 76, environment: 57 },
    metrics: {
      ...emptyMetrics(),
      sleepScore: 64,
      sleepDuration: "6時間10分",
      sleepEfficiency: "89%",
      bedtime: "23:51",
      wakeTime: "06:44",
      awakenings: "43分",
      remSleep: "1時間17分",
      deepSleep: "2時間17分",
      restingHeartRate: "59 bpm",
      hrv: "57 ms",
      sleepDebt: "-1時間37分",
      sleepLatency: "43分",
      circadianRhythm: circadian,
      respiratoryRate: "12 rpm",
      spo2: "95%",
    },
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
}

let ok = true;

console.log("=== unit: normalizeMetricDisplayValue(circadianRhythm) ===");
for (const c of CASES) {
  const got = normalizeMetricDisplayValue("circadianRhythm", c.circadian);
  const pass = got === c.expect;
  console.log(`[${pass ? "PASS" : "FAIL"}] ${c.label}: ${c.circadian} → ${got}`);
  if (!pass) ok = false;
}

console.log("\n=== sleepDebt unchanged (same formatter) ===");
const debtSamples = ["-1時間37分", "-40分", "1時間20分", "-1:00 進み気味"];
for (const raw of debtSamples) {
  const viaDebt = normalizeMetricDisplayValue("sleepDebt", raw);
  const expect =
    raw === "-1:00 進み気味"
      ? "-1時間"
      : raw === "-1時間37分" || raw === "-40分" || raw === "1時間20分"
        ? raw
        : viaDebt;
  const pass = viaDebt === expect;
  console.log(`[${pass ? "PASS" : "FAIL"}] sleepDebt ${raw} → ${viaDebt}`);
  if (!pass) ok = false;
}

console.log("\n=== PDF KEY DATA (buildCounselingReportContent) ===");
for (const c of CASES) {
  const report = buildCounselingReportContent(baseResult(c.circadian));
  const value = findCircadianValue(report);
  const debt = [...report.keyMetrics, ...report.analysisGuideMetrics].find(
    (m) => m.key === "sleepDebt" || m.label === "睡眠負債",
  )?.value;
  const pass = value === c.expect;
  console.log(
    `[${pass ? "PASS" : "FAIL"}] ${c.label}: circadian=${value} debt=${debt ?? "(not in key tiles)"}`,
  );
  if (!pass) ok = false;
  if (debt && debt !== "-1時間37分") {
    console.error("  sleepDebt changed unexpectedly:", debt);
    ok = false;
  }
}

console.log(ok ? "\nALL PASSED" : "\nFAILED");
process.exit(ok ? 0 : 1);
