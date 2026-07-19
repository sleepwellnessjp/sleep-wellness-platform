/**
 * 複数画像OCR結果の統合ロジック検証
 * ラベル一致 + 画面種別優先（順番非依存・補完）
 * 実行: npx tsx --tsconfig tsconfig.json scripts/test-soxai-merge.ts
 */
import {
  mergeImageExtractResults,
  type ImageExtractResult,
} from "../lib/soxai-merge";
import {
  mapVisibleReadingsToMetricsDetailed,
} from "../lib/soxai-reading-map";
import { emptyMetrics, type AnalysisMetrics } from "../lib/soxai-metrics";

function metrics(partial: Partial<AnalysisMetrics>): AnalysisMetrics {
  return { ...emptyMetrics(), ...partial };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("OK:", message);
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// —— 実ログ再現: 5枚統合で誤採用していたケース ——
{
  const home = mapVisibleReadingsToMetricsDetailed([
    { label: "QoL", value: "50" },
    { label: "昨日のスコア", value: "50" },
    { label: "睡眠", value: "71" },
    { label: "体調", value: "75" },
    { label: "心拍数", value: "64" },
  ]);
  const sleepDetail = mapVisibleReadingsToMetricsDetailed([
    { label: "睡眠", value: "5時間32分" },
    { label: "全就床時間", value: "6時間10分" },
    { label: "入眠潜時", value: "12分" },
    { label: "睡眠効率", value: "87%" },
    { label: "睡眠負債", value: "-40分" },
    { label: "体内時計", value: "やや遅れ" },
  ]);
  const stages = mapVisibleReadingsToMetricsDetailed([
    { label: "覚醒", value: "8%" },
    { label: "レム睡眠", value: "22%" },
    { label: "浅い睡眠", value: "55%" },
    { label: "深い睡眠", value: "15%" },
    { label: "覚醒時間", value: "28分" },
    { label: "レム睡眠時間", value: "0:49" },
    { label: "浅い睡眠時間", value: "3:10" },
    { label: "深い睡眠時間", value: "1:05" },
    { label: "平均酸素レベル", value: "96%" },
  ]);
  const vitals = mapVisibleReadingsToMetricsDetailed([
    { label: "安静時心拍数 最小", value: "52" },
    { label: "安静時心拍数 平均", value: "64" },
    { label: "心拍変動 平均", value: "42 ms" },
    { label: "心拍変動 最大", value: "80 ms" },
  ]);
  const chart = mapVisibleReadingsToMetricsDetailed([
    { label: "平均", value: "60" },
    { label: "最大", value: "85" },
    { label: "睡眠スコア", value: "60" },
    { label: "睡眠スコア", value: "60" },
  ]);

  assert(home.metrics.sleepScore === 71, "map: ホーム「睡眠」→ sleepScore 71");
  assert(
    sleepDetail.metrics.sleepDuration === "5時間32分",
    "map: 詳細「睡眠」時間 → sleepDuration",
  );
  assert(
    sleepDetail.metrics.sleepLatency === "12分",
    "map: 入眠潜時 → sleepLatency（bedtime に誤マップしない）",
  );
  assert(
    stages.metrics.remSleep === "0:49",
    "map: レム睡眠時間 → remSleep（sleepDuration にしない）",
  );
  assert(
    !stages.metrics.sleepDuration || stages.metrics.sleepDuration === "",
    "map: ステージ画面から sleepDuration を取らない",
  );
  assert(
    vitals.metrics.restingHeartRate === "64",
    "map: 安静時心拍数は平均を最小より優先",
  );

  const five: ImageExtractResult[] = [
    {
      imageIndex: 0,
      metrics: home.metrics,
      readings: [
        { label: "QoL", value: "50" },
        { label: "昨日のスコア", value: "50" },
        { label: "睡眠", value: "71" },
        { label: "体調", value: "75" },
        { label: "心拍数", value: "64" },
      ],
      provenance: home.provenance,
      visibleReadingCount: 5,
    },
    {
      imageIndex: 1,
      metrics: sleepDetail.metrics,
      readings: [
        { label: "睡眠", value: "5時間32分" },
        { label: "全就床時間", value: "6時間10分" },
        { label: "入眠潜時", value: "12分" },
        { label: "睡眠効率", value: "87%" },
        { label: "睡眠負債", value: "-40分" },
        { label: "体内時計", value: "やや遅れ" },
      ],
      provenance: sleepDetail.provenance,
      visibleReadingCount: 6,
    },
    {
      imageIndex: 2,
      metrics: stages.metrics,
      readings: [
        { label: "覚醒", value: "8%" },
        { label: "レム睡眠", value: "22%" },
        { label: "浅い睡眠", value: "55%" },
        { label: "深い睡眠", value: "15%" },
        { label: "覚醒時間", value: "28分" },
        { label: "レム睡眠時間", value: "0:49" },
        { label: "浅い睡眠時間", value: "3:10" },
        { label: "深い睡眠時間", value: "1:05" },
        { label: "平均酸素レベル", value: "96%" },
      ],
      provenance: stages.provenance,
      visibleReadingCount: 9,
    },
    {
      imageIndex: 3,
      metrics: vitals.metrics,
      readings: [
        { label: "安静時心拍数 最小", value: "52" },
        { label: "安静時心拍数 平均", value: "64" },
        { label: "心拍変動 平均", value: "42 ms" },
        { label: "心拍変動 最大", value: "80 ms" },
      ],
      provenance: vitals.provenance,
      visibleReadingCount: 4,
    },
    {
      imageIndex: 4,
      metrics: chart.metrics,
      readings: [
        { label: "平均", value: "60" },
        { label: "最大", value: "85" },
        { label: "睡眠スコア", value: "60" },
      ],
      provenance: chart.provenance,
      visibleReadingCount: 6,
    },
  ];

  const { metrics: merged } = mergeImageExtractResults(shuffle(five));
  assert(merged.sleepScore === 71, "5枚実ログ: 睡眠スコアは71（チャート60ではない）");
  assert(
    merged.sleepDuration === "5時間32分",
    "5枚実ログ: 睡眠時間は5時間32分（レム0:49ではない）",
  );
  assert(
    merged.restingHeartRate === "64" ||
      merged.restingHeartRate === "64 bpm",
    "5枚実ログ: 安静時心拍数は64（最小52ではない）",
  );
  assert(merged.remSleep === "0:49", "5枚実ログ: レム睡眠時間は remSleep に保持");
  assert(merged.sleepLatency === "12分", "5枚実ログ: 入眠潜時を保持");
}

// —— 睡眠スコア明記画面（チャートでない）をホーム「睡眠」より優先 ——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      visibleReadingCount: 5,
      readings: [
        { label: "QoL", value: "50" },
        { label: "睡眠", value: "71" },
        { label: "体調", value: "75" },
        { label: "心拍数", value: "64" },
        { label: "昨日のスコア", value: "50" },
      ],
      provenance: { sleepScore: "睡眠" },
      metrics: metrics({ sleepScore: 71, restingHeartRate: "64" }),
    },
    {
      imageIndex: 1,
      visibleReadingCount: 3,
      readings: [
        { label: "睡眠スコア", value: "78" },
        { label: "睡眠時間", value: "6時間10分" },
        { label: "睡眠効率", value: "90%" },
      ],
      provenance: { sleepScore: "睡眠スコア", sleepDuration: "睡眠時間" },
      metrics: metrics({
        sleepScore: 78,
        sleepDuration: "6時間10分",
        sleepEfficiency: "90%",
      }),
    },
  ];
  const { metrics: merged } = mergeImageExtractResults(results);
  assert(
    merged.sleepScore === 78,
    "詳細の「睡眠スコア」ラベルをホーム「睡眠」より優先",
  );
}

// —— 安静時心拍数ラベルをホーム心拍数より優先 ——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      visibleReadingCount: 4,
      readings: [
        { label: "QoL", value: "50" },
        { label: "睡眠", value: "71" },
        { label: "体調", value: "75" },
        { label: "心拍数", value: "64" },
      ],
      provenance: { restingHeartRate: "心拍数" },
      metrics: metrics({ restingHeartRate: "64" }),
    },
    {
      imageIndex: 1,
      visibleReadingCount: 2,
      readings: [
        { label: "安静時心拍数", value: "58 bpm" },
        { label: "心拍変動", value: "40 ms" },
      ],
      provenance: { restingHeartRate: "安静時心拍数", hrv: "心拍変動" },
      metrics: metrics({ restingHeartRate: "58 bpm", hrv: "40 ms" }),
    },
  ];
  const { metrics: merged } = mergeImageExtractResults(results);
  assert(
    merged.restingHeartRate === "58 bpm",
    "「安静時心拍数」ラベルを「心拍数」より優先",
  );
}

// —— 2枚: 補完 + 詳細画面の sleepScore ——
{
  const twoImages: ImageExtractResult[] = [
    {
      imageIndex: 0,
      visibleReadingCount: 4,
      readings: [
        { label: "QoL", value: "50" },
        { label: "睡眠", value: "78" },
        { label: "体調", value: "60" },
        { label: "心拍数", value: "58 bpm" },
      ],
      provenance: {
        sleepScore: "睡眠",
        qol: "QoL",
        restingHeartRate: "心拍数",
      },
      metrics: metrics({
        sleepScore: 78,
        restingHeartRate: "58 bpm",
        qol: "50",
      }),
    },
    {
      imageIndex: 1,
      visibleReadingCount: 8,
      readings: [
        { label: "睡眠スコア", value: "82" },
        { label: "睡眠時間", value: "6時間42分" },
        { label: "睡眠効率", value: "87%" },
        { label: "レム睡眠時間", value: "1時間20分" },
        { label: "深い睡眠時間", value: "1時間05分" },
      ],
      provenance: {
        sleepScore: "睡眠スコア",
        sleepDuration: "睡眠時間",
        remSleep: "レム睡眠時間",
        deepSleep: "深い睡眠時間",
      },
      metrics: metrics({
        sleepScore: 82,
        sleepDuration: "6時間42分",
        sleepEfficiency: "87%",
        remSleep: "1時間20分",
        deepSleep: "1時間05分",
      }),
    },
  ];

  const { metrics: merged, conflicts } = mergeImageExtractResults(twoImages);
  assert(merged.sleepScore === 82, "2枚: 「睡眠スコア」明記側を採用");
  assert(
    merged.restingHeartRate === "58 bpm",
    "2枚: 不足項目を他画像から補完 (RHR)",
  );
  assert(
    merged.sleepDuration === "6時間42分",
    "2枚: 不足項目を他画像から補完 (duration)",
  );
  assert(merged.qol === "50", "2枚: QoL を保持");
  assert(
    conflicts.some((c) => c.key === "sleepScore"),
    "2枚: sleepScore 競合を記録",
  );

  const a = mergeImageExtractResults(twoImages).metrics;
  const b = mergeImageExtractResults([...twoImages].reverse()).metrics;
  assert(
    a.sleepScore === b.sleepScore &&
      a.restingHeartRate === b.restingHeartRate &&
      a.sleepDuration === b.sleepDuration,
    "2枚: 逆順でも同じ統合結果",
  );
}

// —— 単純補完（競合なし）——
{
  const fiveImages: ImageExtractResult[] = [
    {
      imageIndex: 0,
      visibleReadingCount: 3,
      readings: [{ label: "睡眠スコア", value: "70" }],
      provenance: { sleepScore: "睡眠スコア" },
      metrics: metrics({ sleepScore: 70, bedtime: "23:40" }),
    },
    {
      imageIndex: 1,
      visibleReadingCount: 5,
      readings: [{ label: "睡眠時間", value: "6時間40分" }],
      provenance: { sleepDuration: "睡眠時間" },
      metrics: metrics({ wakeTime: "06:20", sleepDuration: "6時間40分" }),
    },
    {
      imageIndex: 2,
      visibleReadingCount: 6,
      metrics: metrics({
        sleepEfficiency: "88%",
        awakenings: "32分",
        awakeningRate: "8%",
      }),
    },
    {
      imageIndex: 3,
      visibleReadingCount: 7,
      metrics: metrics({
        remSleep: "1時間10分",
        remSleepRate: "21%",
        lightSleep: "3時間",
        deepSleep: "1時間",
      }),
    },
    {
      imageIndex: 4,
      visibleReadingCount: 5,
      metrics: metrics({
        hrv: "42 ms",
        spo2: "96%",
        stress: "28",
        restingHeartRate: "56 bpm",
      }),
    },
  ];

  const { metrics: merged } = mergeImageExtractResults(shuffle(fiveImages));
  assert(merged.sleepScore === 70, "5枚補完: sleepScore");
  assert(merged.bedtime === "23:40", "5枚補完: bedtime");
  assert(merged.wakeTime === "06:20", "5枚補完: wakeTime");
  assert(merged.hrv === "42 ms", "5枚補完: hrv");
  assert(merged.spo2 === "96%", "5枚補完: spo2");
  assert(merged.awakeningRate === "8%", "5枚補完: awakeningRate");
}

if (process.exitCode) {
  console.error("\nSome merge tests failed.");
} else {
  console.log("\nAll merge tests passed.");
}
