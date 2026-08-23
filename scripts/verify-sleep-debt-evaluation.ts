/**
 * 睡眠負債の符号付き表示評価を検証する。
 * 実行: npx tsx scripts/verify-sleep-debt-evaluation.ts
 */

import { evaluateSleepDebt } from "../lib/ai-analysis";
import { evaluateMetric } from "../lib/report-metric-guide";
import { evaluateSleepDebtDisplay } from "../lib/sleep-debt-evaluation";
import { emptyMetrics } from "../lib/soxai-metrics";
import { parseDurationMinutes } from "../lib/soxai-graphs";

let ok = true;

function check(name: string, pass: boolean, detail?: string) {
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? `: ${detail}` : ""}`);
  if (!pass) ok = false;
}

console.log("=== negative: no stars, label only (案A) ===");
for (const raw of ["-1時間37分", "-1時間40分"]) {
  const signed = parseDurationMinutes(raw)!;
  const debt = evaluateSleepDebtDisplay(signed)!;
  const metricEv = evaluateMetric("sleepDebt", {
    ...emptyMetrics(),
    sleepDebt: raw,
  })!;
  check(
    `${raw} stars null`,
    debt.stars === null && metricEv.stars === null && metricEv.starsLabel === "",
  );
  check(
    `${raw} label`,
    debt.label === "早め就寝の余地" && metricEv.label === "早め就寝の余地",
    metricEv.label,
  );
}

console.log("\n=== positive 8/11: unchanged ★2 やや多い ===");
{
  const raw = "1時間40分";
  const debt = evaluateSleepDebtDisplay(parseDurationMinutes(raw)!)!;
  const metricEv = evaluateMetric("sleepDebt", {
    ...emptyMetrics(),
    sleepDebt: raw,
  })!;
  check(
    "stars ★2",
    debt.stars === 2 &&
      metricEv.stars === 2 &&
      metricEv.starsLabel === "★★☆☆☆",
    metricEv.starsLabel,
  );
  check("label やや多い", metricEv.label === "やや多い");
}

console.log("\n=== other metric unchanged (sleepLatency) ===");
{
  const ev = evaluateMetric("sleepLatency", {
    ...emptyMetrics(),
    sleepLatency: "43分",
  });
  check(
    "latency still has stars",
    Boolean(ev?.stars === 2 && ev.starsLabel.includes("★")),
    ev?.starsLabel,
  );
}

console.log("\n=== wellness score still abs-based ===");
{
  const a = evaluateSleepDebt("-1時間40分");
  const b = evaluateSleepDebt("1時間40分");
  check("same normalizedScore", a.normalizedScore === b.normalizedScore, String(a.normalizedScore));
}

console.log(ok ? "\nALL PASSED" : "\nFAILED");
process.exit(ok ? 0 : 1);
