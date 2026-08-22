/**
 * alignScoreNarrativesToLocked の助詞重複・SWS重複を検証する。
 * 実行: npx tsx scripts/verify-score-narrative-align.ts
 */

import {
  alignScoreNarrativesToLocked,
  hasScoreParticleDuplication,
} from "../lib/analysis-fast-path";

const lockedCategories = {
  body: 74,
  mind: 87,
  lifestyle: 76,
  environment: 57,
};

const cases = [
  {
    name: "scoreComment: SWS 74点は（報告例1）",
    lockedScore: 74,
    scoreComment:
      "Sleep Wellness Score 74点は、全体的に良好な状態を示していますが、環境57点には改善の余地があります。",
    categoryScoreRationales: undefined,
  },
  {
    name: "scoreComment: SWS 77点は＋文中2回目（報告例2）",
    lockedScore: 77,
    scoreComment:
      "Sleep Wellness Score 77点は、身体側のSleep Wellness Score 77点や心の87点が支えています。",
    categoryScoreRationales: undefined,
  },
  {
    name: "categoryScoreRationales: 身体は71点は",
    lockedScore: 77,
    scoreComment: "",
    categoryScoreRationales: {
      body: "身体は71点は、睡眠時間の短さが影響しています。",
      mind: "心77点は、HRVとストレス管理が良好です。",
      lifestyle: "生活76点は、飲酒習慣が影響しています。",
      environment: "環境57点は、寝室環境の改善が求められます。",
    },
  },
  {
    name: "scoreComment: 既に正しい表記（退行しない）",
    lockedScore: 74,
    scoreComment:
      "Sleep Wellness Score は74点。心（87点）が特に高く、身体74点は良好です。",
    categoryScoreRationales: undefined,
  },
];

function runOnce(run: number): boolean {
  console.log(`\n=== run ${run} ===`);
  let ok = true;

  for (const c of cases) {
    const aligned = alignScoreNarrativesToLocked({
      scoreComment: c.scoreComment,
      categoryScoreRationales: c.categoryScoreRationales,
      lockedScore: c.lockedScore,
      lockedCategories,
    });

    const texts: string[] = [aligned.scoreComment];
    if (aligned.categoryScoreRationales) {
      texts.push(...Object.values(aligned.categoryScoreRationales));
    }

    const dup = texts.filter((t) => t && hasScoreParticleDuplication(t));
    const passed = dup.length === 0;

    console.log(`\n[${passed ? "PASS" : "FAIL"}] ${c.name}`);
    if (aligned.scoreComment) {
      console.log(`  scoreComment: ${aligned.scoreComment}`);
    }
    if (aligned.categoryScoreRationales) {
      for (const [key, text] of Object.entries(aligned.categoryScoreRationales)) {
        console.log(`  ${key}: ${text}`);
      }
    }
    if (!passed) {
      console.log(`  particle dup: ${dup.join(" | ")}`);
      ok = false;
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
