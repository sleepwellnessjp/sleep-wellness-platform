/**
 * 9/17 SOXAI 画像で Vision 抽出を 5 回連続実行し、安定性を表にする。
 * ブラウザと同じ圧縮プロファイルを使う:
 *   - default: 長辺 1024 / JPEG 0.78
 *   - heart_hrv: 長辺 1536 / JPEG 0.9
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
import {
  estimateDataUrlBytes,
  IMAGE_PREP_PROFILES,
  prepProfileForSection,
} from "@/lib/soxai-image-prep";
import { runSoxaiVisionExtract } from "@/lib/soxai-vision-run";
import type { SoxaiExtractSection } from "@/lib/soxai-ocr-runner";
import type { SoxaiVisionImageSizeTelemetry } from "@/lib/soxai-vision-extract";

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

const RUNS = 5;

function listImages(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

/** ブラウザ canvas の JPEG quality(0–1) を sharp(0–100) に合わせる */
async function prepareLikeClient(
  filePath: string,
  section: string,
): Promise<{ dataUrl: string; meta: SoxaiVisionImageSizeTelemetry }> {
  const profile = prepProfileForSection(section);
  const { maxEdgePx, jpegQuality } = IMAGE_PREP_PROFILES[profile];
  const sharpQuality = Math.round(jpegQuality * 100);

  const metaIn = await sharp(filePath).metadata();
  const w = metaIn.width ?? 0;
  const h = metaIn.height ?? 0;
  const scale = Math.min(1, maxEdgePx / Math.max(w, h, 1));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));
  const buf = await sharp(filePath)
    .resize(outW, outH, { fit: "inside" })
    .jpeg({ quality: sharpQuality })
    .toBuffer();
  const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
  return {
    dataUrl,
    meta: {
      index: 0,
      section: section || "unknown",
      profile,
      maxEdgePx,
      jpegQuality,
      bytes: estimateDataUrlBytes(dataUrl),
      dataUrlChars: dataUrl.length,
    },
  };
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
  console.log(
    `[verify] prep default=${IMAGE_PREP_PROFILES.default.maxEdgePx}px/${IMAGE_PREP_PROFILES.default.jpegQuality} heart_hrv=${IMAGE_PREP_PROFILES.heart_hrv.maxEdgePx}px/${IMAGE_PREP_PROFILES.heart_hrv.jpegQuality}`,
  );

  const prepared = await Promise.all(
    useFiles.map((file, index) =>
      prepareLikeClient(file, sections[index] ?? ""),
    ),
  );
  const images = prepared.map((item) => item.dataUrl);
  const imageSizes = prepared.map((item, index) => ({
    ...item.meta,
    index,
  }));
  console.log(
    "[verify] imageSizes",
    imageSizes.map((m) => ({
      index: m.index,
      section: m.section,
      profile: m.profile,
      bytes: m.bytes,
      maxEdgePx: m.maxEdgePx,
    })),
  );

  const client = new OpenAI({ apiKey, timeout: 180_000, maxRetries: 1 });

  const rows: Array<{
    run: number;
    restingHeartRate: string;
    restingHeartRateMin: string;
    hrv: string;
    hrvMax: string;
    dedicatedStatus: string;
    dedicatedMs: number | null;
    bulkMs: number | null;
    totalMs: number | null;
  }> = [];

  for (let i = 1; i <= RUNS; i += 1) {
    console.log(`[verify] run ${i}/${RUNS} starting…`);
    const result = await runSoxaiVisionExtract({
      client,
      images,
      sections,
      imageSizes,
    });
    console.info(
      "[verify] telemetry-json",
      JSON.stringify(result.telemetry),
    );
    const m = result.metrics;
    rows.push({
      run: i,
      restingHeartRate: cell(m.restingHeartRate),
      restingHeartRateMin: cell(m.restingHeartRateMin),
      hrv: cell(m.hrv),
      hrvMax: cell(m.hrvMax),
      dedicatedStatus: result.telemetry.heartHrvDedicatedStatus,
      dedicatedMs: result.telemetry.heartHrvDedicatedDurationMs,
      bulkMs: result.telemetry.bulkDurationMs,
      totalMs: result.telemetry.totalDurationMs,
    });
    console.log(
      `[verify] run ${i} done dedicated=${result.telemetry.heartHrvDedicatedStatus} totalMs=${result.telemetry.totalDurationMs}`,
    );
  }

  console.log("\n=== 5回連続読み取り結果（ブラウザ同等圧縮） ===\n");
  console.log(
    "| 回 | Avg | 最小 | HRV | HRV最大 | 専用 | 専用ms | 一括ms | 合計ms |",
  );
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const row of rows) {
    console.log(
      `| ${row.run} | ${row.restingHeartRate} | ${row.restingHeartRateMin} | ${row.hrv} | ${row.hrvMax} | ${row.dedicatedStatus} | ${row.dedicatedMs ?? "-"} | ${row.bulkMs ?? "-"} | ${row.totalMs ?? "-"} |`,
    );
  }

  const matchAll = rows.every(
    (r) =>
      includesNumber(r.restingHeartRate, "51") &&
      includesNumber(r.restingHeartRateMin, "43") &&
      includesNumber(r.hrv, "104") &&
      includesNumber(r.hrvMax, "252"),
  );
  console.log(
    `\n[verify] target match (RHR 51 / Min 43 / HRV 104 / Max 252): ${matchAll ? "YES" : "NO"}`,
  );
  if (!matchAll) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
