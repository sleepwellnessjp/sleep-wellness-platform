/**
 * 任意日の SOXAI 画像で heart_hrv 専用パス結果を確認する。
 *
 * 実行例:
 *   SOXAI_IMAGE_DIR="/Users/taka/Desktop/SOXAI画像/2026.9.4" \\
 *     npx tsx --tsconfig tsconfig.json scripts/verify-vision-heart-hrv-dir.ts
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

const IMAGE_DIR = process.env.SOXAI_IMAGE_DIR?.trim();
if (!IMAGE_DIR) {
  throw new Error("SOXAI_IMAGE_DIR is required");
}

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

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const imageDir = IMAGE_DIR as string;
  const files = listImages(imageDir);
  const useFiles = files.slice(0, SECTIONS.length);
  const sections = SECTIONS.slice(0, useFiles.length);
  console.log(`[verify] dir=${imageDir}`);
  console.log(`[verify] files=${useFiles.map((f) => path.basename(f)).join(",")}`);
  console.log(
    `[verify] heart_hrv indexes=${sections
      .map((s, i) => (s === "heart_hrv" ? i : -1))
      .filter((i) => i >= 0)
      .join(",")}`,
  );

  const images = await Promise.all(useFiles.map(prepareLikeClient));
  const client = new OpenAI({ apiKey, timeout: 180_000, maxRetries: 1 });
  const result = await runSoxaiVisionExtract({ client, images, sections });
  const m = result.metrics;

  console.info("[verify] telemetry", {
    hasHeartHrv: result.telemetry.hasHeartHrv,
    heartHrvDedicatedPass: result.telemetry.heartHrvDedicatedPass,
    heartHrvImageCount: result.telemetry.heartHrvImageCount,
    restingHeartRateAvg: result.telemetry.restingHeartRateAvg,
    restingHeartRateMin: result.telemetry.restingHeartRateMin,
    restingHeartRateMax: result.telemetry.restingHeartRateMax,
  });

  console.log("\n=== heart_hrv 専用パス結果 ===\n");
  console.log(`安静時心拍(Avg): ${cell(m.restingHeartRate)}`);
  console.log(`安静時心拍(Min): ${cell(m.restingHeartRateMin)}`);
  console.log(`HRV(Avg): ${cell(m.hrv)}`);
  console.log(`HRV(Max): ${cell(m.hrvMax)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
