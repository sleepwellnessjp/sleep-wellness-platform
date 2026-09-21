/**
 * 夜間帯グルコース算出の検証。
 * 実行: npx tsx --tsconfig tsconfig.json scripts/test-night-glucose-stats.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { parseLibreGlucoseCsv } from "../lib/glucose/parse-libre-csv";
import {
  computeNightGlucoseStats,
  expectedHistoricCount,
  resolveFallbackNightWindow,
  resolveNightGlucoseWindow,
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

// —— フォールバック 22:00–07:00 ——
{
  const w = resolveFallbackNightWindow("2026-09-17");
  assert(w.sleepOnsetTime === "22:00", "fallback onset 22:00");
  assert(w.wakeTime === "07:00", "fallback wake 07:00");
}

// —— 9/17 検証 CSV（Desktop） ——
{
  const csvPath = "/Users/taka/Desktop/貴久若林_glucose_2026-9-21 2.csv";
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
    const result = computeNightGlucoseStats({
      analysisDate: "2026-09-17",
      sleepOnsetTime: "00:21",
      wakeTime: "08:28",
      readings,
    });
    assert(result.ok, "9/17 night stats ok");
    if (result.ok) {
      const s = result.stats;
      assert(s.sampleCount === 30, `sampleCount=30 got ${s.sampleCount}`);
      assert(s.expectedCount === 33, `expectedCount=33 got ${s.expectedCount}`);
      assert(s.averageMgDl === 85.4, `avg=85.4 got ${s.averageMgDl}`);
      assert(s.min.glucoseMgDl === 80, `min=80 got ${s.min.glucoseMgDl}`);
      assert(s.max.glucoseMgDl === 94, `max=94 got ${s.max.glucoseMgDl}`);
      const startClock = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(s.firstRecordedAtIso));
      assert(startClock === "01:10", `first record 01:10 got ${startClock}`);
      console.log(
        "REAL_CSV_9/17:",
        JSON.stringify(
          {
            sampleCount: s.sampleCount,
            expectedCount: s.expectedCount,
            coverageRatio: s.coverageRatio,
            averageMgDl: s.averageMgDl,
            min: s.min.glucoseMgDl,
            max: s.max.glucoseMgDl,
            firstRecordedAtIso: s.firstRecordedAtIso,
          },
          null,
          2,
        ),
      );
    }
  }
}

// —— expected count 公式 ——
{
  const start = "2026-09-16T15:21:00.000Z"; // 00:21 JST
  const end = "2026-09-16T23:28:00.000Z"; // 08:28 JST
  assert(
    expectedHistoricCount(start, end) === 33,
    "expectedHistoricCount 00:21–08:28 = 33",
  );
}

console.log(
  process.exitCode ? "DONE with failures" : "DONE all assertions passed",
);
