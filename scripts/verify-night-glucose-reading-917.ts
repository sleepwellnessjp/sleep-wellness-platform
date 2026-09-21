/**
 * 若林貴久 9/17 の読み取り文検証。
 * 実行: npx tsx --tsconfig tsconfig.json scripts/verify-night-glucose-reading-917.ts
 *
 * 覚醒は睡眠ステージ 1:26（86分）。体内時計 0:28 は使わない。
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseLibreGlucoseCsv } from "../lib/glucose/parse-libre-csv";
import { buildNightGlucoseReportPayload } from "../lib/glucose/night-glucose-report";

const csvPath = "/Users/taka/Desktop/貴久若林_glucose_2026-9-21 2.csv";

if (!existsSync(csvPath)) {
  console.error("CSV not found:", csvPath);
  process.exit(1);
}

const readings = parseLibreGlucoseCsv(readFileSync(csvPath, "utf8")).map(
  (r) => ({
    recordedAtIso: r.recordedAtIso,
    recordType: r.recordType,
    glucoseMgDl: r.glucoseMgDl,
  }),
);

const payload = buildNightGlucoseReportPayload({
  analysisDate: "2026-09-17",
  sleepOnsetTime: "00:21",
  wakeTime: "08:28",
  readings,
  // 睡眠ステージの覚醒時間 1:26（体内時計 0:28 ではない）
  awakeMinutes: 86,
  awakeDisplay: "1:26",
});

const report = {
  hasData: payload.hasData,
  stats: payload.stats
    ? {
        averageMgDl: payload.stats.averageMgDl,
        min: payload.stats.min.glucoseMgDl,
        max: payload.stats.max.glucoseMgDl,
        rangeMgDl: payload.stats.rangeMgDl,
        sampleCount: payload.stats.sampleCount,
        expectedCount: payload.stats.expectedCount,
        coverageRatio: payload.stats.coverageRatio,
        firstRecordedAtIso: payload.stats.firstRecordedAtIso,
      }
    : null,
  readingText: payload.reading?.text ?? "",
  sentences: payload.reading?.sentences ?? [],
  flags: payload.reading?.flags ?? null,
};

console.log(JSON.stringify(report, null, 2));
writeFileSync(
  "/tmp/night-glucose-reading-917.json",
  JSON.stringify({ ...report, payload }, null, 2),
);
console.log("wrote /tmp/night-glucose-reading-917.json");
