/**
 * 夜間帯グルコース算出の検証。
 * 実行: npx tsx --tsconfig tsconfig.json scripts/test-night-glucose-stats.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { parseLibreGlucoseCsv } from "../lib/glucose/parse-libre-csv";
import {
  computeNightGlucoseStats,
  resolveNightGlucoseWindow,
  NIGHT_GLUCOSE_MIN_POINTS,
} from "../lib/glucose/night-glucose-stats";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("OK:", message);
  }
}

// —— 窓の解決: 日をまたぐ ——
{
  const w = resolveNightGlucoseWindow("2026-09-16", "23:00", "07:00");
  assert(w != null, "cross-midnight window resolves");
  assert(
    w!.startAtIso === new Date("2026-09-15T23:00:00+09:00").toISOString(),
    `onset previous day: ${w?.startAtIso}`,
  );
  assert(
    w!.endAtIso === new Date("2026-09-16T07:00:00+09:00").toISOString(),
    `wake analysis day: ${w?.endAtIso}`,
  );
}

// —— 窓の解決: 深夜入眠（同日） ——
{
  const w = resolveNightGlucoseWindow("2026-09-16", "00:30", "07:00");
  assert(w != null, "same-day after-midnight window resolves");
  assert(
    w!.startAtIso === new Date("2026-09-16T00:30:00+09:00").toISOString(),
    `same-day onset: ${w?.startAtIso}`,
  );
}

// —— 入眠=起床は無効 ——
{
  assert(
    resolveNightGlucoseWindow("2026-09-16", "07:00", "07:00") == null,
    "equal onset/wake invalid",
  );
}

// —— 合成 historic 6点ちょうど ——
{
  const base = Date.parse("2026-09-15T23:00:00+09:00");
  const readings = Array.from({ length: 6 }, (_, i) => ({
    recordedAtIso: new Date(base + i * 15 * 60_000).toISOString(),
    recordType: 0,
    glucoseMgDl: 100 + i * 10,
  }));
  // 途中に scan を混ぜても無視
  readings.push({
    recordedAtIso: new Date(base + 30 * 60_000).toISOString(),
    recordType: 1,
    glucoseMgDl: 999,
  });

  const result = computeNightGlucoseStats({
    analysisDate: "2026-09-16",
    sleepOnsetTime: "23:00",
    wakeTime: "07:00",
    readings,
  });
  assert(result.ok, "6 historic points compute ok");
  if (result.ok) {
    assert(result.stats.sampleCount === 6, `sampleCount=6 got ${result.stats.sampleCount}`);
    assert(result.stats.min.glucoseMgDl === 100, "min=100");
    assert(result.stats.max.glucoseMgDl === 150, "max=150");
    assert(result.stats.rangeMgDl === 50, "range=50");
    assert(result.stats.averageMgDl === 125, `avg got ${result.stats.averageMgDl}`);
    assert(result.stats.cvPercent > 0, `cv>0 got ${result.stats.cvPercent}`);
    // scan 999 は集計に入らない
    assert(result.stats.max.glucoseMgDl !== 999, "scan excluded from max");
  }
}

// —— 5点はスキップ ——
{
  const base = Date.parse("2026-09-15T23:00:00+09:00");
  const readings = Array.from({ length: 5 }, (_, i) => ({
    recordedAtIso: new Date(base + i * 15 * 60_000).toISOString(),
    recordType: 0,
    glucoseMgDl: 110,
  }));
  const result = computeNightGlucoseStats({
    analysisDate: "2026-09-16",
    sleepOnsetTime: "23:00",
    wakeTime: "07:00",
    readings,
  });
  assert(!result.ok && result.reason === "insufficient_points", "5 points skipped");
  assert(
    !result.ok && result.sampleCount === 5,
    `insufficient sampleCount=5 got ${!result.ok ? result.sampleCount : "?"}`,
  );
}

// —— 時刻欠落はスキップ ——
{
  const result = computeNightGlucoseStats({
    analysisDate: "2026-09-16",
    sleepOnsetTime: null,
    wakeTime: "07:00",
    readings: [],
  });
  assert(!result.ok && result.reason === "missing_sleep_times", "missing onset skipped");
}

// —— 実CSV（あれば）で夜間帯を試算 ——
{
  const csvPath = "/Users/taka/Desktop/貴久若林_glucose_2026-9-16.csv";
  if (!existsSync(csvPath)) {
    console.log("SKIP: real CSV not found at", csvPath);
  } else {
    const readings = parseLibreGlucoseCsv(readFileSync(csvPath, "utf8")).map(
      (r) => ({
        recordedAtIso: r.recordedAtIso,
        recordType: r.recordType,
        glucoseMgDl: r.glucoseMgDl,
      }),
    );
    const historic = readings.filter((r) => r.recordType === 0);
    const result = computeNightGlucoseStats({
      analysisDate: "2026-09-16",
      sleepOnsetTime: "22:00",
      wakeTime: "08:00",
      readings,
    });
    console.log(
      "REAL_CSV:",
      JSON.stringify(
        {
          totalParsed: readings.length,
          historicCount: historic.length,
          nightWindow: "2026-09-15 22:00 JST → 2026-09-16 08:00 JST",
          result,
        },
        null,
        2,
      ),
    );
    assert(result.ok, "real CSV night window computes with synthetic SOXAI times");
    if (result.ok) {
      assert(
        result.stats.sampleCount >= NIGHT_GLUCOSE_MIN_POINTS,
        `real sampleCount>=${NIGHT_GLUCOSE_MIN_POINTS} got ${result.stats.sampleCount}`,
      );
      assert(
        result.stats.min.recordedAtIso <= result.stats.max.recordedAtIso ||
          result.stats.min.glucoseMgDl !== result.stats.max.glucoseMgDl,
        "extremum times present",
      );
    }
  }
}

if (!process.exitCode) {
  console.log("\nAll night-glucose checks passed.");
}
