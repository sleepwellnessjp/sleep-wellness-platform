/**
 * 体内時計・睡眠負債の方向断定回避を検証。
 * 実行: npx tsx scripts/verify-duration-direction-ambiguity.ts
 */

import {
  evaluateCircadianRhythm,
  evaluateSleepDebt,
  evaluateAllItems,
  computeWellnessScore,
  generateImprovementItems,
  type AiSleepAnalysisInput,
} from "../lib/ai-analysis";
import { evaluateMetric } from "../lib/report-metric-guide";
import { emptyMetrics } from "../lib/soxai-metrics";
import {
  isDurationDirectionAmbiguous,
  DURATION_AMBIGUOUS_LABEL_CIRCADIAN,
  DURATION_AMBIGUOUS_LABEL_SLEEP_DEBT,
} from "../lib/duration-direction-ambiguity";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

console.log("=== isDurationDirectionAmbiguous ===");
const ambiguityCases = [
  { raw: "-1:00 進み気味", ctx: "circadian" as const, expect: true },
  { raw: "1:00", ctx: "circadian" as const, expect: true },
  { raw: "1時間", ctx: "circadian" as const, expect: true },
  { raw: "-1時間21分", ctx: "circadian" as const, expect: false },
  { raw: "-1時間28分", ctx: "circadian" as const, expect: false },
  { raw: "やや遅れ", ctx: "circadian" as const, expect: false },
  { raw: "-1時間 負債多め", ctx: "sleepDebt" as const, expect: true },
  { raw: "+1時間 前倒し余地", ctx: "sleepDebt" as const, expect: true },
  { raw: "-1時間37分", ctx: "sleepDebt" as const, expect: false },
] as const;

for (const c of ambiguityCases) {
  const got = isDurationDirectionAmbiguous(c.raw, c.ctx).ambiguous;
  assert(got === c.expect, `${c.ctx} ${c.raw}: expected ${c.expect}, got ${got}`);
  console.log(`[PASS] ${c.ctx} ${c.raw} → ambiguous=${got}`);
}

console.log("\n=== evaluateCircadianRhythm ===");
const circAmb = evaluateCircadianRhythm("-1:00 進み気味");
assert(circAmb.signal === "direction_ambiguous", "signal should be direction_ambiguous");
assert(!/遅れ|前倒し|進んで|遅れて/.test(circAmb.note), "note must not assert direction");
console.log(`[PASS] -1:00 進み気味 → signal=${circAmb.signal}, note=${circAmb.note}`);

const circClear = evaluateCircadianRhythm("-1時間21分");
assert(circClear.signal === "delayed", "clear negative should stay delayed");
console.log(`[PASS] -1時間21分 → signal=${circClear.signal}`);

const circUnsigned = evaluateCircadianRhythm("1時間");
assert(circUnsigned.signal === "direction_ambiguous", "unsigned should be ambiguous");
console.log(`[PASS] 1時間 → signal=${circUnsigned.signal}`);

console.log("\n=== evaluateMetric stars/label ===");
const evAmb = evaluateMetric("circadianRhythm", {
  ...emptyMetrics(),
  circadianRhythm: "-1:00 進み気味",
});
assert(evAmb?.stars == null, "circadian ambiguous: no stars");
assert(evAmb?.label === DURATION_AMBIGUOUS_LABEL_CIRCADIAN, "circadian label");
console.log(`[PASS] circadian eval → label=${evAmb?.label}, stars=${evAmb?.stars ?? "null"}`);

const evClear = evaluateMetric("circadianRhythm", {
  ...emptyMetrics(),
  circadianRhythm: "-1時間21分",
});
assert(evClear == null, "clear circadian keeps null eval (unchanged)");
console.log("[PASS] -1時間21分 evaluateMetric → null (unchanged)");

console.log("\n=== scores unchanged ===");
function wellnessScore(input: AiSleepAnalysisInput): number {
  return computeWellnessScore(evaluateAllItems(input));
}

const baseInput = (circadian: string, sleepDebt = "-1時間37分"): AiSleepAnalysisInput => ({
  metrics: {
    sleepScore: 64,
    sleepDuration: "6時間10分",
    sleepEfficiency: "89%",
    deepSleep: "2時間17分",
    remSleep: "1時間17分",
    awakenings: "43分",
    hrv: "57 ms",
    stress: "35",
    restingHeartRate: "59 bpm",
    circadianRhythm: circadian,
    sleepDebt,
    sleepLatency: "43分",
    spo2: "95%",
    respiratoryRate: "12 rpm",
    skinTemperature: "-0.3℃",
  },
  lifestyle: {},
});

const scoreClear = wellnessScore(baseInput("-1時間21分"));
const scoreAmb = wellnessScore(baseInput("-1:00 進み気味"));
const scoreNumericEquivalent = wellnessScore(baseInput("-1:00"));
const scoreUnsigned = wellnessScore(baseInput("1時間"));
assert(
  scoreAmb === scoreNumericEquivalent,
  `ambiguous should match numeric equivalent: ${scoreAmb} vs ${scoreNumericEquivalent}`,
);
assert(
  scoreUnsigned === wellnessScore(baseInput("1:00")),
  "unsigned variants should share score",
);
console.log(
  `[PASS] wellnessScore: clear=${scoreClear}, ambiguous=${scoreAmb}, -1:00=${scoreNumericEquivalent}, unsigned=${scoreUnsigned}`,
);

console.log("\n=== improvement items (⑦) no direction ===");
const items = evaluateAllItems(baseInput("-1:00 進み気味"));
const improvements = generateImprovementItems(items);
const circImp = improvements.find(
  (i) => /体内時計/.test(i.text) || /体内時計/.test(i.whyNow ?? ""),
);
if (circImp) {
  const copy = `${circImp.whyNow ?? ""}${circImp.text}`;
  assert(!/進んで|遅れて|前倒しの可能性|遅れが示唆/.test(copy), "⑦ must not assert direction");
  console.log(`[PASS] ⑦ neutral copy: ${circImp.text.slice(0, 40)}…`);
} else {
  console.log("[PASS] circadian not in top improvements (OK)");
}

console.log("\n=== sleepDebt ambiguous ===");
const debtEv = evaluateMetric("sleepDebt", {
  ...emptyMetrics(),
  sleepDebt: "1時間28分",
});
assert(debtEv?.stars == null, "unsigned sleep debt: no stars");
assert(debtEv?.label === DURATION_AMBIGUOUS_LABEL_SLEEP_DEBT, "sleep debt label");
console.log(`[PASS] sleepDebt 1時間28分 → label=${debtEv?.label}`);

console.log("\nALL PASSED");
