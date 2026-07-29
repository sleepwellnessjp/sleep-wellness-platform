/**
 * OCR TPM 実測: 1画像トークン / 1解析の API 回数 / 429 発生 callNo
 *
 * 実行例:
 *   npx tsx --tsconfig tsconfig.json scripts/measure-ocr-tpm.ts
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import OpenAI from "openai";

const IMAGE_DIR =
  process.env.SOXAI_IMAGE_DIR ??
  "/Users/taka/Desktop/睡眠アセスメント画像/2026.7.28";
const EXTRACT_URL =
  process.env.EXTRACT_URL ?? "http://127.0.0.1:3000/api/extract";
const OUT_DIR = process.env.OUT_DIR ?? "/tmp/soxai-tpm-measure";
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 88;

function listImages(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

async function prepareLikeClient(filePath: string): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}> {
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
  return {
    dataUrl: `data:image/jpeg;base64,${buf.toString("base64")}`,
    width: outW,
    height: outH,
    bytes: buf.length,
  };
}

async function measureDirectVision(dataUrl: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const client = new OpenAI({ apiKey, maxRetries: 0 });
  const started = Date.now();
  try {
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions:
        "Extract visible numeric readings from the SOXAI screenshot as JSON.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Read all visible metric labels and values from this screenshot.",
            },
            {
              type: "input_image" as const,
              image_url: dataUrl,
              detail: "high" as const,
            },
          ],
        },
      ],
    });
    return {
      ok: true as const,
      durationMs: Date.now() - started,
      usage: response.usage ?? null,
      outputChars: response.output_text?.length ?? 0,
    };
  } catch (error) {
    const err = error as {
      status?: number;
      message?: string;
      error?: { message?: string };
      headers?: Headers;
    };
    return {
      ok: false as const,
      durationMs: Date.now() - started,
      status: err.status ?? null,
      message: err.message ?? err.error?.message ?? String(error),
      headers: err.headers
        ? Object.fromEntries(
            [
              "x-ratelimit-limit-tokens",
              "x-ratelimit-remaining-tokens",
              "x-ratelimit-reset-tokens",
              "x-ratelimit-remaining-requests",
            ].map((k) => [k, err.headers?.get?.(k) ?? null]),
          )
        : null,
    };
  }
}

function postExtract(images: string[], options: Record<string, unknown>) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const reqPath = path.join(OUT_DIR, `req-${Date.now()}.json`);
  const resPath = path.join(OUT_DIR, `res-${Date.now()}.json`);
  fs.writeFileSync(reqPath, JSON.stringify({ images, options }));
  const started = Date.now();
  const curl = spawnSync(
    "curl",
    [
      "-sS",
      "-X",
      "POST",
      EXTRACT_URL,
      "-H",
      "Content-Type: application/json",
      "--data-binary",
      `@${reqPath}`,
      "--max-time",
      "900",
      "-o",
      resPath,
      "-w",
      "%{http_code}",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const elapsedMs = Date.now() - started;
  if (curl.error) throw curl.error;
  if (curl.status !== 0) {
    throw new Error(curl.stderr || curl.stdout || `curl exit ${curl.status}`);
  }
  const httpStatus = Number(String(curl.stdout).trim());
  const body = JSON.parse(fs.readFileSync(resPath, "utf8")) as Record<
    string,
    unknown
  >;
  return { httpStatus, elapsedMs, body, resPath };
}

async function main() {
  const files = listImages(IMAGE_DIR);
  if (files.length === 0) {
    console.error(`No images in ${IMAGE_DIR}`);
    process.exit(1);
  }

  console.log(`=== OCR TPM measurement ===`);
  console.log(`images=${files.length} dir=${IMAGE_DIR}`);
  console.log(`extract=${EXTRACT_URL}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const prepared = [];
  for (const file of files) {
    const p = await prepareLikeClient(file);
    prepared.push({ file: path.basename(file), ...p });
    console.log(
      ` prepared ${path.basename(file)} ${p.width}x${p.height} ${(p.bytes / 1024).toFixed(1)}KB`,
    );
  }

  // A) Direct Vision: first 3 images, 1 call each — per-image token truth
  console.log("\n=== A) Direct Vision token probe (detail=high, prepared) ===");
  const probeResults = [];
  for (const item of prepared.slice(0, 3)) {
    const result = await measureDirectVision(item.dataUrl);
    probeResults.push({ file: item.file, ...result });
    console.log(JSON.stringify({ file: item.file, ...result }, null, 2));
    // small gap so we don't spike TPM before full run
    await new Promise((r) => setTimeout(r, 1500));
  }

  // B) Single-image extract with skipRetries — production prompt/schema path
  console.log("\n=== B) /api/extract single image skipRetries ===");
  const single = postExtract([prepared[0]!.dataUrl], {
    mode: "single",
    skipRetries: true,
    skipCriticalReOcr: true,
    imageIndex: 0,
    imageTotal: prepared.length,
  });
  console.log(
    JSON.stringify(
      {
        httpStatus: single.httpStatus,
        elapsedMs: single.elapsedMs,
        usage: single.body.usage ?? null,
        collectedCount: single.body.collectedCount ?? null,
        perImage: single.body.perImage ?? null,
      },
      null,
      2,
    ),
  );

  await new Promise((r) => setTimeout(r, 3000));

  // C) Full batch — real analysis call count + 429 behavior
  console.log("\n=== C) /api/extract full batch (production options) ===");
  const full = postExtract(
    prepared.map((p) => p.dataUrl),
    {
      mode: "batch",
      skipRetries: false,
      skipCriticalReOcr: false,
    },
  );
  console.log(
    JSON.stringify(
      {
        httpStatus: full.httpStatus,
        elapsedMs: full.elapsedMs,
        usage: full.body.usage ?? null,
        collectedCount: full.body.collectedCount ?? null,
        imageCount: full.body.imageCount ?? null,
        timing: full.body.timing ?? null,
        perImage: full.body.perImage ?? null,
        error: full.body.error ?? null,
      },
      null,
      2,
    ),
  );

  const summary = {
    at: new Date().toISOString(),
    imageCount: prepared.length,
    preparedMeta: prepared.map((p) => ({
      file: p.file,
      width: p.width,
      height: p.height,
      bytes: p.bytes,
    })),
    directProbe: probeResults,
    singleExtract: {
      httpStatus: single.httpStatus,
      elapsedMs: single.elapsedMs,
      usage: single.body.usage ?? null,
      collectedCount: single.body.collectedCount ?? null,
    },
    fullExtract: {
      httpStatus: full.httpStatus,
      elapsedMs: full.elapsedMs,
      usage: full.body.usage ?? null,
      collectedCount: full.body.collectedCount ?? null,
      perImage: full.body.perImage ?? null,
      timing: full.body.timing ?? null,
      error: full.body.error ?? null,
    },
  };
  const outPath = path.join(OUT_DIR, "summary.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
