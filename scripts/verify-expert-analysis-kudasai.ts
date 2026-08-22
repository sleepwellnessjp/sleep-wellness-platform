/**
 * PDF⑤「睡眠ウェルネス分析」の「ください」二重付与を検証する。
 * 実行: npx tsx scripts/verify-expert-analysis-kudasai.ts
 */

import {
  appendKudasaiIfNeeded,
  hasBrokenKudasaiSuffix,
} from "../lib/append-kudasai-if-needed";
import { getExpertAnalysis } from "../lib/data/practice/expert-analysis";
import type { PracticeMetrics } from "../lib/data/practice/types";

/** 報告例（2026-08-16 / 2026-08-06 で再現） */
const BROKEN_ACTION =
  "就寝を前倒しし、少なくとも6時間30分以上の睡眠機会を確保すると回復の土台が整いやすくなります";

/** 8/11・8/17 相当：テンプレート経路（priority と課題不一致 → paragraphsFromPriority 不使用） */
const REGRESSION_ONSET_METRICS: PracticeMetrics = {
  sleepLatencyMinutes: 43,
  wakeMinutes: 20,
  hrvMs: 57,
  restingHrBpm: 59,
  deepSleepMinutes: 137,
  sleepEfficiencyPercent: 89,
};

/** 8/11・8/17：onset テンプレートがそのまま使われるケース */
const REGRESSION_TEMPLATE_PRIORITY = [
  {
    title: "平均SpO₂",
    reason: "平均SpO₂が91%と低めです。",
    action: "鼻呼吸や側臥位など、呼吸が安定しやすい姿勢を試すことが有効です",
  },
];

/** 4件の実データ相当（睡眠時間短め → AI action が なります 終止） */
const REAL_CASES = [
  {
    label: "2026-08-16（若林香織）相当",
    metrics: {
      sleepLatencyMinutes: 25,
      wakeMinutes: 15,
      hrvMs: 52,
      restingHrBpm: 62,
      deepSleepMinutes: 90,
      sleepEfficiencyPercent: 84,
    } satisfies PracticeMetrics,
    priority: [
      {
        title: "睡眠時間",
        reason: "睡眠時間5時間22分は短めです。",
        action: BROKEN_ACTION,
      },
    ],
  },
  {
    label: "2026-08-06（若林貴久）相当",
    metrics: {
      sleepLatencyMinutes: 31,
      wakeMinutes: 43,
      hrvMs: 56,
      restingHrBpm: 51,
      deepSleepMinutes: 109,
      sleepEfficiencyPercent: 90,
    } satisfies PracticeMetrics,
    priority: [
      {
        title: "睡眠時間",
        reason: "睡眠時間が短めです。深睡眠・効率・HRVへの影響が出やすい状態です。",
        action:
          "就寝を前倒しし、睡眠機会を延ばすと回復の土台が整いやすくなります",
      },
    ],
  },
  {
    label: "2026-08-11 非再現（テンプレ維持）",
    metrics: REGRESSION_ONSET_METRICS,
    priority: REGRESSION_TEMPLATE_PRIORITY,
    expectUnchanged: true,
  },
  {
    label: "2026-08-17 非再現（テンプレ維持）",
    metrics: REGRESSION_ONSET_METRICS,
    priority: REGRESSION_TEMPLATE_PRIORITY,
    expectUnchanged: true,
  },
] as const;

function assertNoBroken(text: string, ctx: string): boolean {
  if (hasBrokenKudasaiSuffix(text)) {
    console.error(`[FAIL] ${ctx}: broken suffix in: ${text}`);
    return false;
  }
  return true;
}

function runOnce(run: number): boolean {
  console.log(`\n=== run ${run} ===`);
  let ok = true;

  // 純粋関数
  const fixed = appendKudasaiIfNeeded(BROKEN_ACTION);
  console.log("\n[appendKudasaiIfNeeded]");
  console.log(`  in:  ${BROKEN_ACTION}`);
  console.log(`  out: ${fixed}`);
  ok =
    assertNoBroken(fixed, "appendKudasaiIfNeeded") &&
    ok &&
    fixed === BROKEN_ACTION &&
    !fixed.includes("ください");

  const imperative = appendKudasaiIfNeeded("就寝前30分はデジタルオフにする");
  ok =
    assertNoBroken(imperative, "imperative") &&
    ok &&
    imperative === "就寝前30分はデジタルオフにするください";

  // 4ケース getExpertAnalysis
  const templateBaselines = new Map<string, string[]>();

  for (const c of REAL_CASES) {
    const paragraphs = getExpertAnalysis(c.metrics, [...c.priority]);
    const joined = paragraphs.join("\n");
    const last = paragraphs[paragraphs.length - 1] ?? "";

    console.log(`\n[${c.label}]`);
    console.log(`  paragraphs: ${paragraphs.length}`);
    console.log(`  last: ${last}`);

    ok = assertNoBroken(joined, c.label) && ok;

    if ("expectUnchanged" in c && c.expectUnchanged) {
      const key = c.label;
      if (!templateBaselines.has(key)) {
        templateBaselines.set(key, paragraphs);
      } else {
        const baseline = templateBaselines.get(key)!;
        const same =
          baseline.length === paragraphs.length &&
          baseline.every((p, i) => p === paragraphs[i]);
        console.log(`  unchanged vs baseline: ${same ? "YES" : "NO"}`);
        if (!same) {
          console.error("  baseline last:", baseline[baseline.length - 1]);
          console.error("  current last:", last);
          ok = false;
        }
      }
    } else {
      ok = ok && last.includes("整いやすくなります") && !last.includes("ください");
    }
  }

  return ok;
}

let allOk = true;
for (let i = 1; i <= 3; i += 1) {
  allOk = runOnce(i) && allOk;
}

console.log(`\n${allOk ? "ALL 3 RUNS PASSED" : "SOME RUNS FAILED"}`);
process.exit(allOk ? 0 : 1);
