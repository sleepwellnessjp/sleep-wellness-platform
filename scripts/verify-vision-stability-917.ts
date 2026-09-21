/**
 * 9/17 SOXAI 画像で Vision 抽出を 5 回連続実行し、安定性を表にする。
 *
 * 実行:
 *   npx tsx --tsconfig tsconfig.json scripts/verify-vision-stability-917.ts
 *
 * 個人名・画像バイトはログ・出力に含めない。
 */
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import sharp from "sharp";
import { runSoxaiVisionExtract } from "@/lib/soxai-vision-run";
import type { SoxaiExtractSection } from "@/lib/soxai-ocr-runner";

function loadOpenAiKeyFromEnvLocal(): void {
  if (process.env.OPENAI_API_KEY?.trim()) return;
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  const match = text.match(/^OPENAI_API_KEY=(.*)$/m);
  if (!match) return;
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (value) process.env.OPENAI_API_KEY = value;
}

loadOpenAiKeyFromEnvLocal();

const IMAGE_DIR =
  process.env.SOXAI_IMAGE_DIR ??
  "/Users/taka/Desktop/SOXAI画像/2026.9.17";

/** UI スロット順: 7 種類（sleep_stages / heart_hrv は最大 2 枚） */
const SECTIONS: SoxaiExtractSection[] = [
  "home",
  "stress",
  "sleep_overview",
  "sleep_detail",
  "sleep_stages",
  "sleep_stages",
  "heart_hrv",
  "heart_hrv",
  "skin_temp",
];

const MAX_EDGE_PX = 1024;
const JPEG_QUALITY = 78;
const RUNS = 5;

function listImages(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

async function prepareLikeClient(filePath: string): Promise<string> {
  const meta = await sharp(filePath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(w, h, 1));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));
  const buf = await sharp(filePath)
    .resize(outW, outH, { fit: "inside" })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

function cell(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  return t.length > 0 ? t : "（空）";
}

function includesNumber(value: string, expected: string): boolean {
  return value.replace(/\s/g, "").includes(expected);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing (.env.local)");
  }

  const files = listImages(IMAGE_DIR);
  if (files.length === 0) {
    throw new Error(`No images in ${IMAGE_DIR}`);
  }

  const useFiles = files.slice(0, SECTIONS.length);
  const sections = SECTIONS.slice(0, useFiles.length);
  console.log(
    `[verify] imageCount=${useFiles.length} sections=${sections.join(",")}`,
  );
  console.log(`[verify] hasHeartHrv=${sections.includes("heart_hrv")}`);

  const images = await Promise.all(useFiles.map(prepareLikeClient));
  const client = new OpenAI({ apiKey, timeout: 180_000, maxRetries: 1 });

  const rows: Array<{
    run: number;
    restingHeartRate: string;
    restingHeartRateMin: string;
    hrv: string;
    hrvMax: string;
    sleepDuration: string;
    awakenings: string;
    sleepDebt: string;
    circadianRhythm: string;
    retried: boolean;
    rhrAvg: string | null;
    rhrMin: string | null;
    rhrMax: string | null;
  }> = [];

  for (let i = 1; i <= RUNS; i += 1) {
    const started = Date.now();
    console.log(`[verify] run ${i}/${RUNS} starting…`);
    const result = await runSoxaiVisionExtract({
      client,
      images,
      sections,
    });
    console.info("[verify] telemetry", result.telemetry);
    const m = result.metrics;
    rows.push({
      run: i,
      restingHeartRate: cell(m.restingHeartRate),
      restingHeartRateMin: cell(m.restingHeartRateMin),
      hrv: cell(m.hrv),
      hrvMax: cell(m.hrvMax),
      sleepDuration: cell(m.sleepDuration),
      awakenings: cell(m.awakenings),
      sleepDebt: cell(m.sleepDebt),
      circadianRhythm: cell(m.circadianRhythm),
      retried: result.retried,
      rhrAvg: result.telemetry.restingHeartRateAvg,
      rhrMin: result.telemetry.restingHeartRateMin,
      rhrMax: result.telemetry.restingHeartRateMax,
    });
    console.log(
      `[verify] run ${i} done in ${Date.now() - started}ms retried=${result.retried}`,
    );
  }

  console.log("\n=== 5回連続読み取り結果 ===\n");
  console.log(
    "| 回 | 安静時心拍(Avg) | 最小 | HRV(Avg) | HRV最大 | 睡眠時間 | 覚醒時間 | 睡眠負債 | 体内時計 | 再読取 |",
  );
  console.log("|---|---|---|---|---|---|---|---|---|---|");
  for (const row of rows) {
    console.log(
      `| ${row.run} | ${row.restingHeartRate} | ${row.restingHeartRateMin} | ${row.hrv} | ${row.hrvMax} | ${row.sleepDuration} | ${row.awakenings} | ${row.sleepDebt} | ${row.circadianRhythm} | ${row.retried ? "あり" : "なし"} |`,
    );
  }

  console.log("\n=== RHR 生値（Avg/Min/Max） ===\n");
  for (const row of rows) {
    console.log(
      `run${row.run}: Avg=${row.rhrAvg ?? "null"} Min=${row.rhrMin ?? "null"} Max=${row.rhrMax ?? "null"}`,
    );
  }

  const matchAll = rows.every(
    (r) =>
      includesNumber(r.restingHeartRate, "51") &&
      includesNumber(r.restingHeartRateMin, "43") &&
      includesNumber(r.hrv, "104") &&
      includesNumber(r.hrvMax, "252") &&
      r.sleepDebt.includes("-1:30") &&
      r.circadianRhythm.includes("-0:28"),
  );
  console.log(
    `\n[verify] target match (RHR 51 / Min 43 / HRV 104 / Max 252 / debt -1:30 / circadian -0:28): ${matchAll ? "YES" : "NO"}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
