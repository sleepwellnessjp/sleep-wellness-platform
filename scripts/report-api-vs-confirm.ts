import fs from "node:fs";
import {
  mergeMetricsFromVisibleReadings,
  normalizeVisibleReadings,
} from "../lib/soxai-reading-map";
import { normalizeMetricsForDisplay } from "../lib/soxai-display-normalize";
import { normalizeMetrics } from "../lib/soxai-metrics";
import { applyNonRemFromStageOcr } from "../lib/soxai-merge";

const path =
  process.argv[2] ?? "/tmp/soxai-ocr-2026-7-31-pathfix.json.response.json";
const api = JSON.parse(fs.readFileSync(path, "utf8"));
const readings = normalizeVisibleReadings(api.visibleReadings);
const confirm = normalizeMetricsForDisplay(
  normalizeMetrics(mergeMetricsFromVisibleReadings(api.metrics, readings)),
);
applyNonRemFromStageOcr(confirm);

const apiDisp = normalizeMetricsForDisplay(normalizeMetrics(api.metrics));
applyNonRemFromStageOcr(apiDisp);

const reportKeys = [
  ["睡眠時間", "sleepDuration"],
  ["ノンレム睡眠時間", "deepSleep"],
  ["ノンレム睡眠率", "deepSleepRate"],
  ["呼吸速度", "respiratoryRate"],
  ["安静時心拍数", "restingHeartRate"],
] as const;

let ok = true;
for (const [label, key] of reportKeys) {
  const a = String(apiDisp[key] ?? "").trim();
  const c = String(confirm[key] ?? "").trim();
  const match = a === c;
  if (!match) ok = false;
  console.log(`\n${label}`);
  console.log(`API: ${a || "(空)"}`);
  console.log(`確認画面: ${c || "(空)"}`);
  console.log(match ? "一致" : "不一致");
}
console.log(ok ? "\nPASS" : "\nFAIL");
process.exitCode = ok ? 0 : 1;
