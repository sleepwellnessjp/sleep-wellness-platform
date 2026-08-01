/**
 * Overlay + result verification for SOXAI 9-image flow (WebKit).
 *
 * 1) UI: upload 9 images → open OCR overlay → cancel → review partial → confirm
 *    and assert no leftover dark overlay DOM.
 * 2) Seed cached extract metrics → loading → result, assert overlays still gone.
 *
 * Usage:
 *   node scripts/manual-soxai-9-safari-overlay-check.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pw = require("/tmp/node_modules/playwright-core");

const IMAGE_DIR =
  process.env.SOXAI_IMAGE_DIR ??
  "/Users/taka/Desktop/睡眠アセスメント画像/2026.7.28";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT = process.env.OUT_JSON ?? "/tmp/soxai-safari-overlay-check.json";
const EXTRACT_CACHE =
  process.env.EXTRACT_CACHE ?? "/tmp/soxai-e2e-9.json.extract-response.json";
const HEADLESS = process.env.HEADLESS !== "0";

const SLOT_FILES = [
  ["home", 1],
  ["stress", 1],
  ["sleep_overview", 1],
  ["sleep_detail", 1],
  ["sleep_stages", 2],
  ["heart_hrv", 2],
  ["skin_temp", 1],
];

function listImages(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

async function collectOverlayDom(page) {
  return page.evaluate(() => {
    const hits = [];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (!(el instanceof HTMLElement)) continue;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const coversViewport =
        rect.width >= window.innerWidth * 0.85 &&
        rect.height >= window.innerHeight * 0.85;
      const fixed = style.position === "fixed";
      const hasDarkBg =
        /rgba?\(\s*0\s*,\s*0\s*,\s*0/i.test(style.backgroundColor) ||
        /rgba?\(\s*7\s*,\s*20\s*,\s*38/i.test(style.backgroundColor) ||
        (style.backdropFilter && style.backdropFilter !== "none");
      const marked =
        el.hasAttribute("data-soxai-ocr-overlay") ||
        el.hasAttribute("data-nextjs-dialog-backdrop");
      if ((fixed && coversViewport && hasDarkBg) || marked) {
        hits.push({
          tag: el.tagName.toLowerCase(),
          className: el.className?.toString?.() || "",
          attrs: {
            "data-soxai-ocr-overlay": el.getAttribute("data-soxai-ocr-overlay"),
            "data-nextjs-dialog-backdrop": el.getAttribute(
              "data-nextjs-dialog-backdrop",
            ),
            role: el.getAttribute("role"),
            "aria-modal": el.getAttribute("aria-modal"),
          },
          html: el.outerHTML.slice(0, 1500),
          position: style.position,
          zIndex: style.zIndex,
          backgroundColor: style.backgroundColor,
          backdropFilter: style.backdropFilter,
        });
      }
    }
    return hits;
  });
}

function emptyLifestyle() {
  return {
    clientId: "",
    clientName: "Safari Overlay Check",
    measurementDate: "2026-07-28",
    age: "42",
    gender: "male",
    height: "",
    weight: "",
    exercise: "",
    yogaDone: "",
    yogaType: "",
    yogaDuration: "",
    yogaTime: "",
    yogaNotes: "",
    pilatesDone: "",
    pilatesType: "",
    pilatesDuration: "",
    pilatesTime: "",
    pilatesNotes: "",
    otherExerciseDone: "",
    otherExercises: [],
    alcohol: "",
    alcoholDrank: "",
    alcoholType: "",
    alcoholAmount: "",
    alcoholEndTime: "",
    alcoholNotes: "",
    caffeine: "",
    caffeineDone: "",
    caffeineType: "",
    caffeineAmount: "",
    caffeineTime: "",
    caffeineNotes: "",
    stress: "",
    meals: "",
    breakfastEaten: "",
    breakfastTime: "",
    breakfastContent: "",
    lunchEaten: "",
    lunchTime: "",
    lunchContent: "",
    dinnerEaten: "",
    dinnerTime: "",
    dinnerContent: "",
    work: "",
    condition: "",
    nasalCongestion: "",
    notes: "overlay-check",
  };
}

async function main() {
  const files = listImages(IMAGE_DIR);
  if (files.length < 9) {
    throw new Error(`Need >=9 images in ${IMAGE_DIR}, found ${files.length}`);
  }
  const selected = files.slice(0, 9);
  if (!fs.existsSync(EXTRACT_CACHE)) {
    throw new Error(`Missing extract cache: ${EXTRACT_CACHE}`);
  }
  const extract = JSON.parse(fs.readFileSync(EXTRACT_CACHE, "utf8"));
  const metrics = extract.metrics ?? extract.extractedMetrics ?? {};
  const graphs = extract.graphs ?? {};
  const ocrConfidence = extract.ocrConfidence ?? extract.confidence ?? {};

  const browser = await pw.webkit.launch({ headless: HEADLESS });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleLines = [];
  const pageErrors = [];
  page.on("console", (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.goto(`${BASE}/analysis/new`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("swij-beta-agreement-v27-accepted", "1");
    localStorage.setItem("swij-onboarding-v27-seen", "1");
  });

  await page.getByRole("button", { name: /SOXAIアップロードへ進む/ }).click();
  await page.locator('input[name="clientName"]').waitFor({ state: "visible" });
  await page.locator('input[name="clientName"]').fill("Safari Overlay Check");
  await page.locator('input[name="measurementDate"]').fill("2026-07-28");
  await page.locator('input[name="clientAge"]').fill("42");
  await page.locator('select[name="clientGender"]').selectOption("male");

  let imageIndex = 0;
  for (const [slot, count] of SLOT_FILES) {
    const batch = selected.slice(imageIndex, imageIndex + count);
    await page.locator(`#soxai-slot-${slot}`).setInputFiles(batch);
    imageIndex += count;
  }
  console.log(`[ui] uploaded ${imageIndex} images`);

  await page.getByRole("button", { name: /OCR解析へ進む/ }).click();
  const overlay = page.locator("[data-soxai-ocr-overlay]");
  await overlay.waitFor({ state: "visible", timeout: 30_000 });
  console.log("[ui] OCR overlay visible");

  // Cancel path — verifies overlay unmount / purge
  await page.getByRole("button", { name: /解析を中止/ }).click();
  await page.getByRole("button", { name: /解析を中止する/ }).click();
  await page
    .getByRole("button", { name: /取得済みデータを確認する/ })
    .click({ timeout: 60_000 });

  await page.waitForURL(/\/analysis\/confirm/, { timeout: 60_000 });
  console.log(`[ui] confirm after cancel: ${page.url()}`);
  await page.waitForTimeout(1200);
  const overlaysAfterCancel = await collectOverlayDom(page);
  const soxaiLeftAfterCancel = await overlay.count();
  console.log(
    `[overlay] after cancel confirm hits=${overlaysAfterCancel.length} soxai=${soxaiLeftAfterCancel}`,
  );

  // Seed full cached extract and continue to result
  const lifestyle = emptyLifestyle();
  const pending = {
    lifestyle,
    images: [],
    inputSource: "soxai",
    metrics,
    extractedMetrics: metrics,
    graphs,
    ocrConfidence,
  };
  const draft = {
    lifestyle,
    images: [],
    inputSource: "soxai",
    extractedMetrics: metrics,
    imageKeys: Object.keys(metrics).filter(
      (k) => metrics[k] !== null && metrics[k] !== undefined && metrics[k] !== "",
    ),
    conflicts: [],
    ocrConfidence,
    graphs,
  };
  await page.evaluate(
    ({ pending, draft }) => {
      sessionStorage.setItem(
        "swij-pending-analysis-request-v1",
        JSON.stringify(pending),
      );
      sessionStorage.setItem("swij-extraction-draft-v1", JSON.stringify(draft));
    },
    { pending, draft },
  );

  await page.goto(`${BASE}/analysis/loading`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/analysis\/result/, { timeout: 180_000 });
  console.log(`[ui] result: ${page.url()}`);
  await page.waitForTimeout(2500);

  const overlaysOnResult = await collectOverlayDom(page);
  const bodyText = await page.locator("body").innerText();
  const hasResultSignal =
    /Sleep Wellness|ウェルネス|スコア|SCORE|結果|レポート/i.test(bodyText);

  const summary = {
    ok:
      /\/analysis\/result/.test(page.url()) &&
      overlaysAfterCancel.length === 0 &&
      soxaiLeftAfterCancel === 0 &&
      overlaysOnResult.length === 0 &&
      hasResultSignal,
    resultUrl: page.url(),
    hasResultSignal,
    soxaiLeftAfterCancel,
    overlaysAfterCancel,
    overlaysOnResult,
    pageErrors,
    consoleTail: consoleLines.filter((l) => /overlay|error|hydrat/i.test(l)).slice(-40),
  };

  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
  if (!summary.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
