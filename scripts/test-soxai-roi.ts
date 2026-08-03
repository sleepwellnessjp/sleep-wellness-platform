/**
 * SOXAI ROI マップの健全性テスト
 * 実行: npx tsx --tsconfig tsconfig.json scripts/test-soxai-roi.ts
 */
import {
  CLASSIFY_ROI,
  SOXAI_SCREEN_ROIS,
  getRoisForScreen,
  roiRectToPixels,
} from "../lib/soxai-roi-map";
import type { SoxaiScreenType } from "../lib/soxai-screen";
import { previewRoiPixels } from "../lib/soxai-roi-crop";

const results: Array<{ name: string; pass: boolean; detail?: string }> = [];

function check(name: string, condition: boolean, detail?: string) {
  results.push({ name, pass: condition, detail });
  if (!condition) console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  else console.log(`OK: ${name}`);
}

const screens = Object.keys(SOXAI_SCREEN_ROIS) as SoxaiScreenType[];
check("全画面にROI定義あり", screens.length >= 10);

for (const screen of screens) {
  const rois = getRoisForScreen(screen);
  check(`${screen}: ROIが1つ以上`, rois.length >= 1);
  for (const roi of rois) {
    const { x, y, w, h } = roi.rect;
    check(
      `${screen}/${roi.id}: 矩形が画像内`,
      x >= 0 &&
        y >= 0 &&
        w > 0 &&
        h > 0 &&
        x + w <= 1.001 &&
        y + h <= 1.001,
      JSON.stringify(roi.rect),
    );
  }
}

check(
  "classify ROI が上部〜中部",
  CLASSIFY_ROI.rect.y < 0.1 &&
    CLASSIFY_ROI.rect.h >= 0.3 &&
    CLASSIFY_ROI.rect.h <= 0.5,
);

const stageIds = getRoisForScreen("sleep_stages").map((r) => r.id);
check(
  "sleep_stages: 2 ROI（入眠潜時系＋ステージ系）",
  stageIds.length === 2 &&
    stageIds.includes("roi_bed_wake_latency") &&
    stageIds.includes("roi_sleep_stages_core"),
);

for (const screen of ["bed_wake", "sleep_stages"] as SoxaiScreenType[]) {
  const ids = getRoisForScreen(screen).map((r) => r.id);
  check(
    `${screen}: 同一の2 ROI`,
    ids[0] === "roi_bed_wake_latency" && ids[1] === "roi_sleep_stages_core",
  );
}

const sleepOverviewIds = getRoisForScreen("sleep_overview").map((r) => r.id);
check(
  "sleep_overview: 睡眠時間ROI",
  sleepOverviewIds.includes("roi_sleep_overview_duration"),
);

const sleepDetailIds = getRoisForScreen("sleep_detail").map((r) => r.id);
check(
  "sleep_detail: 詳細トレンドROI",
  sleepDetailIds.includes("roi_sleep_detail_trends"),
);

const hrvIds = getRoisForScreen("hrv").map((r) => r.id);
check("hrv: 統合ROIあり", hrvIds.includes("hrv_vitals_full"));
check("hrv: ROIは1つ（壁時計対策）", hrvIds.length === 1);

const respIds = getRoisForScreen("respiration").map((r) => r.id);
check("respiration: 呼吸速度ROIあり", respIds.includes("resp_rate"));

// プロンプト雛形が値に混入しないよう、ROI hint に NN%/H:MM を置かない
let placeholderLeak = false;
for (const screen of screens) {
  for (const r of getRoisForScreen(screen)) {
    if (/NN%|H:MM|例:\s*\d/.test(r.promptHint)) {
      placeholderLeak = true;
      console.error(`placeholder in ${screen}/${r.id}`);
    }
  }
}
check("ROI promptHint にプレースホルダ例なし", !placeholderLeak);

const px = roiRectToPixels({ x: 0.1, y: 0.2, w: 0.5, h: 0.3 }, 1000, 2000);
check("pixel 変換 left", px.left === 100);
check("pixel 変換 top", px.top === 400);
check("pixel 変換 width", px.width === 500);
check("pixel 変換 height", px.height === 600);

const preview = previewRoiPixels("hrv", 1170, 2532);
check("hrv preview に値領域", preview.some((p) => p.id === "hrv_vitals_full"));

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\nPassed: ${passed} / ${results.length}`);
console.log(`Failed: ${failed}`);
if (failed > 0) process.exitCode = 1;
