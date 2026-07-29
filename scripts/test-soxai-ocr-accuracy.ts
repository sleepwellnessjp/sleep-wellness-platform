/**
 * SOXAI OCR 精度検証（複数スクリーンショット相当の合成リーディング）
 * 実行: npx tsx --tsconfig tsconfig.json scripts/test-soxai-ocr-accuracy.ts
 */
import {
  formatDurationDisplay,
  formatPercentDisplay,
  normalizeMetricDisplayValue,
} from "../lib/soxai-display-normalize";
import { detectMetricConsistencyWarnings } from "../lib/soxai-consistency";
import {
  mergeImageExtractResults,
  type ImageExtractResult,
} from "../lib/soxai-merge";
import {
  mapVisibleReadingsToMetricsDetailed,
  valueShapeFitsKey,
  normalizeVisibleReadings,
} from "../lib/soxai-reading-map";
import { valuesAreEquivalent } from "../lib/soxai-value-normalize";
import { emptyMetrics, type AnalysisMetrics, type MetricFieldKey } from "../lib/soxai-metrics";
import { enrichMetricsFromGraphs, emptyGraphBundle } from "../lib/soxai-graphs";
import { normalizeOcrMetrics } from "../lib/soxai-structured-metrics";
import { setFingerprintFromHashes } from "../lib/soxai-ocr-cache";

type CaseResult = { name: string; pass: boolean; detail?: string };

const results: CaseResult[] = [];

function check(name: string, condition: boolean, detail?: string) {
  results.push({ name, pass: condition, detail });
  if (!condition) {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`OK: ${name}`);
  }
}

function metricsFrom(
  readings: { label: string; value: string }[],
  screenType?: Parameters<typeof mapVisibleReadingsToMetricsDetailed>[1],
) {
  return mapVisibleReadingsToMetricsDetailed(readings, screenType);
}

// —— 表記ゆれ統一 ——
{
  check(
    "duration 1:15 → 1時間15分",
    formatDurationDisplay("1:15") === "1時間15分",
  );
  check(
    "duration 1時間15分 維持",
    formatDurationDisplay("1時間15分") === "1時間15分",
  );
  check("duration 0:49 → 49分", formatDurationDisplay("0:49") === "49分");
  check("duration -40分", formatDurationDisplay("-40分") === "-40分");
  check("percent 87 → 87%", formatPercentDisplay("87") === "87%");
  check("percent 87％ → 87%", formatPercentDisplay("87％") === "87%");
  check(
    "comparable 1:15 ≡ 1時間15分",
    valuesAreEquivalent("remSleep", "1:15", "1時間15分"),
  );
}

// —— 取り違え防止 ——
{
  check(
    "入眠潜時12分を bedtime にしない",
    !valueShapeFitsKey("bedtime", "12分"),
  );
  check(
    "覚醒率8%を awakenings にしない",
    !valueShapeFitsKey("awakenings", "8%"),
  );
  check(
    "レム22%を remSleep にしない",
    !valueShapeFitsKey("remSleep", "22%"),
  );
  check("起床 06:20 は wakeTime OK", valueShapeFitsKey("wakeTime", "06:20"));
  check(
    "睡眠効率87% OK",
    valueShapeFitsKey("sleepEfficiency", "87%"),
  );
}

// —— スクリーンショットセット A（ホーム＋詳細＋ステージ＋生体）——
{
  const home = metricsFrom(
    [
      { label: "QoL", value: "50" },
      { label: "昨日のスコア", value: "48" },
      { label: "睡眠", value: "78" },
      { label: "体調", value: "72" },
      { label: "心拍数", value: "58" },
    ],
    { screenType: "home" },
  );
  const detail = metricsFrom(
    [
      { label: "睡眠時間", value: "6時間42分" },
      { label: "入眠時間", value: "23:40" },
      { label: "起床時間", value: "6:45" },
      { label: "睡眠効率", value: "87" },
      { label: "睡眠負債", value: "-40分" },
      { label: "入眠潜時", value: "12分" },
      { label: "体内時計", value: "やや遅れ" },
    ],
    { screenType: "sleep_detail" },
  );
  const stages = metricsFrom(
    [
      { label: "覚醒", value: "8%" },
      { label: "レム睡眠", value: "22%" },
      { label: "浅い睡眠", value: "55%" },
      { label: "深い睡眠", value: "15%" },
      { label: "覚醒時間", value: "28分" },
      { label: "レム睡眠時間", value: "1:15" },
      { label: "浅い睡眠時間", value: "3:40" },
      { label: "深い睡眠時間", value: "1:05" },
      { label: "平均酸素レベル", value: "96%" },
    ],
    { screenType: "sleep_stages" },
  );
  const vitals = metricsFrom(
    [
      { label: "呼吸速度", value: "14.2" },
      { label: "安静時心拍数 平均", value: "58" },
      { label: "心拍変動 平均", value: "42 ms" },
      { label: "皮膚温度", value: "+0.2℃" },
      { label: "平均ストレス", value: "33" },
    ],
    { screenType: "other" },
  );

  check("A: 睡眠スコア=78", home.metrics.sleepScore === 78);
  check(
    "A: 睡眠時間",
    detail.metrics.sleepDuration === "6時間42分",
  );
  check("A: 入眠=23:40", detail.metrics.bedtime === "23:40");
  check("A: 起床=06:45", detail.metrics.wakeTime === "06:45");
  check(
    "A: 効率=87%",
    detail.metrics.sleepEfficiency === "87%",
  );
  check("A: 負債=-40分", detail.metrics.sleepDebt === "-40分");
  check("A: 潜時=12分", detail.metrics.sleepLatency === "12分");
  check(
    "A: 体内時計",
    detail.metrics.circadianRhythm === "やや遅れ",
  );
  check("A: 覚醒率=8%", stages.metrics.awakeningRate === "8%");
  check("A: 覚醒時間=28分", stages.metrics.awakenings === "28分");
  check(
    "A: REM時間 1:15→1時間15分",
    stages.metrics.remSleep === "1時間15分",
  );
  check("A: REM率=22%", stages.metrics.remSleepRate === "22%");
  check(
    "A: 浅い時間",
    stages.metrics.lightSleep === "3時間40分",
  );
  check("A: 浅い率=55%", stages.metrics.lightSleepRate === "55%");
  check(
    "A: 深い時間",
    stages.metrics.deepSleep === "1時間5分",
  );
  check("A: 深い率=15%", stages.metrics.deepSleepRate === "15%");
  check("A: SpO2=96%", stages.metrics.spo2 === "96%");
  check(
    "A: 呼吸速度",
    vitals.metrics.respiratoryRate === "14.2",
  );
  check("A: RHR=58", vitals.metrics.restingHeartRate === "58");
  check("A: HRV", /42/.test(vitals.metrics.hrv));
  check(
    "A: 皮膚温",
    vitals.metrics.skinTemperature.includes("+0.2"),
  );
  check("A: ストレス=33", vitals.metrics.stress === "33");

  // ステージ画面から入眠・起床を採らない
  check(
    "A: stages から bedtime を採らない",
    !stages.metrics.bedtime?.trim(),
  );

  const setA: ImageExtractResult[] = [
    {
      imageIndex: 0,
      metrics: home.metrics,
      visibleReadingCount: 5,
      readings: [
        { label: "QoL", value: "50" },
        { label: "昨日のスコア", value: "48" },
        { label: "睡眠", value: "78" },
        { label: "体調", value: "72" },
        { label: "心拍数", value: "58" },
      ],
      provenance: home.provenance,
      screenType: "home",
    },
    {
      imageIndex: 1,
      metrics: detail.metrics,
      visibleReadingCount: 7,
      readings: [
        { label: "睡眠時間", value: "6時間42分" },
        { label: "入眠時間", value: "23:40" },
        { label: "起床時間", value: "6:45" },
        { label: "睡眠効率", value: "87" },
        { label: "睡眠負債", value: "-40分" },
        { label: "入眠潜時", value: "12分" },
        { label: "体内時計", value: "やや遅れ" },
      ],
      provenance: detail.provenance,
      screenType: "sleep_detail",
    },
    {
      imageIndex: 2,
      metrics: stages.metrics,
      visibleReadingCount: 9,
      readings: [
        { label: "覚醒", value: "8%" },
        { label: "レム睡眠", value: "22%" },
        { label: "浅い睡眠", value: "55%" },
        { label: "深い睡眠", value: "15%" },
        { label: "覚醒時間", value: "28分" },
        { label: "レム睡眠時間", value: "1:15" },
        { label: "浅い睡眠時間", value: "3:40" },
        { label: "深い睡眠時間", value: "1:05" },
        { label: "平均酸素レベル", value: "96%" },
      ],
      provenance: stages.provenance,
      screenType: "sleep_stages",
    },
    {
      imageIndex: 3,
      metrics: vitals.metrics,
      visibleReadingCount: 5,
      readings: [
        { label: "呼吸速度", value: "14.2" },
        { label: "安静時心拍数 平均", value: "58" },
        { label: "心拍変動 平均", value: "42 ms" },
        { label: "皮膚温度", value: "+0.2℃" },
        { label: "平均ストレス", value: "33" },
      ],
      provenance: vitals.provenance,
      screenType: "skin_temp",
    },
  ];

  const merged = mergeImageExtractResults(setA);
  const expected: Partial<Record<MetricFieldKey, string | number>> = {
    sleepScore: 78,
    qol: "50",
    yesterdayQol: "48",
    conditionScore: "72",
    sleepDuration: "6時間42分",
    bedtime: "23:40",
    wakeTime: "06:45",
    sleepEfficiency: "87%",
    sleepDebt: "-40分",
    sleepLatency: "12分",
    circadianRhythm: "やや遅れ",
    awakenings: "28分",
    awakeningRate: "8%",
    remSleep: "1時間15分",
    remSleepRate: "22%",
    lightSleep: "3時間40分",
    lightSleepRate: "55%",
    deepSleep: "1時間5分",
    deepSleepRate: "15%",
    respiratoryRate: "14.2",
    spo2: "96%",
    restingHeartRate: "58",
    hrv: "42 ms",
    skinTemperature: "+0.2℃",
    stress: "33",
  };

  let hit = 0;
  let total = 0;
  for (const [key, want] of Object.entries(expected) as [
    MetricFieldKey,
    string | number,
  ][]) {
    total += 1;
    const got =
      key === "sleepScore"
        ? merged.metrics.sleepScore
        : merged.metrics[key];
    const ok =
      key === "sleepScore"
        ? got === want
        : typeof want === "string" &&
          typeof got === "string" &&
          (got === want ||
            valuesAreEquivalent(key, got, want) ||
            got.includes(String(want).replace(/℃/, "")) ||
            (key === "hrv" && /42/.test(got)));
    if (ok) hit += 1;
    else {
      console.error(`  miss ${key}: got=${JSON.stringify(got)} want=${want}`);
    }
  }
  check(
    `A merge 正解率 ${hit}/${total}（目標25/25）`,
    hit === total && total >= 25,
    `${hit}/${total}`,
  );
}

// —— セット B: 表記ゆれ・重複・推測禁止 ——
{
  const readings = normalizeVisibleReadings([
    { label: "睡眠スコア", value: "65" },
    { label: "睡眠スコア", value: "65" }, // 重複
    { label: "入眠", value: "0:22" }, // 潜時っぽい誤ラベルは shape で除外されうる
    { label: "入眠潜時", value: "22分" },
    { label: "入眠時間", value: "23時10分" },
    { label: "起床時間", value: "午前6:30" },
    { label: "レム睡眠時間", value: "1時間15分" },
  ]);
  check("B: 重複除去", readings.filter((r) => /睡眠スコア/.test(r.label)).length === 1);

  const mapped = metricsFrom(readings, { screenType: "sleep_detail" });
  check("B: 潜時=22分", mapped.metrics.sleepLatency === "22分");
  check("B: 入眠=23:10", mapped.metrics.bedtime === "23:10");
  check("B: 起床=06:30", mapped.metrics.wakeTime === "06:30");
  check(
    "B: REM表記統一",
    mapped.metrics.remSleep === "1時間15分",
  );

  // グラフ注釈なし → 推測で埋めない
  const empty = enrichMetricsFromGraphs(
    emptyMetrics(),
    emptyGraphBundle(),
  );
  check(
    "B: 空グラフから推測補完しない",
    !empty.remSleepRate && !empty.bedtime,
  );

  const noGuess = normalizeOcrMetrics(
    { ...emptyMetrics(), sleepDuration: "6:22" },
    {
      ...emptyGraphBundle(),
      stages: {
        id: "stages",
        points: [],
        segments: [
          {
            stage: "light",
            startTime: "22:00",
            endTime: "06:00",
            ratio: 1,
          },
        ],
        annotations: [],
      },
    },
  );
  check(
    "B: hypnogram端点で bedtime を埋めない",
    !noGuess.bedtime?.trim(),
  );
  check(
    "B: 6:22 → 6時間22分",
    normalizeMetricDisplayValue("sleepDuration", "6:22") === "6時間22分",
  );
}

// —— セット C: 矛盾警告 ——
{
  const bad: AnalysisMetrics = {
    ...emptyMetrics(),
    sleepDuration: "6時間0分",
    remSleep: "3時間0分",
    lightSleep: "3時間0分",
    deepSleep: "3時間0分",
    awakenings: "1時間0分",
    remSleepRate: "10%",
    lightSleepRate: "10%",
    deepSleepRate: "10%",
    awakeningRate: "10%",
  };
  const warnings = detectMetricConsistencyWarnings(bad);
  check("C: ステージ合計矛盾を検出", warnings.length >= 1);
  check(
    "C: 割合合計≠100を検出",
    warnings.some((w) => w.message.includes("割合")),
  );
}

// —— セット D: ホーム睡眠スコア vs 詳細時間 ——
{
  const home = metricsFrom(
    [{ label: "睡眠", value: "71" }],
    { screenType: "home" },
  );
  const detail = metricsFrom(
    [{ label: "睡眠", value: "5時間32分" }],
    { screenType: "sleep_detail" },
  );
  check("D: ホーム睡眠→スコア", home.metrics.sleepScore === 71);
  check(
    "D: 詳細睡眠→時間",
    detail.metrics.sleepDuration === "5時間32分",
  );
  const merged = mergeImageExtractResults([
    {
      imageIndex: 0,
      metrics: home.metrics,
      visibleReadingCount: 1,
      readings: [{ label: "睡眠", value: "71" }],
      provenance: home.provenance,
      screenType: "home",
    },
    {
      imageIndex: 1,
      metrics: detail.metrics,
      visibleReadingCount: 1,
      readings: [{ label: "睡眠", value: "5時間32分" }],
      provenance: detail.provenance,
      screenType: "sleep_detail",
    },
  ]);
  check("D: merge スコア=71", merged.metrics.sleepScore === 71);
  check(
    "D: merge 時間=5時間32分",
    merged.metrics.sleepDuration === "5時間32分",
  );
}

// —— セット E: 表記ゆれ・改行・単位・周辺ラベル推定 ——
{
  const spaced = metricsFrom(
    [
      { label: "睡眠 時間", value: "6時間10分" },
      { label: "浅い\n睡眠率", value: "50%" },
      { label: "深い％", value: "18" },
      { label: "レム%", value: "20" },
      { label: "覚醒%", value: "12" },
    ],
    { screenType: "sleep_stages" },
  );
  // 睡眠時間は stages でも map されるが sleepDuration は stages で優先度低いだけ
  check(
    "E: 空白入り睡眠時間",
    metricsFrom(
      [{ label: "睡眠 時間", value: "6時間10分" }],
      { screenType: "sleep_detail" },
    ).metrics.sleepDuration === "6時間10分",
  );
  check("E: 改行ラベル浅い率", spaced.metrics.lightSleepRate === "50%");
  check("E: 深い％→率", spaced.metrics.deepSleepRate === "18%");
  check("E: レム%→率", spaced.metrics.remSleepRate === "20%");
  check("E: 覚醒%→率", spaced.metrics.awakeningRate === "12%");

  const units = metricsFrom(
    [
      { label: "安静時心拍数 平均", value: "60 bpm" },
      { label: "心拍変動 平均", value: "38 ms" },
      { label: "呼吸速度", value: "15.0 rpm" },
      { label: "皮膚温度", value: "+0.3℃" },
      { label: "平均酸素レベル", value: "97％" },
    ],
    { screenType: "other" },
  );
  check("E: bpm", /60/.test(units.metrics.restingHeartRate));
  check("E: ms", /38/.test(units.metrics.hrv));
  check("E: rpm", /15/.test(units.metrics.respiratoryRate));
  check("E: ℃", units.metrics.skinTemperature.includes("+0.3"));
  check("E: ％→%", units.metrics.spo2 === "97%");

  const weak = metricsFrom(
    [
      { label: "皮膚温度", value: "見出し" },
      { label: "平均", value: "+0.1" },
      { label: "ストレスモニター", value: "画面" },
      { label: "平均", value: "41" },
    ],
    { screenType: "other" },
  );
  check(
    "E: 弱ラベル皮膚温",
    weak.metrics.skinTemperature.includes("+0.1"),
  );
  check("E: 弱ラベルストレス", weak.metrics.stress === "41");

  const swapped = normalizeVisibleReadings([
    { label: "58", value: "bpm" },
    { label: "42", value: "ms" },
    { label: "", value: "14.5 rpm" },
  ]);
  const fromSwapped = metricsFrom(swapped, { screenType: "other" });
  check("E: 逆ラベル bpm", /58/.test(fromSwapped.metrics.restingHeartRate));
  check("E: 逆ラベル ms", /42/.test(fromSwapped.metrics.hrv));
  check("E: 空ラベル rpm", /14\.5/.test(fromSwapped.metrics.respiratoryRate));

  const graphFilled = enrichMetricsFromGraphs(emptyMetrics(), {
    ...emptyGraphBundle(),
    hrv: {
      id: "hrv",
      points: [],
      segments: [],
      annotations: [{ label: "平均", value: "44 ms" }],
    },
    "stage-detail": {
      id: "stage-detail",
      points: [],
      segments: [],
      annotations: [
        { label: "レム", value: "21%" },
        { label: "浅い睡眠時間", value: "3:20" },
      ],
    },
  });
  check("E: グラフHRV注釈", /44/.test(graphFilled.hrv));
  check("E: グラフレム率", graphFilled.remSleepRate === "21%");
  check(
    "E: グラフ浅い時間",
    /3時間20分|3:20/.test(graphFilled.lightSleep) ||
      graphFilled.lightSleep.includes("3"),
  );
}

// —— 画像順が前後してもマージ結果が変わらないこと ——
{
  const home = metricsFrom(
    [
      { label: "QoL", value: "50" },
      { label: "昨日のスコア", value: "48" },
      { label: "睡眠", value: "78" },
      { label: "体調", value: "72" },
      { label: "心拍数", value: "58" },
    ],
    { screenType: "home" },
  );
  const detail = metricsFrom(
    [
      { label: "睡眠時間", value: "6時間42分" },
      { label: "入眠時間", value: "23:40" },
      { label: "起床時間", value: "6:45" },
      { label: "睡眠効率", value: "87" },
      { label: "皮膚温度", value: "+0.2℃" },
      { label: "平均ストレス", value: "33" },
    ],
    { screenType: "sleep_detail" },
  );
  const base: ImageExtractResult[] = [
    {
      imageIndex: 0,
      metrics: home.metrics,
      visibleReadingCount: 5,
      readings: [
        { label: "QoL", value: "50" },
        { label: "昨日のスコア", value: "48" },
        { label: "睡眠", value: "78" },
        { label: "体調", value: "72" },
        { label: "心拍数", value: "58" },
      ],
      provenance: home.provenance,
      screenType: "home",
    },
    {
      imageIndex: 1,
      metrics: detail.metrics,
      visibleReadingCount: 6,
      readings: [
        { label: "睡眠時間", value: "6時間42分" },
        { label: "入眠時間", value: "23:40" },
        { label: "起床時間", value: "6:45" },
        { label: "睡眠効率", value: "87" },
        { label: "皮膚温度", value: "+0.2℃" },
        { label: "平均ストレス", value: "33" },
      ],
      provenance: detail.provenance,
      screenType: "sleep_detail",
    },
  ];
  const reversed: ImageExtractResult[] = [
    { ...base[1]!, imageIndex: 0 },
    { ...base[0]!, imageIndex: 1 },
  ];
  const forward = mergeImageExtractResults(base).metrics;
  const backward = mergeImageExtractResults(reversed).metrics;
  const keysToCompare: MetricFieldKey[] = [
    "sleepScore",
    "qol",
    "yesterdayQol",
    "conditionScore",
    "sleepDuration",
    "bedtime",
    "wakeTime",
    "sleepEfficiency",
    "restingHeartRate",
    "skinTemperature",
    "stress",
  ];
  let orderOk = true;
  for (const key of keysToCompare) {
    const a =
      key === "sleepScore" ? forward.sleepScore : String(forward[key] ?? "");
    const b =
      key === "sleepScore" ? backward.sleepScore : String(backward[key] ?? "");
    if (a !== b) {
      orderOk = false;
      console.error(`  order mismatch ${key}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
    }
  }
  check("F: 画像順入替でもマージ値が一致", orderOk);
}

// —— セット指紋はハッシュ順に依存しない ——
{
  const a = setFingerprintFromHashes(["bbb", "aaa", "ccc"]);
  const b = setFingerprintFromHashes(["ccc", "bbb", "aaa"]);
  check("F: fingerprint は順序非依存", a === b);
}

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log("\n========== OCR Accuracy Summary ==========");
console.log(`Passed: ${passed} / ${results.length}`);
console.log(`Failed: ${failed}`);
if (failed > 0) process.exitCode = 1;
