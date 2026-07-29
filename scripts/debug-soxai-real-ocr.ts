/**
 * 実SOXAIスクリーンショットで /api/extract を叩き、25項目の欠損を診断する。
 * 実行例:
 *   npx tsx --tsconfig tsconfig.json scripts/debug-soxai-real-ocr.ts
 *   EXTRACT_URL=http://127.0.0.1:3010/api/extract npx tsx ...
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  SOXAI_METRIC_FIELDS,
  collectedMetricKeys,
  isMetricPresent,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "../lib/soxai-metrics";

const IMAGE_DIR =
  process.env.SOXAI_IMAGE_DIR ??
  "/Users/taka/Desktop/睡眠アセスメント画像/2026.7.28";
const EXTRACT_URL =
  process.env.EXTRACT_URL ?? "http://127.0.0.1:3010/api/extract";
const OUT_JSON =
  process.env.OUT_JSON ?? "/tmp/soxai-real-ocr-debug.json";

const SCREEN_HINT: Partial<Record<MetricFieldKey, string>> = {
  sleepScore: "ホーム/睡眠スコア",
  qol: "概要・QoL",
  yesterdayQol: "概要・昨日のスコア",
  conditionScore: "概要・体調",
  sleepDuration: "睡眠・睡眠時間",
  bedtime: "睡眠・入眠(23:45付近)",
  wakeTime: "睡眠・起床(08:05付近)",
  sleepEfficiency: "睡眠・睡眠効率",
  sleepDebt: "睡眠・睡眠負債",
  circadianRhythm: "睡眠・体内時計",
  sleepLatency: "睡眠・入眠潜時",
  awakenings: "睡眠ステージ・覚醒時間",
  awakeningRate: "睡眠ステージ・覚醒率",
  remSleep: "睡眠ステージ・レム時間",
  remSleepRate: "睡眠ステージ・レム率",
  lightSleep: "睡眠ステージ・浅い時間",
  lightSleepRate: "睡眠ステージ・浅い率",
  deepSleep: "睡眠ステージ・深い時間",
  deepSleepRate: "睡眠ステージ・深い率",
  respiratoryRate: "睡眠・呼吸速度",
  spo2: "睡眠・平均酸素レベル",
  restingHeartRate: "睡眠・安静時心拍数",
  hrv: "睡眠・心拍変動",
  skinTemperature: "皮膚温度詳細",
  stress: "概要・ストレスモニター",
};

function mimeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function listImages(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

async function main() {
  const files = listImages(IMAGE_DIR);
  if (files.length === 0) {
    console.error(`No images in ${IMAGE_DIR}`);
    process.exit(1);
  }

  console.log(`images=${files.length}`);
  for (const f of files) console.log(` - ${path.basename(f)}`);

  const images = files.map((file) => {
    const b64 = fs.readFileSync(file).toString("base64");
    return `data:${mimeFor(file)};base64,${b64}`;
  });

  console.log(`POST ${EXTRACT_URL} ...`);
  const started = Date.now();
  const reqPath = `${OUT_JSON}.request.json`;
  fs.writeFileSync(reqPath, JSON.stringify({ images }));
  // undici の headersTimeout(300s) を避けるため curl で長時間待機
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
      "600",
      "-o",
      `${OUT_JSON}.response.json`,
      "-w",
      "%{http_code}",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const elapsedMs = Date.now() - started;
  if (curl.error) throw curl.error;
  if (curl.status !== 0) {
    console.error(curl.stderr || curl.stdout);
    process.exit(1);
  }
  const httpStatus = Number(String(curl.stdout).trim());
  const body = JSON.parse(
    fs.readFileSync(`${OUT_JSON}.response.json`, "utf8"),
  ) as {
    error?: string;
    errorCode?: string;
    adminCode?: string;
    details?: string;
    metrics?: AnalysisMetrics;
    visibleReadings?: Array<{ label?: string; value?: string }>;
    perImage?: Array<{
      imageIndex?: number;
      screenType?: string;
      ok?: boolean;
      error?: string;
      errorCode?: string;
      visibleReadingCount?: number;
      durationMs?: number;
      readings?: Array<{ label?: string; value?: string }>;
    }>;
    timing?: {
      totalMs?: number;
      concurrency?: number;
      phases?: Array<{
        name?: string;
        durationMs?: number;
        detail?: Record<string, unknown>;
      }>;
      perImage?: Array<{
        imageIndex?: number;
        durationMs?: number;
        phases?: Array<{ name?: string; durationMs?: number }>;
      }>;
    };
    confidence?: Partial<Record<MetricFieldKey, number>>;
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify({ httpStatus, elapsedMs, body }, null, 2));
  console.log(`HTTP ${httpStatus} in ${elapsedMs}ms → ${OUT_JSON}`);

  if (body.timing) {
    console.log("\n========== TIMING ==========");
    console.log(
      `total=${body.timing.totalMs ?? elapsedMs}ms concurrency=${body.timing.concurrency ?? "?"}`,
    );
    for (const phase of body.timing.phases ?? []) {
      console.log(
        `  section ${phase.name}: ${phase.durationMs}ms${
          phase.detail ? ` ${JSON.stringify(phase.detail)}` : ""
        }`,
      );
    }
    console.log("-- per image --");
    for (const item of body.perImage ?? []) {
      console.log(
        `  #${item.imageIndex} screen=${item.screenType} durationMs=${item.durationMs ?? "-"}`,
      );
    }
    for (const row of body.timing.perImage ?? []) {
      for (const phase of row.phases ?? []) {
        console.log(
          `    #${row.imageIndex} ${phase.name}: ${phase.durationMs}ms`,
        );
      }
    }
  }

  if (body.error || !body.metrics) {
    console.error("EXTRACT FAILED");
    console.error("error=", body.error);
    console.error("errorCode=", body.errorCode);
    console.error("adminCode=", body.adminCode);
    console.error("details=", String(body.details ?? "").slice(0, 400));
    process.exit(2);
  }

  const metrics = body.metrics;
  const present = collectedMetricKeys(metrics);
  const missing = SOXAI_METRIC_FIELDS.map((f) => f.key).filter(
    (k) => !isMetricPresent(metrics, k),
  );

  console.log("\n========== RESULT ==========");
  console.log(`filled ${present.length}/${SOXAI_METRIC_FIELDS.length}`);
  console.log("\n-- present --");
  for (const field of SOXAI_METRIC_FIELDS) {
    if (!isMetricPresent(metrics, field.key)) continue;
    const val =
      field.key === "sleepScore"
        ? metrics.sleepScore
        : metrics[field.key];
    console.log(
      `OK  [${SCREEN_HINT[field.key] ?? "?"}] ${field.label} (${field.key}) = ${JSON.stringify(val)}`,
    );
  }

  console.log("\n-- MISSING --");
  if (missing.length === 0) {
    console.log("(none)");
  } else {
    for (const key of missing) {
      const field = SOXAI_METRIC_FIELDS.find((f) => f.key === key)!;
      console.log(
        `MISS [${SCREEN_HINT[key] ?? "?"}] ${field.label} (${key})`,
      );
    }
  }

  if (Array.isArray(body.perImage)) {
    console.log("\n-- per image --");
    for (const item of body.perImage) {
      const readings = item.readings ?? [];
      console.log(
        `#${item.imageIndex} screen=${item.screenType} readings=${item.visibleReadingCount ?? readings.length} ok=${item.ok !== false} err=${item.errorCode ?? item.error ?? "-"}`,
      );
      for (const r of readings.slice(0, 40)) {
        console.log(`   · ${JSON.stringify(r.label)} => ${JSON.stringify(r.value)}`);
      }
      if (readings.length > 40) console.log(`   … +${readings.length - 40} more`);
    }
  }

  // Cause hints: scan readings for likely labels of missing keys
  const allReadings = (body.perImage ?? []).flatMap((p) =>
    (p.readings ?? []).map((r) => ({
      imageIndex: p.imageIndex,
      screenType: p.screenType,
      label: String(r.label ?? ""),
      value: String(r.value ?? ""),
    })),
  );
  console.log("\n-- missing cause hints (raw readings that look related) --");
  const hintRe: Partial<Record<MetricFieldKey, RegExp>> = {
    skinTemperature: /皮膚|皮虜|体表|温度|℃|°\s*c|変化/i,
    stress: /ストレス|stress/i,
    circadianRhythm: /体内|クロノ|circadian|進み|遅れ/i,
    bedtime: /入眠|就寝|23:|睡眠開始|fell/i,
    wakeTime: /起床|08:|睡眠終了|got\s*up/i,
    sleepLatency: /潜時|latency/i,
    restingHeartRate: /心拍|bpm|rhr|安静/i,
    hrv: /hrv|心拍変動|ms|rmssd/i,
    respiratoryRate: /呼吸|rpm/i,
    spo2: /酸素|spo|％|%/i,
    qol: /qol|現在のスコア/i,
    yesterdayQol: /昨日/i,
    conditionScore: /体調|コンディション/i,
    sleepDebt: /負債|debt/i,
    awakenings: /覚醒時間|中途|1:32/i,
    awakeningRate: /覚醒|18%/i,
    remSleep: /レム|rem/i,
    lightSleep: /浅い/i,
    deepSleep: /深い/i,
  };
  for (const key of missing) {
    const re = hintRe[key];
    const hits = allReadings.filter(
      (r) =>
        (re ? re.test(`${r.label} ${r.value}`) : false) ||
        /^-?\d/.test(r.value),
    );
    console.log(`\n[${key}] related readings (${hits.length}):`);
    for (const h of hits.slice(0, 25)) {
      console.log(
        `  img#${h.imageIndex}/${h.screenType}: ${JSON.stringify(h.label)} => ${JSON.stringify(h.value)}`,
      );
    }
  }

  process.exit(missing.length === 0 ? 0 : 3);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
