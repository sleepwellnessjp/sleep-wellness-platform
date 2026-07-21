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
      screenType: "home",
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
      screenType: "sleep_detail",
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

// —— ホーム「睡眠」を他画面の睡眠スコアより優先（競合にしない）——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "home",
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
      screenType: "sleep_detail",
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
  const { metrics: merged, conflicts } = mergeImageExtractResults(results);
  assert(
    merged.sleepScore === 71,
    "ホーム「睡眠」を他画面の「睡眠スコア」より優先",
  );
  assert(
    !conflicts.some((c) => c.key === "sleepScore"),
    "ホーム採用時は sleepScore を競合にしない",
  );
  assert(
    merged.sleepDuration === "6時間10分",
    "ホームに無い睡眠時間は詳細画面から補完",
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

// —— 2枚: ホーム優先 + 不足項目の補完（ホーム採用は競合にしない）——
{
  const twoImages: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "home",
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
      screenType: "sleep_detail",
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
  assert(merged.sleepScore === 78, "2枚: ホーム「睡眠」を採用");
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
    !conflicts.some((c) => c.key === "sleepScore"),
    "2枚: ホーム採用の sleepScore は競合にしない",
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

// —— 皮膚温度: skin_temp 画面の「平均 +0.2」を取得 ——
{
  const mapped = mapVisibleReadingsToMetricsDetailed(
    [
      { label: "平均", value: "+0.2" },
      { label: "最大", value: "+0.5" },
    ],
    { screenType: "skin_temp" },
  );
  assert(
    mapped.metrics.skinTemperature === "+0.2",
    "map: skin_temp 画面の平均 → skinTemperature",
  );

  const explicit = mapVisibleReadingsToMetricsDetailed([
    { label: "皮膚温度", value: "+0.3℃" },
  ]);
  assert(
    explicit.metrics.skinTemperature === "+0.3℃",
    "map: 皮膚温度ラベル → skinTemperature",
  );
}

// —— 入眠・起床: 詳細画面をステージ画面より優先 ——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "sleep_stages",
      visibleReadingCount: 4,
      readings: [
        { label: "開始", value: "22:10" },
        { label: "終了", value: "07:50" },
        { label: "レム睡眠", value: "20%" },
        { label: "深い睡眠", value: "15%" },
      ],
      provenance: { bedtime: "開始", wakeTime: "終了" },
      metrics: metrics({ bedtime: "22:10", wakeTime: "07:50", remSleepRate: "20%" }),
    },
    {
      imageIndex: 1,
      screenType: "sleep_detail",
      visibleReadingCount: 4,
      readings: [
        { label: "入眠時間", value: "23:40" },
        { label: "起床時間", value: "06:20" },
        { label: "睡眠効率", value: "88%" },
        { label: "入眠潜時", value: "14分" },
      ],
      provenance: {
        bedtime: "入眠時間",
        wakeTime: "起床時間",
        sleepEfficiency: "睡眠効率",
        sleepLatency: "入眠潜時",
      },
      metrics: metrics({
        bedtime: "23:40",
        wakeTime: "06:20",
        sleepEfficiency: "88%",
        sleepLatency: "14分",
      }),
    },
  ];

  for (const order of [results, [...results].reverse()]) {
    const { metrics: merged } = mergeImageExtractResults(order);
    assert(
      merged.bedtime === "23:40",
      "入眠: sleep_detail を stages 端点より優先",
    );
    assert(
      merged.wakeTime === "06:20",
      "起床: sleep_detail を stages 端点より優先",
    );
  }
}

// —— ストレス: stress 画面を優先 ——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "home",
      visibleReadingCount: 2,
      readings: [
        { label: "QoL", value: "50" },
        { label: "ストレス", value: "10" },
      ],
      provenance: { stress: "ストレス" },
      metrics: metrics({ stress: "10", qol: "50" }),
    },
    {
      imageIndex: 1,
      screenType: "stress",
      visibleReadingCount: 2,
      readings: [
        { label: "平均ストレス", value: "32" },
        { label: "ストレスレベル", value: "低め" },
      ],
      provenance: { stress: "平均ストレス" },
      metrics: metrics({ stress: "32" }),
    },
  ];
  const { metrics: merged } = mergeImageExtractResults(results);
  assert(merged.stress === "32", "ストレス: stress 画面の平均を優先");
}

// —— 皮膚温度: skin_temp 画面を他画面より優先 ——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "sleep_detail",
      visibleReadingCount: 1,
      readings: [{ label: "皮膚温", value: "+0.1℃" }],
      provenance: { skinTemperature: "皮膚温" },
      metrics: metrics({ skinTemperature: "+0.1℃" }),
    },
    {
      imageIndex: 1,
      screenType: "skin_temp",
      visibleReadingCount: 1,
      readings: [{ label: "皮膚温度", value: "+0.4℃" }],
      provenance: { skinTemperature: "皮膚温度" },
      metrics: metrics({ skinTemperature: "+0.4℃" }),
    },
  ];
  const { metrics: merged } = mergeImageExtractResults(shuffle(results));
  assert(
    merged.skinTemperature === "+0.4℃",
    "皮膚温度: skin_temp 画面を優先",
  );
}

// —— 日本語時刻・複合テキスト・辞書強化 ——
{
  const jpBed = mapVisibleReadingsToMetricsDetailed([
    { label: "入眠時間", value: "23時40分" },
    { label: "起床時間", value: "午前6:20" },
  ]);
  assert(jpBed.metrics.bedtime === "23:40", "map: 23時40分 → bedtime");
  assert(jpBed.metrics.wakeTime === "06:20", "map: 午前6:20 → wakeTime");

  const compound = mapVisibleReadingsToMetricsDetailed([
    { label: "睡眠時間帯", value: "入眠 23:40 / 起床 06:20" },
  ]);
  assert(
    compound.metrics.bedtime === "23:40",
    "map: 複合テキストから bedtime",
  );
  assert(
    compound.metrics.wakeTime === "06:20",
    "map: 複合テキストから wakeTime",
  );

  const shushin = mapVisibleReadingsToMetricsDetailed([
    { label: "就寝", value: "0:15" },
    { label: "起床", value: "7:05" },
  ]);
  assert(shushin.metrics.bedtime === "00:15", "map: 就寝 → bedtime");
  assert(shushin.metrics.wakeTime === "07:05", "map: 起床 → wakeTime");

  // 入眠潜時は bedtime にしない
  const latency = mapVisibleReadingsToMetricsDetailed([
    { label: "入眠潜時", value: "18分" },
    { label: "入眠時間", value: "23:10" },
  ]);
  assert(latency.metrics.sleepLatency === "18分", "map: 入眠潜時は latency");
  assert(latency.metrics.bedtime === "23:10", "map: 入眠時間は bedtime");

  // 弱ラベルでも兄弟に皮膚温があれば取得
  const weakSkin = mapVisibleReadingsToMetricsDetailed([
    { label: "皮膚温", value: "—" },
    { label: "平均", value: "+0.25" },
  ]);
  assert(
    weakSkin.metrics.skinTemperature === "+0.25",
    "map: 兄弟ラベル付き平均 → skinTemperature",
  );

  const stressAvg = mapVisibleReadingsToMetricsDetailed(
    [
      { label: "平均", value: "34" },
      { label: "最大", value: "60" },
    ],
    { screenType: "stress" },
  );
  assert(stressAvg.metrics.stress === "34", "map: stress画面の平均 → stress");
}

// —— ロック: ホーム睡眠スコアを詳細画面で上書きしない ——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "home",
      visibleReadingCount: 3,
      readings: [
        { label: "QoL", value: "50" },
        { label: "睡眠", value: "71" },
        { label: "体調", value: "75" },
      ],
      provenance: { sleepScore: "睡眠" },
      metrics: metrics({ sleepScore: 71 }),
    },
    {
      imageIndex: 1,
      screenType: "sleep_detail",
      visibleReadingCount: 2,
      readings: [
        { label: "睡眠スコア", value: "92" },
        { label: "入眠時間", value: "23:40" },
      ],
      provenance: { sleepScore: "睡眠スコア", bedtime: "入眠時間" },
      metrics: metrics({ sleepScore: 92, bedtime: "23:40" }),
    },
  ];
  for (const order of [results, [...results].reverse()]) {
    const { metrics: merged, conflicts } = mergeImageExtractResults(order);
    assert(
      merged.sleepScore === 71,
      "ロック: ホーム睡眠スコアを詳細の92で上書きしない",
    );
    assert(
      merged.bedtime === "23:40",
      "ロック: 入眠は詳細画面から補完",
    );
    assert(
      !conflicts.some((c) => c.key === "sleepScore"),
      "ロック: sleepScore を競合にしない",
    );
  }
}

// —— ロック: bed_wake 入眠を circadian / stages で上書きしない ——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "bed_wake",
      visibleReadingCount: 2,
      readings: [
        { label: "入眠時間", value: "23:15" },
        { label: "起床時間", value: "06:05" },
      ],
      provenance: { bedtime: "入眠時間", wakeTime: "起床時間" },
      metrics: metrics({ bedtime: "23:15", wakeTime: "06:05" }),
    },
    {
      imageIndex: 1,
      screenType: "circadian",
      visibleReadingCount: 3,
      readings: [
        { label: "体内時計", value: "やや遅れ" },
        { label: "入眠", value: "22:00" },
        { label: "起床", value: "07:00" },
      ],
      provenance: {
        circadianRhythm: "体内時計",
        bedtime: "入眠",
        wakeTime: "起床",
      },
      metrics: metrics({
        circadianRhythm: "やや遅れ",
        bedtime: "22:00",
        wakeTime: "07:00",
      }),
    },
    {
      imageIndex: 2,
      screenType: "sleep_stages",
      visibleReadingCount: 2,
      readings: [
        { label: "開始", value: "21:50" },
        { label: "終了", value: "07:40" },
      ],
      provenance: { bedtime: "開始", wakeTime: "終了" },
      metrics: metrics({ bedtime: "21:50", wakeTime: "07:40" }),
    },
  ];
  for (const order of [results, [...results].reverse()]) {
    const { metrics: merged } = mergeImageExtractResults(order);
    assert(
      merged.bedtime === "23:15",
      "ロック: bed_wake 入眠を他画面で上書きしない",
    );
    assert(
      merged.wakeTime === "06:05",
      "ロック: bed_wake 起床を他画面で上書きしない",
    );
  }
}

// —— ロック: 概要の睡眠スコアを詳細で上書きしない（ホーム無し）——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "sleep_overview",
      visibleReadingCount: 2,
      readings: [
        { label: "睡眠スコア", value: "68" },
        { label: "睡眠時間", value: "6時間20分" },
      ],
      provenance: { sleepScore: "睡眠スコア", sleepDuration: "睡眠時間" },
      metrics: metrics({ sleepScore: 68, sleepDuration: "6時間20分" }),
    },
    {
      imageIndex: 1,
      screenType: "sleep_detail",
      visibleReadingCount: 2,
      readings: [
        { label: "睡眠スコア", value: "85" },
        { label: "睡眠効率", value: "91%" },
      ],
      provenance: { sleepScore: "睡眠スコア", sleepEfficiency: "睡眠効率" },
      metrics: metrics({ sleepScore: 85, sleepEfficiency: "91%" }),
    },
  ];
  const { metrics: merged } = mergeImageExtractResults(results);
  assert(
    merged.sleepScore === 68,
    "ロック: 概要の睡眠スコアを詳細で上書きしない",
  );
  assert(merged.sleepEfficiency === "91%", "詳細の効率は補完する");
}

// —— map: 詳細画面から睡眠スコアを採らない ——
{
  const mapped = mapVisibleReadingsToMetricsDetailed(
    [
      { label: "睡眠スコア", value: "88" },
      { label: "入眠時間", value: "23:00" },
    ],
    { screenType: "sleep_detail" },
  );
  assert(
    mapped.metrics.sleepScore == null,
    "map: sleep_detail から sleepScore を採らない",
  );
  assert(mapped.metrics.bedtime === "23:00", "map: sleep_detail の入眠は採る");
}

// —— 表記ゆれは競合にしない（睡眠時間 / RHR / ストレス）——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "home",
      visibleReadingCount: 3,
      readings: [
        { label: "QoL", value: "50" },
        { label: "睡眠", value: "71" },
        { label: "心拍数", value: "49" },
      ],
      provenance: {
        sleepScore: "睡眠",
        restingHeartRate: "心拍数",
        sleepDuration: "睡眠時間",
      },
      metrics: metrics({
        sleepScore: 71,
        sleepDuration: "6:22",
        restingHeartRate: "49",
        stress: "33",
      }),
    },
    {
      imageIndex: 1,
      screenType: "sleep_detail",
      visibleReadingCount: 4,
      readings: [
        { label: "睡眠時間", value: "6時間22分" },
        { label: "安静時心拍数", value: "49 bpm" },
        { label: "ストレス", value: "33標準" },
        { label: "睡眠効率", value: "88%" },
      ],
      provenance: {
        sleepDuration: "睡眠時間",
        restingHeartRate: "安静時心拍数",
        stress: "ストレス",
        sleepEfficiency: "睡眠効率",
      },
      metrics: metrics({
        sleepDuration: "6時間22分",
        restingHeartRate: "49 bpm",
        stress: "33標準",
        sleepEfficiency: "88%",
      }),
    },
  ];

  const { metrics: merged, conflicts } = mergeImageExtractResults(results);
  assert(
    merged.sleepDuration === "6時間22分" || merged.sleepDuration === "6:22",
    "表記ゆれ: 睡眠時間は同一値として採用",
  );
  assert(
    !conflicts.some((c) => c.key === "sleepDuration"),
    "表記ゆれ: 6:22 と 6時間22分 は競合にしない",
  );
  assert(
    merged.restingHeartRate === "49 bpm" || merged.restingHeartRate === "49",
    "表記ゆれ: RHR は同一値として採用",
  );
  assert(
    !conflicts.some((c) => c.key === "restingHeartRate"),
    "表記ゆれ: 49 と 49 bpm は競合にしない",
  );
  assert(
    !conflicts.some((c) => c.key === "stress"),
    "表記ゆれ: 33 と 33標準 は競合にしない",
  );
  assert(merged.sleepScore === 71, "表記ゆれケースでもホーム睡眠スコア優先");
}

// —— 安静時心拍: 異常値は画面優先（詳細 ＞ ホーム）、競合にしない ——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "home",
      visibleReadingCount: 2,
      readings: [
        { label: "QoL", value: "50" },
        { label: "心拍数", value: "95" },
      ],
      provenance: { restingHeartRate: "心拍数" },
      metrics: metrics({ restingHeartRate: "95" }),
    },
    {
      imageIndex: 1,
      screenType: "sleep_detail",
      visibleReadingCount: 2,
      readings: [
        { label: "安静時心拍数", value: "49 bpm" },
        { label: "睡眠時間", value: "5時間32分" },
      ],
      provenance: {
        restingHeartRate: "安静時心拍数",
        sleepDuration: "睡眠時間",
      },
      metrics: metrics({
        restingHeartRate: "49 bpm",
        sleepDuration: "5時間32分",
      }),
    },
  ];

  for (const order of [results, [...results].reverse()]) {
    const { metrics: merged, conflicts } = mergeImageExtractResults(order);
    assert(
      merged.restingHeartRate === "49 bpm" ||
        merged.restingHeartRate === "49",
      "RHR優先: 睡眠詳細の49をホーム95より優先",
    );
    assert(
      !conflicts.some((c) => c.key === "restingHeartRate"),
      "RHR優先: 画面優先で決まる場合は競合にしない",
    );
  }
}

// —— 睡眠時間: 5:32 と 5時間32分 は同一 ——
{
  const results: ImageExtractResult[] = [
    {
      imageIndex: 0,
      screenType: "home",
      visibleReadingCount: 1,
      readings: [{ label: "睡眠時間", value: "5:32" }],
      provenance: { sleepDuration: "睡眠時間" },
      metrics: metrics({ sleepDuration: "5:32" }),
    },
    {
      imageIndex: 1,
      screenType: "sleep_detail",
      visibleReadingCount: 1,
      readings: [{ label: "睡眠時間", value: "5時間32分" }],
      provenance: { sleepDuration: "睡眠時間" },
      metrics: metrics({ sleepDuration: "5時間32分" }),
    },
  ];
  const { metrics: merged, conflicts } = mergeImageExtractResults(results);
  assert(
    merged.sleepDuration === "5時間32分" || merged.sleepDuration === "5:32",
    "睡眠時間: 5:32 / 5時間32分 を同一採用",
  );
  assert(
    !conflicts.some((c) => c.key === "sleepDuration"),
    "睡眠時間: 表記ゆれは競合0",
  );
}

if (process.exitCode) {
  console.error("\nSome merge tests failed.");
} else {
  console.log("\nAll merge tests passed.");
}
