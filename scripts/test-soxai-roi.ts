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
  CLASSIFY_ROI.rect.y < 0.1 && CLASSIFY_ROI.rect.h >= 0.3 && CLASSIFY_ROI.rect.h <= 0.5,
);

const px = roiRectToPixels({ x: 0.1, y: 0.2, w: 0.5, h: 0.3 }, 1000, 2000);
check("pixel 変換 left", px.left === 100);
check("pixel 変換 top", px.top === 400);
check("pixel 変換 width", px.width === 500);
check("pixel 変換 height", px.height === 600);

const preview = previewRoiPixels("hrv", 1170, 2532);
check("hrv preview に値領域", preview.some((p) => p.id === "hrv_values"));

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\nPassed: ${passed} / ${results.length}`);
console.log(`Failed: ${failed}`);
if (failed > 0) process.exitCode = 1;
