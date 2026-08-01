/**
 * Trace: API metrics → client merge → confirm display values
 * Run: npx tsx --tsconfig tsconfig.json scripts/trace-confirm-metrics.ts
 */
import fs from "node:fs";
import {
  mapVisibleReadingsToMetrics,
  mergeMetricsFromVisibleReadings,
  normalizeVisibleReadings,
} from "../lib/soxai-reading-map";
import { normalizeMetricsForDisplay } from "../lib/soxai-display-normalize";
import { normalizeMetrics } from "../lib/soxai-metrics";

const path =
  process.argv[2] ?? "/tmp/soxai-ocr-2026-7-31-verify.json.response.json";
const good = JSON.parse(fs.readFileSync(path, "utf8"));
const readings = normalizeVisibleReadings(good.visibleReadings);
const fromReadings = mapVisibleReadingsToMetrics(readings);

const keys = [
  "sleepDuration",
  "deepSleep",
  "deepSleepRate",
  "nonRemSleep",
  "nonRemSleepRate",
  "respiratoryRate",
  "restingHeartRate",
  "awakenings",
] as const;

console.log("=== from visibleReadings map ===");
for (const k of keys) console.log(k, (fromReadings as Record<string, unknown>)[k]);

console.log("\n=== API metrics ===");
for (const k of keys) console.log(k, good.metrics?.[k]);

const confirmA = normalizeMetricsForDisplay(
  normalizeMetrics(mergeMetricsFromVisibleReadings(good.metrics, readings)),
);
console.log("\n=== confirm path (API + readings) ===");
for (const k of keys) console.log(k, (confirmA as Record<string, unknown>)[k]);

const badApi = {
  ...good.metrics,
  sleepDuration: "5時間55分",
  deepSleep: "37分",
  nonRemSleep: "37分",
  respiratoryRate: "",
  restingHeartRate: "",
};
const confirmB = normalizeMetricsForDisplay(
  normalizeMetrics(mergeMetricsFromVisibleReadings(badApi, readings)),
);
console.log("\n=== confirm path (terminal-bad API + readings) ===");
for (const k of keys) console.log(k, (confirmB as Record<string, unknown>)[k]);
