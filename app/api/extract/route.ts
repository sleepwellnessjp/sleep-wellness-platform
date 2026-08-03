import OpenAI from "openai";
import { NextResponse } from "next/server";
import { appendFileSync } from "node:fs";
import {
  isImageDataUrl,
  normalizeImageDataUrl,
  openaiErrorMessage,
  graphReadingItemSchema,
  SOXAI_EXTRACT_INSTRUCTIONS,
} from "@/lib/openai-helpers";
import {
  tokensFromUsage,
  type OpenAiUsageEntry,
} from "@/lib/openai-usage";
import { hashImageDataUrl } from "@/lib/soxai-ocr-cache";
import {
  applyNonRemFromStageOcr,
  mergeImageExtractResults,
  OCR_LOW_CONFIDENCE_THRESHOLD,
  type ImageExtractResult,
} from "@/lib/soxai-merge";
import {
  enrichMetricsFromGraphs,
  mergeGraphBundles,
  normalizeGraphReadings,
  graphPanelCount,
} from "@/lib/soxai-graphs";
import {
  mapVisibleReadingsToMetricsDetailed,
  normalizeVisibleReadings,
  recoverCriticalMetricsFromReadings,
  recoverMissingMetricsFromReadings,
  labelMatchScore,
  type VisibleReading,
} from "@/lib/soxai-reading-map";
import {
  collectedMetricKeys,
  isMetricPresent,
  metricDisplayValue,
  missingMetricKeys,
  missingMetricLabels,
  SOXAI_METRIC_FIELDS,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import { CRITICAL_METRIC_KEYS } from "@/lib/soxai-ocr-dictionary";
import { normalizeOcrMetrics } from "@/lib/soxai-structured-metrics";
import { normalizeMetricsForDisplay } from "@/lib/soxai-display-normalize";
import { detectMetricConsistencyWarnings, consistencyWarningKeys } from "@/lib/soxai-consistency";
import {
  diagnoseNeedsReview,
  logNeedsReviewDiagnosis,
} from "@/lib/soxai-field-status";
import { logMissingAccuracyMetrics } from "@/lib/soxai-missing-log";
import { cropClassifyRoi, cropScreenRois } from "@/lib/soxai-roi-crop";
import { classifyScreenPrompt, roiOcrPrompt } from "@/lib/soxai-roi-ocr";
import { getRoisForScreen } from "@/lib/soxai-roi-map";
import {
  inferScreenTypeFromReadings,
  normalizeScreenType,
  screenCriticalLabels,
  SCREEN_PRIMARY_METRICS,
  METRIC_SCREEN_PRIORITY,
  type SoxaiScreenType,
} from "@/lib/soxai-screen";

export const runtime = "nodejs";
/** 速度優先: 低detail初回 + 少ない再OCRで 2〜3 分以内を狙う */
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";
const MAX_IMAGES = 10;
const OCR_MODEL = "gpt-4o-mini" as const;
/**
 * high detail は 1 枚あたり ~48k input tokens で TPM(200k) をすぐ食い潰す。
 * 初回は low（~85 tokens）で通し、不足時だけ high で再スキャンする。
 */
const OCR_DETAIL_FAST = "low" as const;
const OCR_DETAIL_ACCURATE = "high" as const;
/** 画像1リクエストあたりの Vision 呼び出し上限（秒） */
const OPENAI_TIMEOUT_MS = 45_000;
/** 単枚OCR（リトライ込み）のハード上限 */
const IMAGE_HARD_TIMEOUT_MS = 55_000;
/** low-detail 化で TPM 余裕が出るため並列を上げる */
const SERVER_OCR_CONCURRENCY = 5;
/** バッチ再OCR（home / critical）の並列数 */
const RECOVERY_OCR_CONCURRENCY = 3;
/** 429 連鎖を避けるため一時障害リトライは1回まで */
const VISION_TRANSIENT_RETRIES = 1;
/** critical 再OCRの候補画像上限（優先画面から） */
const CRITICAL_REOCR_MAX_IMAGES = 2;
/** サーバー温インスタンス内の画像ハッシュキャッシュ（不完全結果は採用しない） */
const SERVER_OCR_CACHE_VERSION = "v20";
const serverOcrCache = new Map<
  string,
  {
    screenType: SoxaiScreenType;
    readings: VisibleReading[];
    graphReadings: ReturnType<typeof normalizeGraphReadings>;
  }
>();
const SERVER_CACHE_MAX = 64;

function serverCacheKey(hash: string): string {
  return `${SERVER_OCR_CACHE_VERSION}:${hash}`;
}

/** OCR 原因特定用の固定ラベル付きトレースログ */
const OCR_TRACE = "[ocr-trace]" as const;
const FOCUS_METRIC_KEYS: MetricFieldKey[] = [
  "sleepEfficiency",
  "sleepDebt",
  "circadianRhythm",
  "sleepLatency",
  "respiratoryRate",
  "spo2",
  "restingHeartRate",
  "hrv",
  "hrvMax",
  "hrvMin",
  "awakenings",
  "awakeningRate",
  "remSleep",
  "remSleepRate",
  "lightSleep",
  "lightSleepRate",
  "deepSleep",
  "deepSleepRate",
  "skinTemperature",
];

function focusMetricLabelRegex(key: MetricFieldKey): RegExp {
  switch (key) {
    case "sleepEfficiency":
      return /睡眠効率|効率|sleepefficiency|efficiency/i;
    case "sleepDebt":
      return /睡眠負債|睡眠不足|負債|sleepdebt|debt/i;
    case "circadianRhythm":
      return /体内時計|circadian|クロノ|位相|サーカディアン/i;
    case "sleepLatency":
      return /入眠潜時|入眠潜伏|潜時|latency|寝つき/i;
    case "respiratoryRate":
      return /呼吸速度|呼吸数|呼吸レート|respiratory|respiration|rpm|brpm/i;
    case "spo2":
      return /spo2|spo₂|sp02|酸素飽和|血中酸素|酸素レベル|平均酸素|状態レベル/i;
    case "restingHeartRate":
      return /安静時心拍|resting\s*hr|^rhr$|平均/i;
    case "hrv":
      return /平均hrv|hrv平均|心拍変動|rmssd/i;
    case "hrvMax":
      return /最大hrv|hrvmax|最大|心拍変動/i;
    case "hrvMin":
      return /最小hrv|hrvmin|最小|心拍変動/i;
    case "awakenings":
    case "awakeningRate":
      return /覚醒|awake/i;
    case "remSleep":
    case "remSleepRate":
      return /レム|rem/i;
    case "lightSleep":
    case "lightSleepRate":
      return /浅い|light/i;
    case "deepSleep":
    case "deepSleepRate":
      return /深い|deep/i;
    case "skinTemperature":
      return /皮膚|皮虜|skintemp|温度|最新の変化/i;
    default:
      return /.^/;
  }
}

function collectFocusCandidates(
  readings: VisibleReading[],
  key: MetricFieldKey,
): Array<{ label: string; value: string }> {
  const byLabel = focusMetricLabelRegex(key);
  const matched: Array<{ label: string; value: string }> = [];
  for (const reading of readings) {
    const label = (reading.label ?? "").trim();
    const value = (reading.value ?? "").trim();
    if (!value) continue;
    const text = `${label} ${value}`;
    const unitHint =
      key === "respiratoryRate"
        ? /\brpm\b|\bbrpm\b|呼吸\/分|回\/分/i.test(text)
        : key === "spo2"
          ? /%|％/.test(text) && /酸素|spo/i.test(text)
          : false;
    if (!byLabel.test(text) && !unitHint) continue;
    matched.push({ label, value });
  }
  return matched.slice(0, 8);
}

function visionErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
}

function visionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

function visionErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

function isRateLimitError(error: unknown): boolean {
  const status = visionErrorStatus(error);
  const message = visionErrorMessage(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  return (
    status === 429 ||
    code === "rate_limit_exceeded" ||
    /rate limit|429/i.test(message)
  );
}

function logOcrTraceError(
  where: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  console.error(`${OCR_TRACE} ⑧ エラー発生箇所`, {
    where,
    message: visionErrorMessage(error),
    status: visionErrorStatus(error),
    stack: visionErrorStack(error),
    ...extra,
  });
}

function log429Event(params: {
  imageIndex: number | null;
  callNo: number;
  purpose: string;
  attempt: number;
  action: "継続（リトライ）" | "継続（次処理へ）" | "中断（throw）";
  error: unknown;
}) {
  console.error(`${OCR_TRACE} 429発生`, {
    imageIndex: params.imageIndex,
    callNo: params.callNo,
    purpose: params.purpose,
    attempt: params.attempt,
    action: params.action,
    continued: params.action !== "中断（throw）",
    aborted: params.action === "中断（throw）",
    message: visionErrorMessage(params.error),
    status: visionErrorStatus(params.error),
    stack: visionErrorStack(params.error),
  });
}

type VisionCallContext = {
  imageIndex: number;
  purpose: string;
  /** low=速度優先（初回） / high=精度優先（不足時再スキャン） */
  detail?: "low" | "high";
};

function isAcceptableServerCache(entry: {
  screenType: SoxaiScreenType;
  readings: VisibleReading[];
  graphReadings: ReturnType<typeof normalizeGraphReadings>;
}): boolean {
  if (entry.readings.length < 2) return false;
  // グラフは速度優先で任意扱い（無くてもキャッシュ可）
  // ホームで昨日QoL/体調が取れない薄い結果は再OCR
  if (entry.screenType === "home") {
    const mapped = mapVisibleReadingsToMetricsDetailed(entry.readings, {
      screenType: "home",
    });
    if (
      !isMetricPresent(mapped.metrics, "yesterdayQol") ||
      !isMetricPresent(mapped.metrics, "conditionScore")
    ) {
      return false;
    }
  }
  return true;
}

/** Vision には screenType + visibleReadings + graphReadings を返させる */
const extractSchema = {
  type: "object",
  additionalProperties: false,
  required: ["screenType", "visibleReadings", "graphReadings"],
  properties: {
    screenType: {
      type: "string",
      enum: [
        "sleep_overview",
        "sleep_stages",
        "sleep_detail",
        "bed_wake",
        "circadian",
        "stress",
        "respiration",
        "rhr",
        "hrv",
        "skin_temp",
        "home",
        "other",
      ],
    },
    visibleReadings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
      },
    },
    graphReadings: {
      type: "array",
      items: graphReadingItemSchema,
    },
  },
} as const;

type ExtractRequestOptions = {
  mode?: "single" | "batch";
  imageIndex?: number;
  imageTotal?: number;
  skipRetries?: boolean;
  skipCriticalReOcr?: boolean;
  imageHashes?: string[];
};

type ExtractRequestBody = {
  images?: unknown;
  sections?: unknown;
  options?: unknown;
};

type ExtractSection =
  | "home"
  | "sleep_overview"
  | "sleep_stages"
  | "sleep_detail"
  | "stress"
  | "circadian"
  | "respiration"
  | "heart_hrv"
  | "skin_temp";

type MetricSource = {
  section: SoxaiScreenType;
  imageIndex: number;
};

type VerifyMetricDiagnostic = {
  presentInAnyImage: boolean;
  presentInMergedRaw: boolean;
  presentBeforeDisplayNormalize: boolean;
  hasStrongLabel: boolean;
  strongLabelScreens: SoxaiScreenType[];
  expectedScreens: SoxaiScreenType[];
  sectionMismatch: boolean;
};

const VALID_SECTIONS: readonly ExtractSection[] = [
  "home",
  "sleep_overview",
  "sleep_stages",
  "sleep_detail",
  "stress",
  "circadian",
  "respiration",
  "heart_hrv",
  "skin_temp",
];

function sectionToScreenType(section: ExtractSection): SoxaiScreenType {
  if (section === "heart_hrv") return "hrv";
  return section;
}

type TimingPhase = {
  name: string;
  durationMs: number;
  detail?: Record<string, unknown>;
};

function createTimingTracker() {
  const batchStartedAt = Date.now();
  const phases: TimingPhase[] = [];
  const perImagePhases = new Map<number, TimingPhase[]>();
  let openPhase: { name: string; startedAt: number; detail?: Record<string, unknown> } | null =
    null;

  const mark = (name: string, durationMs: number, detail?: Record<string, unknown>) => {
    phases.push({ name, durationMs, detail });
  };

  const begin = (name: string, detail?: Record<string, unknown>) => {
    if (openPhase) {
      mark(openPhase.name, Date.now() - openPhase.startedAt, openPhase.detail);
    }
    openPhase = { name, startedAt: Date.now(), detail };
  };

  const end = (extraDetail?: Record<string, unknown>) => {
    if (!openPhase) return;
    mark(openPhase.name, Date.now() - openPhase.startedAt, {
      ...openPhase.detail,
      ...extraDetail,
    });
    openPhase = null;
  };

  const markImagePhase = (
    imageIndex: number,
    name: string,
    durationMs: number,
    detail?: Record<string, unknown>,
  ) => {
    const list = perImagePhases.get(imageIndex) ?? [];
    list.push({ name, durationMs, detail });
    perImagePhases.set(imageIndex, list);
  };

  const snapshot = () => {
    if (openPhase) end();
    return {
      totalMs: Date.now() - batchStartedAt,
      concurrency: SERVER_OCR_CONCURRENCY,
      phases,
      perImage: [...perImagePhases.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([imageIndex, imagePhases]) => ({
          imageIndex,
          durationMs: imagePhases.reduce((sum, p) => sum + p.durationMs, 0),
          phases: imagePhases,
        })),
    };
  };

  return { batchStartedAt, begin, end, mark, markImagePhase, snapshot };
}

/** 単純なワーカープール（取得条件は変えず並列度だけ制御） */
async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), queue.length) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item === undefined) break;
        await worker(item);
      }
    },
  );
  await Promise.all(workers);
}

function describeImage(dataUrl: string, index: number) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
  const mime = match?.[1] ?? "unknown";
  const base64 = match?.[2] ?? "";
  const approxBytes = Math.floor((base64.length * 3) / 4);
  return {
    index,
    mime,
    approxBytes,
    base64Length: base64.length,
    hasPayload: base64.length > 0,
  };
}

function parseExtractOptions(raw: unknown): ExtractRequestOptions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  const imageHashes = Array.isArray(record.imageHashes)
    ? record.imageHashes.filter((h): h is string => typeof h === "string" && h.length > 8)
    : undefined;
  return {
    mode: record.mode === "single" ? "single" : "batch",
    imageIndex:
      typeof record.imageIndex === "number" && Number.isFinite(record.imageIndex)
        ? Math.max(0, Math.floor(record.imageIndex))
        : undefined,
    imageTotal:
      typeof record.imageTotal === "number" && Number.isFinite(record.imageTotal)
        ? Math.max(1, Math.floor(record.imageTotal))
        : undefined,
    // 取得率優先: 明示指定がない限りリトライ・再OCRを有効化
    skipRetries: record.skipRetries === true,
    skipCriticalReOcr: record.skipCriticalReOcr === true,
    imageHashes,
  };
}

function validateBody(body: unknown):
  | {
      ok: true;
      images: string[];
      sections?: ExtractSection[];
      options: ExtractRequestOptions;
    }
  | { ok: false; message: string; errorType: string } {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      message: "リクエスト形式が正しくありません。",
      errorType: "Validation Error",
    };
  }

  const { images, sections, options } = body as ExtractRequestBody;
  const parsedOptions = parseExtractOptions(options);

  if (!Array.isArray(images) || images.length === 0) {
    return {
      ok: false,
      message: "睡眠データ画像が不足しています。",
      errorType: "Validation Error",
    };
  }

  if (!images.every(isImageDataUrl)) {
    return {
      ok: false,
      message:
        "画像形式が不正です。JPG / JPEG / PNG / WEBP の data URL（images 配列）で送信してください。",
      errorType: "Validation Error",
    };
  }

  if (images.length > MAX_IMAGES) {
    return {
      ok: false,
      message: `画像は最大${MAX_IMAGES}枚までです。`,
      errorType: "Validation Error",
    };
  }

  if (sections != null) {
    if (!Array.isArray(sections)) {
      return {
        ok: false,
        message: "sections は配列で指定してください。",
        errorType: "Validation Error",
      };
    }
    if (sections.length !== images.length) {
      return {
        ok: false,
        message: "sections の件数は images と一致させてください。",
        errorType: "Validation Error",
      };
    }
    const normalized = sections.map((section) =>
      typeof section === "string" ? section.trim() : "",
    );
    if (
      normalized.some(
        (section) => !(VALID_SECTIONS as readonly string[]).includes(section),
      )
    ) {
      return {
        ok: false,
        message: "sections に未対応の画面種別が含まれています。",
        errorType: "Validation Error",
      };
    }
    return {
      ok: true,
      images,
      sections: normalized as ExtractSection[],
      options: parsedOptions,
    };
  }

  return { ok: true, images, options: parsedOptions };
}

function parseExtractJson(raw: string): unknown {
  let text = raw.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    text = fence[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    const cleaned = text.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(cleaned) as unknown;
  }
}

function singleImagePrompt(imageIndex: number, total: number): string {
  return `SOXAIスクリーンショットです（${total}枚中 ${imageIndex + 1}枚目。この1枚だけを解析）。

手順:
1) screenType を判定する
2) その画面種別に対応する項目だけを重点的に読む
3) visibleReadings / graphReadings を返す

画面全体（上・中・下、カード、円、ゲージ、小さな注釈）を対象にしてください。

【画面 → 取得項目】
- home: QoL / 昨日のスコア / 睡眠 / 体調 / 心拍数（睡眠スコアの正）
- sleep_overview: 睡眠スコア / 睡眠時間（ホームが無いときの睡眠スコア正）
- sleep_detail / bed_wake: 入眠時間・起床時間（HH:mm）/ 睡眠時間 / 睡眠効率（%）/ 睡眠負債（時間分）/ 入眠潜時（分）/ 体内時計
  ※sleep_detail から睡眠スコアは返さない。入眠・起床の正
- sleep_stages: 覚醒・レム・浅い・深い（各行は「ラベル直後の%」が率、右の時間が時間。右端比較矢印は昨日差で率にしない）。深い睡眠率は「深い睡眠」行の%のみ。浅い率と合算しない / SpO₂（「--」は省略） ※端点時刻を入眠・起床にしない
- circadian: 体内時計のみ（入眠・起床は返さない）
- skin_temp: 皮膚温度 / 皮膚温 / 平均 / 偏差（+0.2℃ や単位なし +0.2 も）
- stress: ストレス / 平均ストレス / ストレスレベル
- rhr / hrv / respiration: 各画面の平均・代表値。hrv 画面でも「安静時心拍数」「呼吸速度」が見えれば必ず取る（分類で落とさない）

【最優先・見逃し禁止】
- 入眠時間 ≠ 入眠潜時 ≠ 就床（見出し: 入眠/入眠時間/睡眠開始/就寝/Bedtime）
- 起床時間 ≠ 覚醒時間 ≠ 中途覚醒（見出し: 起床/起床時間/睡眠終了/Wake）
- 皮膚温度（見出し: 皮膚温度/皮膚温/平均/偏差。絶対値または ±差分）
- ストレス（見出し: ストレス/平均ストレス/レベル。明示数値のみ。平均の捏造禁止）
- 必ずラベル（見出し）と値をペアで返す。数値だけの返却は禁止。

ラベルは画面表記どおり。推測禁止。この1枚に見えるものだけ。
グラフがあれば graphReadings も返す（panel/annotations/points/segments）。`;
}

function fixedSectionPrompt(
  imageIndex: number,
  total: number,
  screenType: SoxaiScreenType,
): string {
  const focus = screenCriticalLabels(screenType);
  return `SOXAIスクリーンショットです（${total}枚中 ${imageIndex + 1}枚目。この1枚だけを解析）。
screenType は「${screenType}」に固定。この画面で特に探す項目: ${focus}

visibleReadings にラベル+値を返す。捏造禁止。
グラフ（折れ線・hypnogram・タイムライン）があれば graphReadings も返す:
- panel: stages|stage-detail|stress|circadian|respiration|rhr|hrv|skin-temp
- annotations: 平均/最小/最大など見える注釈
- points / segments: 分かる範囲のみ`;
}

function criticalOnlyScreenPrompt(
  missing: string[],
  screenType: SoxaiScreenType,
): string {
  const focus = screenCriticalLabels(screenType);
  const missingDisplay = missing
    .map((key) => SOXAI_METRIC_FIELDS.find((field) => field.key === key)?.label ?? key)
    .join(", ");

  const stagesExtra =
    screenType === "sleep_stages"
      ? `
【sleep_stages 専用 — 深い睡眠率の位置関係】
各ステージ行は左から: ラベル → その直後の% → バー → 時間 → 右端の比較値（昨日差）。
- 「深い睡眠」行の「深い睡眠率」は、ラベル「深い睡眠」の直後にある % のみ（桁を正確に読む。近い別数字にしない）
- label は必ず「深い睡眠率」と「深い睡眠」（時間）を別エントリで返す
- 時間（H:MM）も必ず取る。率だけ返して時間を省略しない
- 右端の比較矢印（↑↓）の隣の時間・%は昨日差。深い睡眠率にしない
- 浅い睡眠率・レム率・覚醒率を深い睡眠率にしない。合算・逆算・推測で % を作らない
- 例形式: { label: "深い睡眠率", value: "NN%" } と { label: "深い睡眠", value: "H:MM" }（画面の実値）
- 画面下部に「呼吸速度」「平均酸素レベル」があれば取る
- SpO₂ が「--」等なら省略`
      : "";

  const respirationExtra =
    screenType === "respiration" || screenType === "rhr" || screenType === "hrv"
      ? `
【respiration / rhr / hrv 同居スクショ】
画面分類が hrv でも、見える指標はラベルごとに取る（1画像1指標に限定しない）。
- 「呼吸速度」ラベル直後の数値 → 呼吸速度（rpm / 回/分）
- 「安静時心拍数」見出しのカード（必ず2エントリ）:
  - 小さめの「平均 NN」→ { label: "安静時心拍数平均", value: "NN" }（単位 bpm。ms 禁止）
  - 大きめの「最小 NN bpm」→ { label: "安静時心拍数最小", value: "NN bpm" }
  - 「平均」を省略して最小だけを安静時心拍数にしない
  - 「最大」が見えれば { label: "安静時心拍数最大", value: "NN bpm" }
- 「心拍変動」カード:
  - 「平均HRV」→ { label: "平均HRV", value: "NN ms" }（必ず ms）
  - 「最大」→ { label: "最大HRV", value: "NN" }
  - 「最小」が見えれば { label: "最小HRV", value: "NN" }
- 平均酸素レベル / SpO₂（「平均状態レベル」誤読に注意。酸素の %）があれば取る
- 画面に無い数値は書かない`
      : "";

  const sleepDetailExtra =
    screenType === "sleep_detail" || screenType === "circadian"
      ? `
【sleep_detail / circadian 専用】
- 睡眠時間: 見出し「睡眠時間」の値だけ（例: { label: "睡眠時間", value: "5:10" } または "5時間10分"）
- 「全就床時間」「ベッド滞在時間」「必要睡眠時間」「目標達成率」は睡眠時間にしない
- 就床〜起床差や睡眠ステージ合計から計算しない。別画面の同名候補で上書きしない
- 睡眠効率（%）: 見出し「睡眠効率」「Efficiency」（例: { label: "睡眠効率", value: "87%" }）
- 睡眠負債（時間/分）: 見出し「睡眠負債」「Sleep Debt」（例: { label: "睡眠負債", value: "-1時間20分" }）
- 入眠潜時（分）: 見出し「入眠潜時」の主値のみ（例: { label: "入眠潜時", value: "0:30" } または "30分"）。下段の比較値（例: 7:10）や全就床時間を潜時にしない。2時間超は潜時ではない
- 入眠時間 / 起床時間: HH:mm（例: 02:10 / 07:57）。潜時の 0:30 を入眠時間にしない
- 体内時計（位相差・遅れ/進み）: 見出し「体内時計」「Circadian」（例: { label: "体内時計", value: "-0:46" }）
- 上記はラベルと値を必ずペアで返す。値が「--」等で読めない場合のみ省略`
      : "";

  return `この画像は screenType「${screenType}」の候補です。
画像全体ではなく、この画面の見出しと数値だけを再OCRしてください。

不足している重点項目: ${missingDisplay}
この画面で探す見出し: ${focus}
${stagesExtra}${respirationExtra}${sleepDetailExtra}
ルール:
- ラベル（見出し）と値を必ずペアで visibleReadings に入れる
- 入眠≠入眠潜時≠就床 / 起床≠覚醒時間
- 皮膚温度は絶対値または ±差分（単位なし +0.2 も可）
- ストレスは明示数値のみ（平均の捏造禁止）
- 見えない項目は作らない

screenType も再判定して返してください。`;
}

function screenSpecificRetryPrompt(screenType: SoxaiScreenType): string {
  const keys = SCREEN_PRIMARY_METRICS[screenType];
  const focus = screenCriticalLabels(screenType);
  if (screenType === "home") {
    return `screenType「home」のホーム画面を再スキャンしてください。
次を必ずラベル+値のペアで visibleReadings に入れてください（見落とし禁止）:
1. QoL / 現在のスコア（中央の大きな円）
2. 昨日のスコア（QoLの横や上の小さい数値。例: 60）
3. 睡眠（カード行のスコア。例: 67）。QoL円・昨日・体調と取り違えない
4. 体調（カード行のスコア。例: 78）
5. 運動（カード行にあれば）
※「心拍数/最新」は安静時心拍ではないので restingHeartRate にしない
推測禁止。見える値のみ。一次項目: ${keys.join(", ")}`;
  }
  return `screenType「${screenType}」の一次項目が不足しています。
同じ1枚を再スキャンし、次を必ず探してください: ${focus}

一次項目キー: ${keys.join(", ") || "(general)"}
推測禁止。見える値のみ visibleReadings に追加。`;
}

function homeMissingPrompt(missing: string[]): string {
  return `screenType=home。不足:${missing.join(",")}。
ホーム画面で探す:
- yesterdayQol → 見出し「昨日のスコア」「昨日のQoL」（例 60）
- conditionScore → 見出し「体調」「体調スコア」（例 78）
- qol → 「QoL」「現在のスコア」
- sleepScore → 行の「睡眠」スコア（QoL・昨日のスコア・体調と取り違えない）
- restingHeartRate → ホームでは採らない。「安静時心拍数」ラベルのみ（「心拍数/最新」は不可）
必ずラベル+値。捏造禁止。`;
}

function sparseRetryPrompt(count: number): string {
  return `前回の読み取りが不足しています（${count}件）。同じ1枚の画像を徹底再スキャンしてください。

画面全体（上・中・下、カード、ゲージ、円、バー、折れ線グラフ、hypnogram、小さな文字）を見て、
ラベルと値のペアを visibleReadings に、グラフの形状を graphReadings に入れてください。
ホームなら QoL / 昨日のスコア / 睡眠 / 体調 / 心拍数 は特に必須です。
詳細なら 睡眠時間・効率・負債・潜時・体内時計・入眠・起床 を必須です。
ステージなら hypnogram segments（REM/浅い/深い/覚醒）と SpO₂、各ステージの時間と率（%）の両方を必須です。
バイタルなら 折れ線 points + 平均/最小/最大 annotations を必須です。
すでに読めたものも再掲し、見落としを追加してください。
推測は禁止。見える値のみ。`;
}

function detectMetricSources(
  metrics: ReturnType<typeof normalizeMetricsForDisplay>,
  perImage: Array<{
    imageIndex: number;
    screenType: SoxaiScreenType;
    metrics: ReturnType<typeof mapVisibleReadingsToMetricsDetailed>["metrics"];
  }>,
): Partial<Record<MetricFieldKey, MetricSource>> {
  const out: Partial<Record<MetricFieldKey, MetricSource>> = {};

  for (const field of SOXAI_METRIC_FIELDS) {
    const key = field.key;
    if (!isMetricPresent(metrics, key)) continue;
    const mergedValue = metricDisplayValue(metrics, key).trim();
    if (!mergedValue) continue;
    const canonicalMerged = mergedValue.replace(/\s+/g, "");

    const match = perImage.find((item) => {
      if (!isMetricPresent(item.metrics, key)) return false;
      const itemValue = metricDisplayValue(item.metrics, key).trim();
      if (!itemValue) return false;
      if (itemValue === mergedValue) return true;
      return itemValue.replace(/\s+/g, "") === canonicalMerged;
    });

    if (match) {
      out[key] = {
        section: match.screenType,
        imageIndex: match.imageIndex,
      };
    }
  }

  return out;
}

function primaryKeysMissing(
  screenType: SoxaiScreenType,
  metrics: ReturnType<typeof mapVisibleReadingsToMetricsDetailed>["metrics"],
): string[] {
  return SCREEN_PRIMARY_METRICS[screenType].filter(
    (key) => !isMetricPresent(metrics, key),
  );
}

function expectedScreensForMetric(key: MetricFieldKey): SoxaiScreenType[] {
  const preferred = METRIC_SCREEN_PRIORITY[key];
  if (preferred && preferred.length > 0) {
    return [...preferred];
  }
  const fromPrimary = (
    Object.entries(SCREEN_PRIMARY_METRICS) as Array<
      [SoxaiScreenType, readonly MetricFieldKey[]]
    >
  )
    .filter(([, keys]) => keys.includes(key))
    .map(([screen]) => screen);
  return fromPrimary;
}

function buildVerifyDiagnostics(params: {
  perImage: Array<{
    screenType: SoxaiScreenType;
    metrics: ReturnType<typeof mapVisibleReadingsToMetricsDetailed>["metrics"];
    readings: VisibleReading[];
  }>;
  mergedRaw: ReturnType<typeof mapVisibleReadingsToMetricsDetailed>["metrics"];
  beforeDisplayNormalize: ReturnType<typeof mapVisibleReadingsToMetricsDetailed>["metrics"];
}): Partial<Record<MetricFieldKey, VerifyMetricDiagnostic>> {
  const { perImage, mergedRaw, beforeDisplayNormalize } = params;
  const out: Partial<Record<MetricFieldKey, VerifyMetricDiagnostic>> = {};

  for (const field of SOXAI_METRIC_FIELDS) {
    const key = field.key;
    const expected = expectedScreensForMetric(key);
    const strongScreens = new Set<SoxaiScreenType>();
    for (const item of perImage) {
      const hasStrong = item.readings.some((reading) => {
        if (!reading.label || !reading.value) return false;
        return labelMatchScore(key, reading.label) >= 85;
      });
      if (hasStrong) strongScreens.add(item.screenType);
    }

    const strongLabelScreens = [...strongScreens];
    const sectionMismatch =
      strongLabelScreens.length > 0 &&
      expected.length > 0 &&
      strongLabelScreens.every(
        (screen) => screen !== "other" && !expected.includes(screen),
      );

    out[key] = {
      presentInAnyImage: perImage.some((item) => isMetricPresent(item.metrics, key)),
      presentInMergedRaw: isMetricPresent(mergedRaw, key),
      presentBeforeDisplayNormalize: isMetricPresent(beforeDisplayNormalize, key),
      hasStrongLabel: strongLabelScreens.length > 0,
      strongLabelScreens,
      expectedScreens: expected,
      sectionMismatch,
    };
  }

  return out;
}

export async function POST(request: Request) {
  const life = (msg: string, extra?: Record<string, unknown>) => {
    const line = `${new Date().toISOString()} ${msg}${
      extra ? ` ${JSON.stringify(extra)}` : ""
    }`;
    console.info(`[ocr-life] ${msg}`, extra ?? "");
    try {
      appendFileSync("/tmp/ocr-api-lifecycle.log", `${line}\n`, "utf8");
    } catch {
      // ignore log write failures
    }
  };

  life("START POST /api/extract", {
    aborted: request.signal.aborted,
  });
  request.signal.addEventListener(
    "abort",
    () => {
      life("ERROR request.signal aborted (client disconnected)", {
        at: new Date().toISOString(),
      });
    },
    { once: true },
  );

  let body: unknown;
  const jsonStarted = Date.now();
  try {
    body = await request.json();
    life(`END request.json ${Date.now() - jsonStarted}ms`, {
      imageCount: Array.isArray((body as { images?: unknown })?.images)
        ? ((body as { images: unknown[] }).images.length)
        : null,
    });
  } catch (parseError) {
    life(`ERROR request.json ${Date.now() - jsonStarted}ms`, {
      message:
        parseError instanceof Error ? parseError.message : String(parseError),
    });
    console.error("[api/extract] request JSON parse failed:", parseError);
    return NextResponse.json(
      {
        error:
          "リクエストのJSON解析に失敗しました。画像送信サイズが大きすぎる可能性があります。",
        errorType: "JSON Parse Error",
        details: isDev
          ? parseError instanceof Error
            ? parseError.message
            : String(parseError)
          : undefined,
      },
      { status: 400 },
    );
  }

  const validated = validateBody(body);
  if (!validated.ok) {
    console.error("[api/extract] validation failed:", validated.message);
    return NextResponse.json(
      {
        error: validated.message,
        errorType: validated.errorType,
        details: isDev ? validated.message : undefined,
      },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("[api/extract] OPENAI_API_KEY is missing");
    return NextResponse.json(
      {
        error:
          "画像解析APIの設定が完了していません。.env.local に OPENAI_API_KEY を設定し、開発サーバーを再起動してください。",
        errorType: "Config Error",
        details: isDev ? "OPENAI_API_KEY is missing." : undefined,
      },
      { status: 500 },
    );
  }

  const images = validated.images.map(normalizeImageDataUrl);
  const fixedSections = validated.sections;
  const extractOptions = validated.options;
  const skipRetries = extractOptions.skipRetries === true;
  const skipCriticalReOcr = extractOptions.skipCriticalReOcr === true;
  const imageMeta = images.map(describeImage);

  if (imageMeta.some((item) => !item.hasPayload || item.approxBytes < 100)) {
    return NextResponse.json(
      {
        error: "画像データが空、または破損しています。別の画像でお試しください。",
        errorType: "Validation Error",
        details: isDev ? JSON.stringify(imageMeta) : undefined,
      },
      { status: 400 },
    );
  }

  try {
    const timing = createTimingTracker();
    timing.begin("init");

    console.info(`${OCR_TRACE} ① OCR解析開始`, {
      imageCount: images.length,
      mode: extractOptions.mode ?? "batch",
      skipRetries,
      skipCriticalReOcr,
      concurrency: SERVER_OCR_CONCURRENCY,
      at: new Date().toISOString(),
    });

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_TIMEOUT_MS,
      // アプリ側の transient retry と二重待ちしないよう SDK リトライは抑える
      maxRetries: 1,
    });

    let apiCalls = 0;
    let visionCallSeq = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheHits = 0;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    const isTransientVisionError = (error: unknown): boolean => {
      const message = visionErrorMessage(error);
      const status = visionErrorStatus(error);
      return (
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        /rate limit|429|temporar|timeout|ECONNRESET|ETIMEDOUT/i.test(message)
      );
    };

    const trackUsage = (usage: unknown) => {
      apiCalls += 1;
      const tokens = tokensFromUsage(
        usage && typeof usage === "object"
          ? (usage as {
              input_tokens?: number;
              output_tokens?: number;
            })
          : null,
      );
      inputTokens += tokens.inputTokens;
      outputTokens += tokens.outputTokens;
    };

    const rememberServerCache = (
      hash: string | undefined,
      value: {
        screenType: SoxaiScreenType;
        readings: VisibleReading[];
        graphReadings: ReturnType<typeof normalizeGraphReadings>;
      },
    ) => {
      if (!hash) return;
      if (!isAcceptableServerCache(value)) return;
      serverOcrCache.set(serverCacheKey(hash), value);
      if (serverOcrCache.size > SERVER_CACHE_MAX) {
        const first = serverOcrCache.keys().next().value;
        if (first) serverOcrCache.delete(first);
      }
    };

    const runVisionOnImageOnce = async (
      imageUrl: string,
      userText: string,
      ctx: VisionCallContext,
    ): Promise<{
      screenType: SoxaiScreenType;
      readings: VisibleReading[];
      graphReadings: ReturnType<typeof normalizeGraphReadings>;
      callNo: number;
    }> => {
      const callNo = ++visionCallSeq;
      const detail = ctx.detail ?? OCR_DETAIL_FAST;
      const tag = `${ctx.purpose || "vision"}#${ctx.imageIndex ?? "?"}/call${callNo}`;
      const visionStarted = Date.now();
      console.info(`START ${tag}`);
      console.info(`${OCR_TRACE} ② OpenAIへリクエスト送信直前`, {
        callNo,
        imageIndex: ctx.imageIndex,
        purpose: ctx.purpose,
        successfulApiCallsSoFar: apiCalls,
        model: OCR_MODEL,
        detail,
      });
      try {
        appendFileSync(
          "/tmp/ocr-api-lifecycle.log",
          `${new Date().toISOString()} START ${tag}\n`,
          "utf8",
        );
      } catch {
        /* ignore */
      }

      try {
        const response = await client.responses.create(
          {
            model: OCR_MODEL,
            instructions: SOXAI_EXTRACT_INSTRUCTIONS,
            input: [
              {
                role: "user",
                content: [
                  { type: "input_text", text: userText },
                  {
                    type: "input_image" as const,
                    image_url: imageUrl,
                    detail,
                  },
                ],
              },
            ],
            text: {
              format: {
                type: "json_schema",
                name: "soxai_visible_readings",
                strict: true,
                schema: extractSchema,
              },
            },
          },
          { signal: request.signal },
        );
        trackUsage(response.usage);

        const elapsed = Date.now() - visionStarted;
        console.info(`END ${tag} ${elapsed}ms`);
        console.info(`${OCR_TRACE} ③ OpenAIレスポンス受信`, {
          callNo,
          imageIndex: ctx.imageIndex,
          purpose: ctx.purpose,
          httpStatus: 200,
          receivedAt: new Date().toISOString(),
          elapsedMs: elapsed,
          successfulApiCalls: apiCalls,
          hasOutputText: Boolean(response.output_text?.trim()),
          usage: response.usage ?? null,
        });
        try {
          appendFileSync(
            "/tmp/ocr-api-lifecycle.log",
            `${new Date().toISOString()} END ${tag} ${elapsed}ms httpStatus=200\n`,
            "utf8",
          );
        } catch {
          /* ignore */
        }

        const outputText = response.output_text?.trim();
        if (!outputText) {
          throw new Error("OpenAI response.output_text was empty.");
        }

        const parsed = parseExtractJson(outputText);
        const record =
          parsed && typeof parsed === "object"
            ? (parsed as {
                screenType?: unknown;
                visibleReadings?: unknown;
                graphReadings?: unknown;
              })
            : {};

        const readings = normalizeVisibleReadings(
          "visibleReadings" in record
            ? record.visibleReadings
            : Array.isArray(parsed)
              ? parsed
              : [],
        );
        const graphReadings = normalizeGraphReadings(record.graphReadings);
        const visionScreen =
          normalizeScreenType(record.screenType) !== "other"
            ? normalizeScreenType(record.screenType)
            : "other";
        const inferredScreen = inferScreenTypeFromReadings(readings);
        // Vision の誤分類をラベル推定で補正（HRV↔呼吸/安静時の同居スクショ）
        let screenType = visionScreen;
        if (
          (visionScreen === "other" ||
            visionScreen === "home" ||
            visionScreen === "stress" ||
            visionScreen === "sleep_overview" ||
            visionScreen === "hrv") &&
          (inferredScreen === "respiration" ||
            inferredScreen === "rhr" ||
            inferredScreen === "sleep_stages" ||
            (inferredScreen === "hrv" && visionScreen !== "hrv"))
        ) {
          screenType = inferredScreen;
        } else if (
          visionScreen === "home" &&
          (inferredScreen === "sleep_overview" ||
            inferredScreen === "sleep_detail")
        ) {
          screenType = inferredScreen;
        } else if (visionScreen === "other") {
          screenType = inferredScreen;
        }
        // 分類が hrv のままでも、安静時/呼吸ラベルがあれば抽出対象として respiration 扱い
        if (
          screenType === "hrv" &&
          readings.some((r) =>
            /安静時心拍|呼吸速度/.test((r.label ?? "").normalize("NFKC")),
          )
        ) {
          screenType = readings.some((r) =>
            /安静時心拍/.test((r.label ?? "").normalize("NFKC")),
          )
            ? "rhr"
            : "respiration";
        }

        const mapped = mapVisibleReadingsToMetricsDetailed(readings, {
          screenType,
        });
        console.info(`${OCR_TRACE} ④ OCR結果（取得項目数）`, {
          callNo,
          imageIndex: ctx.imageIndex,
          purpose: ctx.purpose,
          readingsCount: readings.length,
          graphReadingsCount: graphReadings.length,
          mappedMetricCount: collectedMetricKeys(mapped.metrics).length,
          screenType,
        });

        return { screenType, readings, graphReadings, callNo };
      } catch (error) {
        const elapsed = Date.now() - visionStarted;
        const status = visionErrorStatus(error);
        const message = visionErrorMessage(error);
        console.info(
          `ERROR ${tag} ${elapsed}ms status=${status ?? "n/a"} ${message.slice(0, 120)}`,
        );
        try {
          appendFileSync(
            "/tmp/ocr-api-lifecycle.log",
            `${new Date().toISOString()} ERROR ${tag} ${elapsed}ms status=${status ?? "n/a"} ${message.slice(0, 200)}\n`,
            "utf8",
          );
        } catch {
          /* ignore */
        }
        if (isRateLimitError(error)) {
          // 継続/中断は runVisionOnImage 側で確定ログ。ここでは発生事実を残す
          console.error(`${OCR_TRACE} 429発生（API応答）`, {
            imageIndex: ctx.imageIndex,
            callNo,
            purpose: ctx.purpose,
            message,
            status,
            stack: visionErrorStack(error),
          });
        } else {
          logOcrTraceError("runVisionOnImageOnce", error, {
            imageIndex: ctx.imageIndex,
            callNo,
            purpose: ctx.purpose,
          });
        }
        throw error;
      }
    };

    const runVisionOnImage = async (
      imageUrl: string,
      userText: string,
      ctx: VisionCallContext,
    ): Promise<{
      screenType: SoxaiScreenType;
      readings: VisibleReading[];
      graphReadings: ReturnType<typeof normalizeGraphReadings>;
    }> => {
      let lastError: unknown;
      let lastCallNo = visionCallSeq;
      for (let attempt = 0; attempt <= VISION_TRANSIENT_RETRIES; attempt += 1) {
        try {
          const result = await runVisionOnImageOnce(imageUrl, userText, ctx);
          lastCallNo = result.callNo;
          return {
            screenType: result.screenType,
            readings: result.readings,
            graphReadings: result.graphReadings,
          };
        } catch (error) {
          lastError = error;
          lastCallNo = visionCallSeq;
          const willRetry =
            attempt < VISION_TRANSIENT_RETRIES &&
            isTransientVisionError(error) &&
            !request.signal.aborted;

          if (isRateLimitError(error)) {
            log429Event({
              imageIndex: ctx.imageIndex,
              callNo: lastCallNo,
              purpose: ctx.purpose,
              attempt: attempt + 1,
              action: willRetry ? "継続（リトライ）" : "中断（throw）",
              error,
            });
          }

          if (!willRetry) {
            throw error;
          }
          // 指数バックオフ（短め）+ ジッターで 429 同時再試行を分散
          const base = Math.min(4_000, 400 * 2 ** attempt);
          const waitMs = base + Math.floor(Math.random() * 250);
          console.warn("[api/extract] transient Vision error, retrying", {
            imageIndex: ctx.imageIndex,
            purpose: ctx.purpose,
            callNo: lastCallNo,
            attempt: attempt + 1,
            waitMs,
            message: visionErrorMessage(error),
          });
          await sleep(waitMs);
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error(String(lastError));
    };

    const ocrOneImage = async (
      imageUrl: string,
      imageIndex: number,
      fixedScreenType?: SoxaiScreenType,
    ): Promise<{
      imageIndex: number;
      screenType: SoxaiScreenType;
      readings: VisibleReading[];
      graphReadings: ReturnType<typeof normalizeGraphReadings>;
      metrics: ReturnType<
        typeof mapVisibleReadingsToMetricsDetailed
      >["metrics"];
      provenance: ReturnType<
        typeof mapVisibleReadingsToMetricsDetailed
      >["provenance"];
      error?: string;
      startedAt: number;
      endedAt: number;
    }> => {
      const startedAt = Date.now();
      console.info("[api/extract] image OCR start", {
        imageIndex,
        at: new Date(startedAt).toISOString(),
        skipRetries,
      });

      const finish = (result: {
        imageIndex: number;
        screenType: SoxaiScreenType;
        readings: VisibleReading[];
        graphReadings: ReturnType<typeof normalizeGraphReadings>;
        metrics: ReturnType<
          typeof mapVisibleReadingsToMetricsDetailed
        >["metrics"];
        provenance: ReturnType<
          typeof mapVisibleReadingsToMetricsDetailed
        >["provenance"];
        error?: string;
      }) => {
        const endedAt = Date.now();
        console.info("[api/extract] image OCR end", {
          imageIndex,
          at: new Date(endedAt).toISOString(),
          durationMs: endedAt - startedAt,
          readings: result.readings.length,
          error: result.error ?? null,
        });
        return { ...result, startedAt, endedAt };
      };

      if (request.signal.aborted) {
        const empty = mapVisibleReadingsToMetricsDetailed([]);
        return finish({
          imageIndex,
          screenType: "other",
          readings: [],
          graphReadings: [],
          metrics: empty.metrics,
          provenance: empty.provenance,
          error: "中止",
        });
      }

      let readings: VisibleReading[] = [];
      let graphReadings: ReturnType<typeof normalizeGraphReadings> = [];
      let screenType: SoxaiScreenType = "other";
      try {
        const displayIndex =
          extractOptions.imageIndex != null
            ? extractOptions.imageIndex
            : imageIndex;
        const displayTotal =
          extractOptions.imageTotal != null
            ? extractOptions.imageTotal
            : images.length;

        const firstStarted = Date.now();

        // —— SOXAI 専用 ROI OCR ——
        // 1) 画面種別判定（固定セクション or ヘッダー切り出し）
        // 2) 画面専用 ROI を切り出して領域だけ Vision OCR
        if (fixedScreenType) {
          screenType = fixedScreenType;
        } else {
          try {
            const classifyCrop = await cropClassifyRoi(imageUrl);
            const classifyTarget = classifyCrop?.dataUrl ?? imageUrl;
            const classified = await runVisionOnImage(
              classifyTarget,
              classifyScreenPrompt(),
              {
                imageIndex,
                purpose: "firstPass",
                detail: OCR_DETAIL_FAST,
              },
            );
            screenType =
              classified.screenType !== "other"
                ? classified.screenType
                : inferScreenTypeFromReadings(classified.readings);
            console.info("[soxai-roi] classified", {
              imageIndex,
              screenType,
              usedHeaderCrop: Boolean(classifyCrop),
            });
          } catch (classifyError) {
            console.warn("[soxai-roi] classify failed, fallback other", {
              imageIndex,
              message:
                classifyError instanceof Error
                  ? classifyError.message
                  : String(classifyError),
            });
            screenType = "other";
          }
        }

        // 2) 画面専用 ROI を切り出して OCR（数字取得率優先・detail high）
        const roiDefs = getRoisForScreen(screenType);
        let roiReadings: VisibleReading[] = [];
        try {
          const crops = await cropScreenRois(imageUrl, screenType);
          console.info("[soxai-roi] cropped", {
            imageIndex,
            screenType,
            roiCount: crops.length,
            roiIds: crops.map((c) => c.roi.id),
          });

          const roiResults = await Promise.all(
            crops.map(async (crop) => {
              try {
                const result = await runVisionOnImage(
                  crop.dataUrl,
                  roiOcrPrompt({
                    screenType,
                    roi: crop.roi,
                    imageIndex: displayIndex,
                    total: displayTotal,
                  }),
                  {
                    imageIndex,
                    purpose: "firstPass",
                    detail: OCR_DETAIL_ACCURATE,
                  },
                );
                return {
                  roiId: crop.roi.id,
                  readings: result.readings,
                  graphReadings: result.graphReadings,
                };
              } catch (roiError) {
                console.warn("[soxai-roi] ROI OCR failed", {
                  imageIndex,
                  roiId: crop.roi.id,
                  message:
                    roiError instanceof Error
                      ? roiError.message
                      : String(roiError),
                });
                return {
                  roiId: crop.roi.id,
                  readings: [] as VisibleReading[],
                  graphReadings: [] as ReturnType<typeof normalizeGraphReadings>,
                };
              }
            }),
          );

          for (const row of roiResults) {
            for (const reading of row.readings) {
              const dedupe = `${reading.label}::${reading.value}`;
              if (
                !roiReadings.some((r) => `${r.label}::${r.value}` === dedupe)
              ) {
                roiReadings.push(reading);
              }
            }
            if (row.graphReadings.length > graphReadings.length) {
              graphReadings = row.graphReadings.map((g) => ({
                ...g,
                sourceImageIndex: imageIndex,
              }));
            }
          }
        } catch (cropError) {
          console.warn("[soxai-roi] cropScreenRois failed", {
            imageIndex,
            screenType,
            message:
              cropError instanceof Error
                ? cropError.message
                : String(cropError),
          });
        }

        readings = roiReadings;
        timing.markImagePhase(imageIndex, "firstPass", Date.now() - firstStarted, {
          screenType,
          mode: "roi",
          roiDefs: roiDefs.length,
          readings: readings.length,
        });
        console.info("[soxai-roi] firstPass done", {
          imageIndex,
          screenType,
          readings: readings.length,
          labels: readings.map((r) => r.label).slice(0, 20),
        });

        // 取得率優先: 読み取り不足・重点項目不足・グラフ不足は再スキャン
        if (!skipRetries) {
          const mappedOnce = mapVisibleReadingsToMetricsDetailed(readings, {
            screenType,
          });
          const mappedKeyCount = collectedMetricKeys(mappedOnce.metrics).length;

          // ROI が空のときは全面 OCR せず、同一画面の ROI を再切り出しして再OCRのみ
          const needsRetry = readings.length === 0 || mappedKeyCount === 0;
          if (needsRetry) {
            console.warn("[api/extract] sparse ROI readings, ROI-only retry", {
              imageIndex,
              count: readings.length,
              mappedKeyCount,
              screenType,
            });
            try {
              const sparseStarted = Date.now();
              const retryCrops = await cropScreenRois(imageUrl, screenType);
              const retryReadings: VisibleReading[] = [];
              for (const crop of retryCrops) {
                const retry = await runVisionOnImage(
                  crop.dataUrl,
                  roiOcrPrompt({
                    screenType,
                    roi: crop.roi,
                    imageIndex: displayIndex,
                    total: displayTotal,
                  }),
                  {
                    imageIndex,
                    purpose: "sparseRetry",
                    detail: OCR_DETAIL_ACCURATE,
                  },
                );
                for (const reading of retry.readings) {
                  const dedupe = `${reading.label}::${reading.value}`;
                  if (
                    !retryReadings.some(
                      (r) => `${r.label}::${r.value}` === dedupe,
                    )
                  ) {
                    retryReadings.push(reading);
                  }
                }
              }
              timing.markImagePhase(
                imageIndex,
                "sparseRetry",
                Date.now() - sparseStarted,
                { readings: retryReadings.length, mode: "roi-only" },
              );
              if (
                retryReadings.length > readings.length ||
                collectedMetricKeys(
                  mapVisibleReadingsToMetricsDetailed(retryReadings, {
                    screenType,
                  }).metrics,
                ).length > mappedKeyCount
              ) {
                readings = retryReadings;
              }
            } catch (retryError) {
              if (isRateLimitError(retryError)) {
                log429Event({
                  imageIndex,
                  callNo: visionCallSeq,
                  purpose: "sparseRetry",
                  attempt: 1,
                  action: "継続（次処理へ）",
                  error: retryError,
                });
              }
              logOcrTraceError("ocrOneImage.sparseRetry", retryError, {
                imageIndex,
              });
              console.warn(
                "[api/extract] per-image ROI retry failed",
                { imageIndex },
                retryError,
              );
            }
          }

          // 画面種別の一次項目のうち、重点項目が欠けている場合は ROI 再OCR → だめなら全面
          let afterSparse = mapVisibleReadingsToMetricsDetailed(readings, {
            screenType,
          });
          const missingPrimary = primaryKeysMissing(
            screenType,
            afterSparse.metrics,
          );
          const missingCriticalPrimary = missingPrimary.filter((key) =>
            (
              CRITICAL_METRIC_KEYS as readonly string[]
            ).includes(key) ||
            (FOCUS_METRIC_KEYS as readonly string[]).includes(key) ||
            key === "sleepScore" ||
            key === "qol" ||
            key === "yesterdayQol" ||
            key === "conditionScore",
          );
          if (
            missingCriticalPrimary.length > 0 &&
            screenType !== "other" &&
            SCREEN_PRIMARY_METRICS[screenType].length > 0
          ) {
            try {
              const screenStarted = Date.now();
              // 欠けているキーを含む ROI だけ再OCR
              const retryCrops = await cropScreenRois(imageUrl, screenType);
              const neededCrops = retryCrops.filter((c) =>
                c.roi.focusKeys.some((k) =>
                  missingCriticalPrimary.includes(k),
                ),
              );
              const targets =
                neededCrops.length > 0 ? neededCrops : retryCrops.slice(0, 2);
              for (const crop of targets) {
                const screenRetry = await runVisionOnImage(
                  crop.dataUrl,
                  roiOcrPrompt({
                    screenType,
                    roi: crop.roi,
                    imageIndex: displayIndex,
                    total: displayTotal,
                  }),
                  {
                    imageIndex,
                    purpose: "screenRetry",
                    detail: OCR_DETAIL_ACCURATE,
                  },
                );
                for (const reading of screenRetry.readings) {
                  const dedupe = `${reading.label}::${reading.value}`;
                  if (
                    !readings.some((r) => `${r.label}::${r.value}` === dedupe)
                  ) {
                    readings.push(reading);
                  }
                }
              }
              timing.markImagePhase(
                imageIndex,
                "screenRetry",
                Date.now() - screenStarted,
                {
                  missingPrimary: missingCriticalPrimary,
                  readings: readings.length,
                  mode: "roi-retry",
                },
              );
              afterSparse = mapVisibleReadingsToMetricsDetailed(readings, {
                screenType,
              });
            } catch (screenError) {
              if (isRateLimitError(screenError)) {
                log429Event({
                  imageIndex,
                  callNo: visionCallSeq,
                  purpose: "screenRetry",
                  attempt: 1,
                  action: "継続（次処理へ）",
                  error: screenError,
                });
              }
              logOcrTraceError("ocrOneImage.screenRetry", screenError, {
                imageIndex,
                screenType,
                missingPrimary: missingCriticalPrimary,
              });
              console.warn(
                "[api/extract] screen retry failed",
                { imageIndex, screenType },
                screenError,
              );
            }
          }

          // グラフ専用再スキャンは壁時計の主因のため既定スキップ。
          // （グラフは enrichMetricsFromGraphs で任意補完。数値OCRを優先）
        }
      } catch (error) {
        const message = visionErrorMessage(error);
        if (isRateLimitError(error)) {
          log429Event({
            imageIndex,
            callNo: visionCallSeq,
            purpose: "firstPass",
            attempt: VISION_TRANSIENT_RETRIES + 1,
            action: "継続（次処理へ）",
            error,
          });
        }
        logOcrTraceError("ocrOneImage", error, { imageIndex });
        console.error("[api/extract] per-image OCR failed", {
          imageIndex,
          message,
        });
        const empty = mapVisibleReadingsToMetricsDetailed([]);
        return finish({
          imageIndex,
          screenType: "other",
          readings: [],
          graphReadings: [],
          metrics: empty.metrics,
          provenance: empty.provenance,
          error: message,
        });
      }

      if (!fixedScreenType && screenType === "other") {
        screenType = inferScreenTypeFromReadings(readings);
      }

      const mapped = mapVisibleReadingsToMetricsDetailed(readings, {
        screenType,
      });

      return finish({
        imageIndex,
        screenType,
        readings,
        graphReadings,
        metrics: mapped.metrics,
        provenance: mapped.provenance,
      });
    };

    const ocrOneImageWithTimeout = async (
      imageUrl: string,
      index: number,
      fixedScreenType?: SoxaiScreenType,
    ) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const sectionLabel = fixedScreenType || `image_${index}`;
      const started = Date.now();
      console.info(`START ${sectionLabel} index=${index}`);
      try {
        const result = await Promise.race([
          ocrOneImage(imageUrl, index, fixedScreenType),
          new Promise<Awaited<ReturnType<typeof ocrOneImage>>>((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error("タイムアウト"));
            }, IMAGE_HARD_TIMEOUT_MS);
          }),
        ]);
        console.info(`END ${sectionLabel} ${Date.now() - started}ms`);
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.info(
          `END ${sectionLabel} ${Date.now() - started}ms error=${message}`,
        );
        const empty = mapVisibleReadingsToMetricsDetailed([]);
        const endedAt = Date.now();
        if (isRateLimitError(error)) {
          log429Event({
            imageIndex: index,
            callNo: visionCallSeq,
            purpose: "ocrOneImageWithTimeout",
            attempt: 1,
            action: "継続（次処理へ）",
            error,
          });
        }
        logOcrTraceError("ocrOneImageWithTimeout", error, {
          imageIndex: index,
        });
        console.warn("[api/extract] image OCR timeout/fail", {
          imageIndex: index,
          message,
        });
        return {
          imageIndex: index,
          screenType: "other" as const,
          readings: [],
          graphReadings: [],
          metrics: empty.metrics,
          provenance: empty.provenance,
          error: message,
          startedAt: endedAt,
          endedAt,
        };
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    const imageHashes =
      extractOptions.imageHashes &&
      extractOptions.imageHashes.length === images.length
        ? extractOptions.imageHashes
        : await Promise.all(images.map((image) => hashImageDataUrl(image)));
    timing.end({ imageCount: images.length });
    timing.begin("cacheLookup");

    type PerImageResult = {
      imageIndex: number;
      screenType: SoxaiScreenType;
      readings: VisibleReading[];
      graphReadings: ReturnType<typeof normalizeGraphReadings>;
      metrics: ReturnType<
        typeof mapVisibleReadingsToMetricsDetailed
      >["metrics"];
      provenance: ReturnType<
        typeof mapVisibleReadingsToMetricsDetailed
      >["provenance"];
      error?: string;
      startedAt: number;
      endedAt: number;
    };

    const perImage: PerImageResult[] = new Array(images.length);
    const needVision: Array<{
      imageUrl: string;
      index: number;
      screenType?: SoxaiScreenType;
      hash: string;
    }> = [];

    const startedBatch = Date.now();
    for (let index = 0; index < images.length; index += 1) {
      const hash = imageHashes[index]!;
      const cached = serverOcrCache.get(serverCacheKey(hash));
      const fixedScreenType = fixedSections?.[index]
        ? sectionToScreenType(fixedSections[index]!)
        : undefined;

      if (cached && isAcceptableServerCache(cached)) {
        cacheHits += 1;
        const mapped = mapVisibleReadingsToMetricsDetailed(cached.readings, {
          screenType: fixedScreenType ?? cached.screenType,
        });
        perImage[index] = {
          imageIndex: index,
          screenType: fixedScreenType ?? cached.screenType,
          readings: cached.readings,
          graphReadings: cached.graphReadings.map((g) => ({
            ...g,
            sourceImageIndex: index,
          })),
          metrics: mapped.metrics,
          provenance: mapped.provenance,
          startedAt: startedBatch,
          endedAt: startedBatch,
        };
        timing.markImagePhase(index, "cacheHit", 0);
        continue;
      }

      needVision.push({
        imageUrl: images[index]!,
        index,
        screenType: fixedScreenType,
        hash,
      });
    }
    timing.end({
      cacheHits,
      needVision: needVision.length,
    });

    // 取得率優先: 未キャッシュ分は枚別OCR（並列）。一括Visionは精度低下のため使わない
    timing.begin("perImageOcr", {
      concurrency: SERVER_OCR_CONCURRENCY,
      count: needVision.length,
    });
    if (needVision.length > 0) {
      await runPool(needVision, SERVER_OCR_CONCURRENCY, async (item) => {
        if (request.signal.aborted) return;
        const result = await ocrOneImageWithTimeout(
          item.imageUrl,
          item.index,
          item.screenType,
        );
        if (!result.error) {
          rememberServerCache(item.hash, {
            screenType: result.screenType,
            readings: result.readings,
            graphReadings: result.graphReadings,
          });
        }
        perImage[item.index] = result;
      });
    }
    timing.end({
      apiCallsSoFar: apiCalls,
      durationsMs: needVision.map((item) => {
        const row = perImage[item.index];
        return {
          imageIndex: item.index,
          durationMs: row ? row.endedAt - row.startedAt : null,
          screenType: row?.screenType ?? null,
          error: row?.error ?? null,
        };
      }),
    });

    // 429等で空になった画像を並列再試行（skipRetries 時は初回ウェーブ結果で確定）
    const transientFailed = skipRetries
      ? []
      : needVision.filter((item) => {
          const result = perImage[item.index];
          return (
            result &&
            result.error &&
            /rate limit|429|temporar|timeout|ECONNRESET|ETIMEDOUT/i.test(
              result.error,
            )
          );
        });
    timing.begin("transientRetry", { count: transientFailed.length });
    if (transientFailed.length > 0 && !request.signal.aborted) {
      console.warn("[api/extract] retrying transient failures", {
        count: transientFailed.length,
        indexes: transientFailed.map((item) => item.index),
      });
      await sleep(1_000);
      await runPool(transientFailed, SERVER_OCR_CONCURRENCY, async (item) => {
        if (request.signal.aborted) return;
        const result = await ocrOneImageWithTimeout(
          item.imageUrl,
          item.index,
          item.screenType,
        );
        if (!result.error) {
          rememberServerCache(item.hash, {
            screenType: result.screenType,
            readings: result.readings,
            graphReadings: result.graphReadings,
          });
        }
        perImage[item.index] = result;
      });
    }
    timing.end();

    // 穴埋め（理論上到達しないが型安全のため）
    for (let index = 0; index < images.length; index += 1) {
      if (perImage[index]) continue;
      const empty = mapVisibleReadingsToMetricsDetailed([]);
      const now = Date.now();
      perImage[index] = {
        imageIndex: index,
        screenType: "other",
        readings: [],
        graphReadings: [],
        metrics: empty.metrics,
        provenance: empty.provenance,
        error: "OCR失敗",
        startedAt: now,
        endedAt: now,
      };
    }

    timing.begin("mergeRecover");
    const failedCount = perImage.filter((item) => item.error).length;
    let allReadings = perImage.flatMap((item) => item.readings);
    const focusOcrCandidates = Object.fromEntries(
      FOCUS_METRIC_KEYS.map((key) => [key, collectFocusCandidates(allReadings, key)]),
    ) as Record<MetricFieldKey, Array<{ label: string; value: string }>>;
    console.info(`${OCR_TRACE} focus ① OCR取得結果`, {
      stage: "ocr-readings",
      focus: Object.fromEntries(
        FOCUS_METRIC_KEYS.map((key) => [
          key,
          focusOcrCandidates[key].map((item) => `${item.label} => ${item.value}`),
        ]),
      ),
    });
    const extractResults: ImageExtractResult[] = perImage.map((item) => ({
      imageIndex: item.imageIndex,
      metrics: item.metrics,
      visibleReadingCount: item.readings.length,
      readings: item.readings,
      provenance: item.provenance,
      screenType: item.screenType,
    }));

    const { metrics: mergedRaw, conflicts, confidence: confidenceRaw } =
      mergeImageExtractResults(extractResults);
    console.info(`${OCR_TRACE} ⑤ mergeImageExtractResults実行`, {
      imageCount: extractResults.length,
      totalReadings: extractResults.reduce(
        (sum, item) => sum + item.visibleReadingCount,
        0,
      ),
      mergedMetricCount: collectedMetricKeys(mergedRaw).length,
      conflictCount: conflicts.length,
      failedImages: perImage.filter((item) => item.error).length,
      visionCallSeq,
      successfulApiCalls: apiCalls,
    });
    const confidence = { ...confidenceRaw };
    const graphBundle = mergeGraphBundles(
      perImage.map((item) => ({
        imageIndex: item.imageIndex,
        panels: item.graphReadings,
      })),
    );
    let metrics = normalizeOcrMetrics(
      enrichMetricsFromGraphs(mergedRaw, graphBundle),
      graphBundle,
    );

    // —— 重点項目（従来critical + 精度改善6項目）の不足を、全画像readingsから補完 ——
    const criticalAndFocusKeys = Array.from(
      new Set<MetricFieldKey>([...CRITICAL_METRIC_KEYS, ...FOCUS_METRIC_KEYS]),
    );
    const missingAfterMerge = criticalAndFocusKeys.filter(
      (key) => !isMetricPresent(metrics, key),
    );
    if (missingAfterMerge.length > 0) {
      const recovered = recoverCriticalMetricsFromReadings(
        allReadings,
        perImage.map((item) => item.screenType),
      );
      for (const key of missingAfterMerge) {
        if (!isMetricPresent(metrics, key) && isMetricPresent(recovered, key)) {
          if (key === "sleepScore") continue;
          metrics = { ...metrics, [key]: recovered[key] };
          if (confidence[key] == null) confidence[key] = 0.72;
        }
      }
    }

    // —— 残りの不足キーを全 readings から緩和ゲートで補完（25項目カバー）——
    metrics = recoverMissingMetricsFromReadings(metrics, allReadings);
    metrics = normalizeOcrMetrics(
      enrichMetricsFromGraphs(metrics, graphBundle),
      graphBundle,
    );
    timing.end({
      collected: collectedMetricKeys(metrics).length,
      missing: missingMetricKeys(metrics),
      missingCritical: CRITICAL_METRIC_KEYS.filter(
        (key) => !isMetricPresent(metrics, key),
      ),
    });

    const coverageAfterRecover = collectedMetricKeys(metrics).length;
    const needsRecoveryPasses = coverageAfterRecover < SOXAI_METRIC_FIELDS.length;

    // —— ホーム一次項目（昨日QoL・体調）が欠けていればホーム画像だけ再OCR ——
    const homeMissingKeys = (
      ["yesterdayQol", "conditionScore", "qol"] as const
    ).filter((key) => !isMetricPresent(metrics, key));
    timing.begin("homeReOcr", {
      missing: homeMissingKeys,
      skipped: !needsRecoveryPasses || homeMissingKeys.length === 0,
    });
    if (
      needsRecoveryPasses &&
      !skipCriticalReOcr &&
      homeMissingKeys.length > 0
    ) {
      const homeIndexes = perImage
        .filter(
          (item) =>
            !item.error &&
            (item.screenType === "home" ||
              fixedSections?.[item.imageIndex] === "home"),
        )
        .map((item) => item.imageIndex);

      // Vision は並列、metrics 反映は後段で直列（競合回避）
      type HomeRetryRow = {
        imageIndex: number;
        readings: VisibleReading[];
        retryReadings: VisibleReading[];
      };
      const homeRetries: HomeRetryRow[] = [];
      await runPool(homeIndexes, RECOVERY_OCR_CONCURRENCY, async (imageIndex) => {
        if (request.signal.aborted) return;
        const item = perImage[imageIndex];
        if (!item) return;
        try {
          const retry = await runVisionOnImage(
            images[imageIndex]!,
            homeMissingPrompt([...homeMissingKeys]),
            {
              imageIndex,
              purpose: "homeReOcr",
              detail: OCR_DETAIL_ACCURATE,
            },
          );
          homeRetries.push({
            imageIndex,
            readings: item.readings,
            retryReadings: retry.readings,
          });
        } catch (homeError) {
          if (isRateLimitError(homeError)) {
            log429Event({
              imageIndex,
              callNo: visionCallSeq,
              purpose: "homeReOcr",
              attempt: 1,
              action: "継続（次処理へ）",
              error: homeError,
            });
          }
          logOcrTraceError("homeReOcr", homeError, {
            imageIndex,
            remaining: homeMissingKeys,
          });
          console.warn(
            "[api/extract] home missing re-OCR failed",
            { imageIndex, remaining: homeMissingKeys },
            homeError,
          );
        }
      });

      for (const row of homeRetries.sort(
        (a, b) => a.imageIndex - b.imageIndex,
      )) {
        const remaining = homeMissingKeys.filter(
          (key) => !isMetricPresent(metrics, key),
        );
        if (remaining.length === 0) break;
        const item = perImage[row.imageIndex];
        if (!item) continue;
        const mergedReadings = [...row.readings];
        for (const reading of row.retryReadings) {
          const dedupe = `${reading.label}::${reading.value}`;
          if (
            !mergedReadings.some((r) => `${r.label}::${r.value}` === dedupe)
          ) {
            mergedReadings.push(reading);
          }
        }
        const remapped = mapVisibleReadingsToMetricsDetailed(mergedReadings, {
          screenType: "home",
        });
        let gained = false;
        for (const key of remaining) {
          if (
            !isMetricPresent(metrics, key) &&
            isMetricPresent(remapped.metrics, key)
          ) {
            metrics = { ...metrics, [key]: remapped.metrics[key] };
            if (confidence[key] == null) confidence[key] = 0.8;
            gained = true;
          }
        }
        if (gained || row.retryReadings.length > item.readings.length) {
          item.readings = mergedReadings;
          item.screenType = "home";
          allReadings.push(...row.retryReadings);
        }
      }
      metrics = recoverMissingMetricsFromReadings(metrics, allReadings);
    }
    timing.end({
      collected: collectedMetricKeys(metrics).length,
      stillMissingHome: (
        ["yesterdayQol", "conditionScore", "qol"] as const
      ).filter((key) => !isMetricPresent(metrics, key)),
    });

    // —— それでも重点項目が空なら、対象画像だけ再OCR（候補上限＋並列 Vision）——
    const stillMissing = criticalAndFocusKeys.filter(
      (key) => !isMetricPresent(metrics, key),
    );
    if (stillMissing.length > 0) {
      const LABEL_MAP: Partial<Record<MetricFieldKey, string>> = {
        sleepEfficiency: "睡眠効率",
        sleepDebt: "睡眠負債",
        circadianRhythm: "体内時計",
        sleepLatency: "入眠潜時",
        awakeningRate: "覚醒率",
        remSleepRate: "レム睡眠率",
        nonRemSleepRate: "ノンレム睡眠率",
        lightSleepRate: "浅い睡眠率",
        deepSleepRate: "深い睡眠率",
        spo2: "平均SpO₂",
        respiratoryRate: "呼吸速度",
        bedtime: "入眠時間",
        wakeTime: "起床時間",
        skinTemperature: "皮膚温度",
        stress: "ストレス",
      };
      const stagesMissing = stillMissing.filter((k) =>
        ["awakeningRate","remSleepRate","lightSleepRate","deepSleepRate","spo2"].includes(k),
      );
      const respirationMissing = stillMissing.filter((k) =>
        ["respiratoryRate","spo2"].includes(k),
      );
      if (stagesMissing.length > 0) {
        console.info("[api/extract] 未取得 Sleep Detail/Sleep Stages 項目", {
          items: stagesMissing.map((k) => LABEL_MAP[k] ?? k),
          stagesImages: perImage
            .filter((p) => p.screenType === "sleep_stages")
            .map((p) => p.imageIndex),
        });
      }
      if (respirationMissing.length > 0) {
        const respirationImages = perImage
          .filter((p) => p.screenType === "respiration")
          .map((p) => p.imageIndex);
        console.info("[api/extract] 未取得 Respiration/HRV 項目", {
          items: respirationMissing.map((k) => LABEL_MAP[k] ?? k),
          respirationImages,
          note: respirationImages.length === 0 ? "respiration画面が存在しない" : undefined,
        });
      }
      const graphBundle2 = graphBundle;
      const allGraphKeys = ["stress","stages","respiration","rhr","hrv","circadian","skin-temp","stage-detail"] as const;
      const missingGraphs = allGraphKeys.filter((gk) => {
        const g = graphBundle2[gk as keyof typeof graphBundle2];
        if (!g) return true;
        if (Array.isArray(g)) return g.length === 0;
        if (typeof g === "object") {
          const pts = (g as { points?: unknown[] }).points;
          return !pts || pts.length === 0;
        }
        return !g;
      });
      if (missingGraphs.length > 0) {
        console.info("[api/extract] 未取得グラフ一覧（グラフ解析）", {
          missingGraphs,
          acquiredGraphs: allGraphKeys.filter((gk) => !missingGraphs.includes(gk as never)),
        });
      }
    }
    const coverageBeforeCritical = collectedMetricKeys(metrics).length;
    timing.begin("criticalReOcr", {
      missing: stillMissing,
      skipped:
        coverageBeforeCritical >= SOXAI_METRIC_FIELDS.length ||
        stillMissing.length === 0,
    });
    if (
      coverageBeforeCritical < SOXAI_METRIC_FIELDS.length &&
      !skipCriticalReOcr &&
      stillMissing.length > 0
    ) {
      const screenForKey: Record<string, SoxaiScreenType[]> = {
        bedtime: ["bed_wake", "sleep_detail", "circadian", "other"],
        wakeTime: ["bed_wake", "sleep_detail", "circadian", "other"],
        skinTemperature: ["skin_temp", "other", "sleep_detail"],
        stress: ["stress", "other", "sleep_detail"],
        // sleep_stages 画面で取り逃しやすい率（%）項目
        awakeningRate: ["sleep_stages", "other"],
        remSleepRate: ["sleep_stages", "other"],
        nonRemSleepRate: ["sleep_stages", "other"],
        lightSleepRate: ["sleep_stages", "other"],
        deepSleepRate: ["sleep_stages", "other"],
        // SpO₂ は respiration 優先、なければ sleep_stages
        spo2: ["respiration", "sleep_stages", "other"],
        // 睡眠詳細由来の不足項目
        sleepEfficiency: ["sleep_detail", "circadian", "other"],
        sleepDebt: ["sleep_detail", "circadian", "other"],
        sleepLatency: ["sleep_detail", "bed_wake", "other"],
        circadianRhythm: ["circadian", "sleep_detail", "other"],
        respiratoryRate: ["respiration", "rhr", "hrv", "other"],
        restingHeartRate: ["rhr", "respiration", "hrv", "other"],
      };

      const scoredCandidates: Array<{ index: number; score: number }> = [];
      for (const item of perImage) {
        if (item.error) continue;
        let score = 0;
        for (const key of stillMissing) {
          const allowed = screenForKey[key] ?? ["other"];
          const rank = allowed.indexOf(item.screenType);
          if (rank >= 0) score += 100 - rank * 20;
          else if (item.screenType === "other" || item.readings.length === 0) {
            score += 5;
          }
        }
        if (score > 0) scoredCandidates.push({ index: item.imageIndex, score });
      }
      scoredCandidates.sort((a, b) => b.score - a.score || a.index - b.index);

      const indexes =
        scoredCandidates.length > 0
          ? scoredCandidates
              .slice(0, CRITICAL_REOCR_MAX_IMAGES)
              .map((c) => c.index)
          : perImage
              .map((item) => item.imageIndex)
              .slice(0, CRITICAL_REOCR_MAX_IMAGES);

      type CriticalRetryRow = {
        imageIndex: number;
        targetScreen: SoxaiScreenType;
        fixedScreenType?: SoxaiScreenType;
        baseReadings: VisibleReading[];
        retry: {
          screenType: SoxaiScreenType;
          readings: VisibleReading[];
        };
      };
      const criticalRetries: CriticalRetryRow[] = [];

      await runPool(indexes, RECOVERY_OCR_CONCURRENCY, async (imageIndex) => {
        if (request.signal.aborted) return;
        const item = perImage[imageIndex];
        if (!item || item.error) return;

        const remaining = [...stillMissing];
        const targetScreen =
          item.screenType !== "other"
            ? item.screenType
            : remaining.includes("skinTemperature")
              ? "skin_temp"
              : remaining.includes("stress")
                ? "stress"
                : remaining.includes("bedtime") || remaining.includes("wakeTime")
                  ? "bed_wake"
                  : "sleep_detail";
        const fixedScreenType = fixedSections?.[imageIndex]
          ? sectionToScreenType(fixedSections[imageIndex])
          : undefined;
        const retryScreen = fixedScreenType ?? targetScreen;

        try {
          // critical 再OCRも ROI 切り出し優先（数字取得率）
          const crops = await cropScreenRois(images[imageIndex], retryScreen);
          const needed = crops.filter((c) =>
            c.roi.focusKeys.some((k) => remaining.includes(k)),
          );
          const targets = needed.length > 0 ? needed : crops.slice(0, 2);
          const mergedRetryReadings: VisibleReading[] = [];
          let lastScreen = retryScreen;
          for (const crop of targets) {
            const part = await runVisionOnImage(
              crop.dataUrl,
              roiOcrPrompt({
                screenType: retryScreen,
                roi: crop.roi,
                imageIndex,
                total: images.length,
              }),
              {
                imageIndex,
                purpose: "criticalReOcr",
                detail: OCR_DETAIL_ACCURATE,
              },
            );
            lastScreen = part.screenType || lastScreen;
            for (const reading of part.readings) {
              const dedupe = `${reading.label}::${reading.value}`;
              if (
                !mergedRetryReadings.some(
                  (r) => `${r.label}::${r.value}` === dedupe,
                )
              ) {
                mergedRetryReadings.push(reading);
              }
            }
          }
          const retry = {
            screenType: lastScreen,
            readings: mergedRetryReadings,
          };
          criticalRetries.push({
            imageIndex,
            targetScreen,
            fixedScreenType,
            baseReadings: item.readings,
            retry: {
              screenType: retry.screenType,
              readings: retry.readings,
            },
          });
        } catch (reOcrError) {
          if (isRateLimitError(reOcrError)) {
            log429Event({
              imageIndex,
              callNo: visionCallSeq,
              purpose: "criticalReOcr",
              attempt: 1,
              action: "継続（次処理へ）",
              error: reOcrError,
            });
          }
          logOcrTraceError("criticalReOcr", reOcrError, {
            imageIndex,
            remaining,
          });
          console.warn(
            "[api/extract] screen-specific critical re-OCR failed",
            { imageIndex, remaining },
            reOcrError,
          );
        }
      });

      for (const row of criticalRetries.sort(
        (a, b) => a.imageIndex - b.imageIndex,
      )) {
        const remaining = criticalAndFocusKeys.filter(
          (key) => !isMetricPresent(metrics, key),
        );
        if (remaining.length === 0) break;
        const item = perImage[row.imageIndex];
        if (!item) continue;

        const mergedReadings = [...row.baseReadings];
        for (const reading of row.retry.readings) {
          const dedupe = `${reading.label}::${reading.value}`;
          if (
            !mergedReadings.some((r) => `${r.label}::${r.value}` === dedupe)
          ) {
            mergedReadings.push(reading);
          }
        }

        const remapped = mapVisibleReadingsToMetricsDetailed(mergedReadings, {
          screenType:
            row.fixedScreenType ??
            (row.retry.screenType !== "other"
              ? row.retry.screenType
              : row.targetScreen),
        });

        let gained = false;
        for (const key of remaining) {
          if (
            !isMetricPresent(metrics, key) &&
            isMetricPresent(remapped.metrics, key)
          ) {
            metrics = {
              ...metrics,
              [key]: remapped.metrics[key],
            };
            if (confidence[key] == null) confidence[key] = 0.78;
            gained = true;
          }
        }

        if (!gained) {
          const fromAll = recoverCriticalMetricsFromReadings([
            ...allReadings,
            ...row.retry.readings,
          ]);
          for (const key of remaining) {
            if (
              !isMetricPresent(metrics, key) &&
              isMetricPresent(fromAll, key)
            ) {
              metrics = { ...metrics, [key]: fromAll[key] };
              if (confidence[key] == null) confidence[key] = 0.7;
              gained = true;
            }
          }
        }

        if (gained) {
          item.readings = mergedReadings;
          if (row.retry.screenType !== "other") {
            item.screenType = row.retry.screenType;
          }
        }
      }

      metrics = normalizeOcrMetrics(
        enrichMetricsFromGraphs(metrics, graphBundle),
        graphBundle,
      );
    }
    timing.end({
      collected: collectedMetricKeys(metrics).length,
      stillMissingCritical: CRITICAL_METRIC_KEYS.filter(
        (key) => !isMetricPresent(metrics, key),
      ),
    });

    // 再OCR後もノンレムを確定（浅い・深い OCR から。睡眠時間の誤マッピングは破棄）
    applyNonRemFromStageOcr(metrics);

    timing.begin("normalize");
    const metricsBeforeDisplayNormalize = metrics;
    console.info(`${OCR_TRACE} focus ② マッピング後（表示正規化前）`, {
      stage: "mapped-before-display-normalize",
      focus: Object.fromEntries(
        FOCUS_METRIC_KEYS.map((key) => [key, metricDisplayValue(metricsBeforeDisplayNormalize, key)]),
      ),
    });
    const verifyDiagnostics = buildVerifyDiagnostics({
      perImage,
      mergedRaw,
      beforeDisplayNormalize: metricsBeforeDisplayNormalize,
    });
    metrics = normalizeMetricsForDisplay(metricsBeforeDisplayNormalize);
    const focusLoss = Object.fromEntries(
      FOCUS_METRIC_KEYS.map((key) => {
        const hasOcrCandidate = focusOcrCandidates[key].length > 0;
        const hasNormalized = isMetricPresent(metricsBeforeDisplayNormalize, key);
        const hasFinal = isMetricPresent(metrics, key);
        const lostAt = !hasOcrCandidate
          ? "① OCR取得結果で未検出"
          : !hasNormalized
            ? "② マッピング後で未格納"
            : !hasFinal
              ? "③ 表示正規化で消失"
              : "none";
        return [
          key,
          {
            hasOcrCandidate,
            hasNormalized,
            hasFinal,
            lostAt,
            finalValue: metricDisplayValue(metrics, key),
          },
        ];
      }),
    ) as Record<
      MetricFieldKey,
      {
        hasOcrCandidate: boolean;
        hasNormalized: boolean;
        hasFinal: boolean;
        lostAt: string;
        finalValue: string;
      }
    >;
    console.info(`${OCR_TRACE} focus ③ 最終metricsへ格納`, {
      stage: "final-metrics",
      focus: Object.fromEntries(
        FOCUS_METRIC_KEYS.map((key) => [key, metricDisplayValue(metrics, key)]),
      ),
      loss: Object.fromEntries(FOCUS_METRIC_KEYS.map((key) => [key, focusLoss[key]])),
    });
    const metricSources = detectMetricSources(metrics, perImage);

    // 最終 metrics で整合性を再評価し、矛盾キーだけ信頼度を下げて要確認にする
    const consistencyWarnings = detectMetricConsistencyWarnings(metrics);
    for (const key of consistencyWarningKeys(consistencyWarnings)) {
      if (confidence[key] != null) {
        confidence[key] = Math.min(
          confidence[key]!,
          OCR_LOW_CONFIDENCE_THRESHOLD - 0.01,
        );
      }
    }

    const keys = collectedMetricKeys(metrics);
    const missingKeys = missingMetricKeys(metrics);
    const missingLabels = missingMetricLabels(metrics);
    const graphPanels = graphPanelCount(graphBundle);
    timing.end({ collected: keys.length, missing: missingKeys });

    const needsReviewDiagnosis = diagnoseNeedsReview({
      metrics,
      imageKeys: keys,
      conflicts,
      confidence,
      consistencyWarnings,
    });
    logNeedsReviewDiagnosis(
      "[api/extract] needs-review diagnosis",
      needsReviewDiagnosis,
    );

    const timingSnapshot = timing.snapshot();
    console.info("[api/extract] timing", {
      totalMs: timingSnapshot.totalMs,
      concurrency: timingSnapshot.concurrency,
      phases: timingSnapshot.phases.map((p) => ({
        name: p.name,
        durationMs: p.durationMs,
        detail: p.detail,
      })),
      perImage: perImage.map((item) => ({
        imageIndex: item.imageIndex,
        screenType: item.screenType,
        durationMs: item.endedAt - item.startedAt,
        phases: timingSnapshot.perImage.find(
          (row) => row.imageIndex === item.imageIndex,
        )?.phases,
        error: item.error ?? null,
      })),
    });

    console.info("[api/extract] metrics coverage", {
      collected: `${keys.length}/${SOXAI_METRIC_FIELDS.length}`,
      present: keys,
      missing: missingKeys,
      missingLabels,
      apiCalls,
      totalMs: timingSnapshot.totalMs,
    });
    logMissingAccuracyMetrics("[api/extract]", {
      metrics,
      readings: allReadings,
    });

    const usageEntry: Omit<OpenAiUsageEntry, "id" | "at"> = {
      purpose: "ocr",
      model: OCR_MODEL,
      apiCalls,
      inputTokens,
      outputTokens,
      durationMs: timingSnapshot.totalMs,
      imageCount: images.length,
      cacheHits,
      note:
        apiCalls === 0
          ? "server-cache-only"
          : "per-image-vision",
    };

    console.info("[api/extract] usage", usageEntry);

    // 全画像が失敗、または何も読めなかった場合
    // 単枚モードはクライアントがスキップ継続するため 200 + error で返す
    if (allReadings.length === 0) {
      const allFailed = failedCount === images.length;
      if (extractOptions.mode === "single" || images.length === 1) {
        return NextResponse.json({
          metrics: normalizeMetricsForDisplay(
            mapVisibleReadingsToMetricsDetailed([]).metrics,
          ),
          graphs: graphBundle,
          visibleReadings: [],
          conflicts: [],
          confidence: {},
          consistencyWarnings: [],
          metricSources: {},
          collectedCount: 0,
          graphPanelCount: 0,
          visibleCount: 0,
          imageCount: images.length,
          perImage: perImage.map((item) => ({
            imageIndex: item.imageIndex,
            screenType: item.screenType,
            visibleCount: item.readings.length,
            graphPanels: item.graphReadings.map((g) => g.id),
            collectedCount: collectedMetricKeys(item.metrics).length,
            error: item.error ?? (allFailed ? "OCR失敗" : "Empty Extraction"),
            startedAt: item.startedAt,
            endedAt: item.endedAt,
            durationMs: item.endedAt - item.startedAt,
          })),
          verifyDiagnostics: {},
          usage: usageEntry,
          timing: timingSnapshot,
          imageHashes,
        });
      }
      return NextResponse.json(
        {
          error: allFailed
            ? "すべての画像の解析に失敗しました。しばらくしてから再度お試しください。"
            : "画像から数値を読み取れませんでした。鮮明なSOXAIスクリーンショット（JPG / JPEG / PNG / WEBP）をアップロードしてください。",
          errorType: allFailed ? "OpenAI Error" : "Empty Extraction",
          usage: usageEntry,
          timing: timingSnapshot,
          details: isDev
            ? JSON.stringify(
                perImage.map((item) => ({
                  imageIndex: item.imageIndex,
                  error: item.error ?? null,
                  readings: item.readings.length,
                })),
              )
            : undefined,
        },
        { status: allFailed ? 500 : 422 },
      );
    }

    return NextResponse.json({
      metrics,
      graphs: graphBundle,
      visibleReadings: allReadings,
      conflicts,
      confidence,
      consistencyWarnings,
      metricSources,
      collectedCount: keys.length,
      graphPanelCount: graphPanels,
      visibleCount: allReadings.length,
      imageCount: images.length,
      perImage: perImage.map((item) => ({
        imageIndex: item.imageIndex,
        screenType: item.screenType,
        visibleCount: item.readings.length,
        graphPanels: item.graphReadings.map((g) => g.id),
        collectedCount: collectedMetricKeys(item.metrics).length,
        error: item.error ?? null,
        startedAt: item.startedAt,
        endedAt: item.endedAt,
        durationMs: item.endedAt - item.startedAt,
      })),
      verifyDiagnostics,
      usage: usageEntry,
      timing: timingSnapshot,
      imageHashes,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      log429Event({
        imageIndex: null,
        callNo: -1,
        purpose: "POST",
        attempt: 1,
        action: "中断（throw）",
        error,
      });
    }
    logOcrTraceError("POST", error);
    console.error("[api/extract] OpenAI extract failed:", error);
    const details = openaiErrorMessage(error);
    return NextResponse.json(
      {
        error:
          "画像解析サービスでエラーが発生しました。しばらくしてから再度お試しください。",
        errorType: "OpenAI Error",
        details: isDev ? details : undefined,
      },
      { status: 500 },
    );
  }
}
