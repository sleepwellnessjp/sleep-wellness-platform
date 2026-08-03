/**
 * Oura fixture → AnalysisMetrics 変換の簡易確認スクリプト。
 * 実行: npx tsx scripts/check-oura-fixture.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mapOuraVisionToExtraction } from "../lib/oura-metrics";

const path = resolve(
  process.cwd(),
  "fixtures/oura/sample-vision-result.json",
);
const raw = JSON.parse(readFileSync(path, "utf8"));
const mapped = mapOuraVisionToExtraction(raw);

console.log("device fixture OK");
console.log("sleepDuration:", mapped.metrics.sleepDuration);
console.log("deepSleep:", mapped.metrics.deepSleep);
console.log("lightSleep:", mapped.metrics.lightSleep);
console.log("remSleep:", mapped.metrics.remSleep);
console.log("nonRem (internal):", mapped.metrics.nonRemSleep);
console.log("hrv:", mapped.metrics.hrv);
console.log("readiness:", mapped.ouraScores.readinessScore);
console.log("imageKeys:", mapped.imageKeys.length);
console.log(
  "sleep contributors:",
  Object.keys(mapped.deviceSpecificMetrics.sleepContributors).length,
);
