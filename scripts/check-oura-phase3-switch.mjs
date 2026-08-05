/**
 * Phase 3: Oura / SOXAI PDF 切替の静的確認。
 * Chromium は起動しない。実行: node scripts/check-oura-phase3-switch.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const pdf = read("components/analysis/ClientDiagnosticPdf.tsx");
const resultPage = read("app/analysis/result/page.tsx");
const ouraAdapter = read("lib/device-adapters/oura.ts");
const analyze = read("app/api/analyze/route.ts");
const visionSoxaiExists = (() => {
  try {
    read("app/api/vision-soxai/route.ts");
    return true;
  } catch {
    return false;
  }
})();
const visionOura = read("app/api/vision-oura/route.ts");

assert(
  pdf.includes("resolvedDeviceName") && pdf.includes("デバイス：{resolvedDeviceName}"),
  "PDF must render resolvedDeviceName",
);
assert(
  pdf.includes('formatOuraDeviceLabel()') || pdf.includes('formatOuraDeviceLabel'),
  "PDF must resolve Oura device label via adapter",
);
assert(
  !/deviceSpecificMetrics|ouraScores|Contributors|Activity Score/.test(pdf),
  "PDF must not dump Oura-specific fields",
);
assert(
  resultPage.includes("deviceName={deviceName}") &&
    resultPage.includes("<ClientDiagnosticPdf"),
  "result page must pass deviceName into ClientDiagnosticPdf",
);
assert(
  resultPage.includes("formatOuraDeviceLabel") &&
    resultPage.includes('inputSource === "oura"'),
  "result page must branch Oura Ring device name",
);
assert(
  ouraAdapter.includes('return "Oura Ring"'),
  "Oura adapter must return Oura Ring",
);
assert(visionSoxaiExists, "SOXAI vision route must remain present");
assert(
  visionOura.includes("Oura") &&
    !/from ["']@\/lib\/soxai-ocr|from ["']@\/lib\/soxai-reading-map|\/api\/vision-soxai/.test(
      visionOura,
    ),
  "Oura vision route must stay separated from SOXAI OCR/ROI pipelines",
);
assert(
  analyze.includes("Oura Ring") && analyze.includes('inputSource === "oura"'),
  "analyze API must branch Oura Ring",
);

if (failures.length) {
  console.error("Phase 3 switch check FAILED:");
  for (const item of failures) console.error(" -", item);
  process.exit(1);
}

console.log("Phase 3 switch check OK");
console.log("- PDF deviceName only (no Oura field dump)");
console.log("- result → ClientDiagnosticPdf deviceName wired");
console.log("- SOXAI vision route preserved; Oura vision separated");
console.log("- analyze API Oura Ring branch present");
