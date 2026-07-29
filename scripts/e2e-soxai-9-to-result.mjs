/**
 * E2E: 9枚 SOXAI → /api/extract → pending session → /analysis/loading → /analysis/result
 * Hydration / console エラーを収集する。
 *
 * Usage:
 *   node scripts/e2e-soxai-9-to-result.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const IMAGE_DIR =
  process.env.SOXAI_IMAGE_DIR ??
  "/Users/taka/Desktop/睡眠アセスメント画像/2026.7.28";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT = process.env.OUT_JSON ?? "/tmp/soxai-e2e-9.json";

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function listImages(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

function emptyLifestyle() {
  return {
    clientId: "",
    clientName: "E2E SOXAI 9",
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
    notes: "e2e-soxai-9",
  };
}

async function extractWithCurl(images) {
  const reqPath = `${OUT}.extract-request.json`;
  const resPath = `${OUT}.extract-response.json`;
  fs.writeFileSync(reqPath, JSON.stringify({ images }));
  console.log(`[extract] POST ${BASE}/api/extract images=${images.length}`);
  const started = Date.now();
  const curl = spawnSync(
    "curl",
    [
      "-sS",
      "-X",
      "POST",
      `${BASE}/api/extract`,
      "-H",
      "Content-Type: application/json",
      "--data-binary",
      `@${reqPath}`,
      "--max-time",
      "600",
      "-o",
      resPath,
      "-w",
      "%{http_code}",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (curl.error) throw curl.error;
  if (curl.status !== 0) {
    throw new Error(`curl extract failed: ${curl.stderr || curl.stdout}`);
  }
  const httpStatus = Number(String(curl.stdout).trim());
  const body = JSON.parse(fs.readFileSync(resPath, "utf8"));
  console.log(`[extract] status=${httpStatus} elapsedMs=${Date.now() - started}`);
  if (httpStatus >= 400 || body.error) {
    throw new Error(
      `extract failed: ${httpStatus} ${body.error || JSON.stringify(body).slice(0, 500)}`,
    );
  }
  return body;
}

function resolvePlaywright() {
  const candidates = [
    "/tmp/node_modules/playwright-core",
    path.join(process.cwd(), "node_modules/playwright-core"),
    path.join(process.cwd(), "node_modules/playwright"),
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch {
      /* continue */
    }
  }
  throw new Error("playwright-core not found");
}

async function driveBrowser({ metrics, graphs, images, ocrConfidence }) {
  const pw = resolvePlaywright();
  const browserErrors = [];
  const hydrationHits = [];
  const consoleLines = [];

  let browser;
  let launchMode = "webkit";
  try {
    browser = await pw.webkit.launch({ headless: true });
  } catch (webkitErr) {
    console.warn(`[browser] webkit launch failed: ${webkitErr.message}`);
    try {
      browser = await pw.chromium.launch({ headless: true });
      launchMode = "chromium";
    } catch (chromiumErr) {
      throw new Error(
        `No browser available (webkit: ${webkitErr.message}; chromium: ${chromiumErr.message})`,
      );
    }
  }

  console.log(`[browser] launched ${launchMode}`);
  const page = await browser.newPage();
  page.on("console", (msg) => {
    const text = msg.text();
    consoleLines.push(`[${msg.type()}] ${text}`);
    if (/hydrat/i.test(text) || /did not match/i.test(text)) {
      hydrationHits.push(text);
    }
  });
  page.on("pageerror", (err) => {
    browserErrors.push(String(err));
    if (/hydrat/i.test(String(err))) hydrationHits.push(String(err));
  });

  const lifestyle = emptyLifestyle();
  // 9枚の data-URL は sessionStorage 枠を超えるため、確認済みメトリクスのみ載せる
  // （AI分析は metrics 優先で画像を送らない）
  const pending = {
    lifestyle,
    images: [],
    inputSource: "soxai",
    metrics,
    extractedMetrics: metrics,
    graphs: graphs ?? {},
    ocrConfidence: ocrConfidence ?? {},
  };
  const draft = {
    lifestyle,
    images: [],
    inputSource: "soxai",
    extractedMetrics: metrics,
    imageKeys: Object.keys(metrics || {}).filter(
      (k) => metrics[k] !== null && metrics[k] !== undefined && metrics[k] !== "",
    ),
    conflicts: [],
    ocrConfidence: ocrConfidence ?? {},
    graphs: graphs ?? {},
  };

  await page.goto(`${BASE}/analysis/new`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ pending, draft }) => {
      sessionStorage.setItem(
        "swij-pending-analysis-request-v1",
        JSON.stringify(pending),
      );
      sessionStorage.setItem("swij-extraction-draft-v1", JSON.stringify(draft));
      // mark beta/onboarding done if keys exist
      try {
        localStorage.setItem("swij-beta-agreement-v27-accepted", "1");
        localStorage.setItem("swij-onboarding-v27-seen", "1");
      } catch {
        /* ignore */
      }
    },
    { pending, draft },
  );

  console.log("[browser] navigating /analysis/loading → result");
  await page.goto(`${BASE}/analysis/loading`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/analysis\/result/, { timeout: 120_000 });
  const resultUrl = page.url();
  console.log(`[browser] reached ${resultUrl}`);

  // settle for hydration / background AI
  await page.waitForTimeout(4000);
  const title = await page.title();
  const bodyText = await page.locator("body").innerText();
  const hasScore =
    /Sleep Wellness Score|ウェルネス|スコア|SCORE/i.test(bodyText) ||
    /\b\d{1,3}\b/.test(bodyText);

  await browser.close();

  return {
    launchMode,
    resultUrl,
    title,
    hasScore,
    hydrationHits,
    browserErrors,
    consoleLines: consoleLines.slice(-80),
  };
}

async function main() {
  const files = listImages(IMAGE_DIR);
  if (files.length < 9) {
    throw new Error(`Need >=9 images in ${IMAGE_DIR}, found ${files.length}`);
  }
  const selected = files.slice(0, 9);
  console.log(`images=${selected.length}`);
  for (const f of selected) console.log(` - ${path.basename(f)}`);

  const resPath = `${OUT}.extract-response.json`;
  let extract;
  if (process.env.REUSE_EXTRACT === "1" && fs.existsSync(resPath)) {
    console.log(`[extract] reusing ${resPath}`);
    extract = JSON.parse(fs.readFileSync(resPath, "utf8"));
  } else {
    const images = selected.map((file) => {
      const b64 = fs.readFileSync(file).toString("base64");
      return `data:${mimeFor(file)};base64,${b64}`;
    });
    extract = await extractWithCurl(images);
  }
  const metrics = extract.metrics ?? extract.extractedMetrics ?? {};
  const graphs = extract.graphs ?? {};
  const ocrConfidence = extract.ocrConfidence ?? extract.confidence ?? {};
  const present = Object.entries(metrics).filter(
    ([, v]) => v !== null && v !== undefined && String(v).trim() !== "",
  );
  console.log(`[extract] filled metrics=${present.length}`);

  const browserResult = await driveBrowser({
    metrics,
    graphs,
    images: [],
    ocrConfidence,
  });

  const summary = {
    ok:
      Boolean(browserResult.resultUrl.includes("/analysis/result")) &&
      browserResult.hydrationHits.length === 0 &&
      browserResult.browserErrors.length === 0,
    extractMetricCount: present.length,
    ...browserResult,
  };

  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log("\n=== E2E SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
