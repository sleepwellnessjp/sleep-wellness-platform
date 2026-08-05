/**
 * Oura Vision E2E（Chromiumなし）:
 * 合成スクリーンショット → /api/vision-oura → confirm 自動入力相当の metrics を検証。
 *
 * 前提: 開発サーバーが起動していること（既定 http://127.0.0.1:3000）
 * 実行: node scripts/check-oura-vision-e2e.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.OURA_VISION_BASE_URL || "http://127.0.0.1:3000";
const imagePath = resolve(
  process.cwd(),
  "fixtures/oura/synthetic-oura-screen.png",
);

const failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

const png = readFileSync(imagePath);
const dataUrl = `data:image/png;base64,${png.toString("base64")}`;

console.log("[oura-vision-e2e] POST", `${baseUrl}/api/vision-oura`, {
  imageBytes: png.length,
  dataUrlChars: dataUrl.length,
});

const response = await fetch(`${baseUrl}/api/vision-oura`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ images: [dataUrl] }),
});

const payload = await response.json();
console.log("[oura-vision-e2e] status", response.status);
console.log("[oura-vision-e2e] ouraScores", payload.ouraScores);
console.log("[oura-vision-e2e] imageKeys", payload.imageKeys?.length);
if (!response.ok) {
  console.error("[oura-vision-e2e] error payload", payload);
  process.exit(1);
}

const metrics = payload.metrics || {};
const scores = payload.ouraScores || {};

assert(payload.device === "oura", "device must be oura");
assert(scores.sleepScore === 78, `sleepScore expected 78, got ${scores.sleepScore}`);
assert(
  scores.readinessScore === 72,
  `readinessScore expected 72, got ${scores.readinessScore}`,
);
assert(
  scores.activityScore === 85,
  `activityScore expected 85, got ${scores.activityScore}`,
);
assert(
  String(metrics.sleepDuration || "").includes("6") &&
    String(metrics.sleepDuration || "").includes("52"),
  `sleepDuration should reflect 6h52m, got ${metrics.sleepDuration}`,
);
assert(metrics.bedtime === "23:42", `bedtime expected 23:42, got ${metrics.bedtime}`);
assert(metrics.wakeTime === "07:30", `wakeTime expected 07:30, got ${metrics.wakeTime}`);
assert(
  String(metrics.lightSleep || "").length > 0,
  "lightSleep must be present as separate stage",
);
assert(
  String(metrics.deepSleep || "").length > 0,
  "deepSleep must be present as separate stage",
);
assert(
  String(metrics.remSleep || "").length > 0,
  "remSleep must be present as separate stage",
);
assert(
  Array.isArray(payload.imageKeys) && payload.imageKeys.length >= 8,
  `imageKeys should be enough for confirm autofill, got ${payload.imageKeys?.length}`,
);

if (failures.length) {
  console.error("Oura Vision E2E FAILED:");
  for (const item of failures) console.error(" -", item);
  process.exit(1);
}

console.log("Oura Vision E2E OK — confirm autofill values are available:");
for (const key of [
  "sleepScore",
  "sleepDuration",
  "bedtime",
  "wakeTime",
  "lightSleep",
  "deepSleep",
  "remSleep",
  "hrv",
  "restingHeartRate",
]) {
  console.log(`  ${key}:`, metrics[key]);
}
