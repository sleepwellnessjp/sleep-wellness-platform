import {
  collectedMetricKeys,
  emptyMetrics,
  normalizeMetrics,
  SOXAI_METRIC_FIELDS,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";

export type { AnalysisMetrics };
export { normalizeMetrics };

type LifestyleData = {
  /** 既存クライアントから開始した場合の ID（Supabase / ローカル保存用） */
  clientId?: string;
  clientName: string;
  measurementDate: string;
  bedtime: string;
  wakeTime: string;
  exercise: string;
  yoga: string;
  yogaDone?: string;
  yogaDuration?: string;
  yogaTime?: string;
  yogaNotes?: string;
  pilates?: string;
  pilatesDone?: string;
  pilatesDuration?: string;
  pilatesTime?: string;
  pilatesNotes?: string;
  otherExerciseDone?: string;
  otherExerciseName?: string;
  otherExerciseDuration?: string;
  otherExerciseTime?: string;
  otherExerciseNotes?: string;
  bathing: string;
  alcohol: string;
  alcoholDrank: string;
  alcoholType: string;
  alcoholAmount: string;
  alcoholEndTime: string;
  alcoholNotes: string;
  caffeine: string;
  caffeineDone?: string;
  caffeineType?: string;
  caffeineAmount?: string;
  caffeineTime?: string;
  caffeineNotes?: string;
  stress: string;
  meals: string;
  breakfastEaten?: string;
  breakfastTime: string;
  breakfastContent: string;
  lunchEaten?: string;
  lunchTime: string;
  lunchContent: string;
  dinnerEaten?: string;
  dinnerTime: string;
  dinnerContent: string;
  work: string;
  condition: string;
  nasalCongestion: string;
  notes: string;
};

export type AnalysisRequest = {
  lifestyle: LifestyleData;
  images: string[];
  /** 確認画面で確定したメトリクス（画像優先＋不足分の手入力） */
  metrics?: AnalysisMetrics;
};

/** 複数画像で同一項目に異なる値があった場合の競合情報 */
export type MetricConflict = {
  key: MetricFieldKey;
  label: string;
  adopted: string;
  alternatives: string[];
};

/** 入力 → 画像抽出確認までの下書き */
export type ExtractionDraft = {
  lifestyle: LifestyleData;
  images: string[];
  extractedMetrics: AnalysisMetrics;
  /** 画像から取得できたキー */
  imageKeys: MetricFieldKey[];
  /** 複数画像間で値が食い違った項目 */
  conflicts?: MetricConflict[];
};

/** 1〜5の星評価。Score 内訳用 */
export type ScoreStars = 1 | 2 | 3 | 4 | 5;

export type ScoreBreakdown = {
  sleepDuration: ScoreStars;
  sleepEfficiency: ScoreStars;
  deepSleep: ScoreStars;
  hrv: ScoreStars;
  stress: ScoreStars;
  spo2: ScoreStars;
  recovery: ScoreStars;
};

export type AnalysisResult = {
  /** ①総合評価 */
  summary: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  metrics: AnalysisMetrics;
  /** ②今回良かった点 */
  goodPoints: string[];
  /** ③改善点 */
  improvements: string[];
  /** ④睡眠データ考察 */
  dataInsight: string;
  /** ⑤生活習慣との関係 */
  lifestyleRelation: string;
  /** ⑥Tomorrow Plan */
  tomorrowPlan: string[];
  caution: string;
  disclaimer: string;
  clientId?: string;
  clientName?: string;
  measurementDate?: string;
};

const RESULT_KEY = "swij-analysis-result";
const IMAGES_KEY = "swij-analysis-images";
const MAX_STORED_IMAGES = 10;

let pendingRequest: AnalysisRequest | null = null;
let extractionDraft: ExtractionDraft | null = null;
let inFlightAnalysis: Promise<AnalysisResult> | null = null;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function clampStars(value: unknown, fallback: ScoreStars): ScoreStars {
  const n = typeof value === "number" ? Math.round(value) : fallback;
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 4;
  return 5;
}

function starsFromOverall(score: number): ScoreStars {
  if (score >= 90) return 5;
  if (score >= 78) return 4;
  if (score >= 62) return 3;
  if (score >= 45) return 2;
  return 1;
}

export function normalizeScoreBreakdown(
  breakdown: Partial<ScoreBreakdown> | undefined,
  score: number,
): ScoreBreakdown {
  const base = starsFromOverall(score);
  return {
    sleepDuration: clampStars(breakdown?.sleepDuration, base),
    sleepEfficiency: clampStars(breakdown?.sleepEfficiency, base),
    deepSleep: clampStars(breakdown?.deepSleep, base),
    hrv: clampStars(breakdown?.hrv, base),
    stress: clampStars(breakdown?.stress, base),
    spo2: clampStars(breakdown?.spo2, base),
    recovery: clampStars(breakdown?.recovery, base),
  };
}

function normalizeStringList(items: unknown, max: number): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

type LegacyAnalysisFields = {
  possibleFactors?: unknown;
  actions?: unknown;
  yoga?: unknown;
  closingSummary?: unknown;
};

function normalizeAnalysisResult(
  raw: AnalysisResult & LegacyAnalysisFields,
  extras?: {
    clientId?: string;
    clientName?: string;
    measurementDate?: string;
  },
): AnalysisResult {
  const score =
    typeof raw.score === "number" && Number.isFinite(raw.score)
      ? Math.max(0, Math.min(100, Math.round(raw.score)))
      : 0;

  const dataInsight =
    typeof raw.dataInsight === "string" && raw.dataInsight.trim()
      ? raw.dataInsight.trim()
      : typeof raw.closingSummary === "string"
        ? raw.closingSummary.trim()
        : "";

  const lifestyleRelation =
    typeof raw.lifestyleRelation === "string" && raw.lifestyleRelation.trim()
      ? raw.lifestyleRelation.trim()
      : normalizeStringList(raw.possibleFactors, 3).join(" ");

  const tomorrowPlan = (() => {
    const plan = normalizeStringList(raw.tomorrowPlan, 3);
    if (plan.length > 0) return plan;
    return normalizeStringList(raw.actions, 3);
  })();

  return {
    summary: typeof raw.summary === "string" ? raw.summary.trim() : "",
    score,
    scoreBreakdown: normalizeScoreBreakdown(raw.scoreBreakdown, score),
    metrics: normalizeMetrics(raw.metrics),
    goodPoints: normalizeStringList(raw.goodPoints, 3),
    improvements: normalizeStringList(raw.improvements, 2),
    dataInsight,
    lifestyleRelation,
    tomorrowPlan,
    caution: typeof raw.caution === "string" ? raw.caution.trim() : "",
    disclaimer: typeof raw.disclaimer === "string" ? raw.disclaimer.trim() : "",
    clientId: extras?.clientId ?? raw.clientId,
    clientName: extras?.clientName ?? raw.clientName,
    measurementDate: extras?.measurementDate ?? raw.measurementDate,
  };
}

function storeImages(images: string[]) {
  const limited = images.slice(0, MAX_STORED_IMAGES);

  try {
    sessionStorage.setItem(IMAGES_KEY, JSON.stringify(limited));
  } catch {
    for (let count = limited.length - 1; count >= 1; count -= 1) {
      try {
        sessionStorage.setItem(
          IMAGES_KEY,
          JSON.stringify(limited.slice(0, count)),
        );
        return;
      } catch {
        // continue
      }
    }
    sessionStorage.removeItem(IMAGES_KEY);
  }
}

export function setExtractionDraft(draft: ExtractionDraft) {
  extractionDraft = {
    ...draft,
    extractedMetrics: normalizeMetrics(draft.extractedMetrics),
    imageKeys: [...draft.imageKeys],
    conflicts: draft.conflicts ? [...draft.conflicts] : [],
  };
}

export function getExtractionDraft(): ExtractionDraft | null {
  return extractionDraft;
}

export function clearExtractionDraft() {
  extractionDraft = null;
}

export function setPendingAnalysisRequest(request: AnalysisRequest) {
  pendingRequest = {
    ...request,
    metrics: request.metrics
      ? normalizeMetrics(request.metrics)
      : undefined,
  };
  inFlightAnalysis = null;
}

export class AnalysisError extends Error {
  status?: number;
  errorType?: string;
  details?: string;

  constructor(
    message: string,
    options?: { status?: number; errorType?: string; details?: string },
  ) {
    super(message);
    this.name = "AnalysisError";
    this.status = options?.status;
    this.errorType = options?.errorType;
    this.details = options?.details;
  }
}

/** 画面表示用。APIキー等の秘密情報は含めない */
export function formatExtractErrorMessage(err: unknown): string {
  if (err instanceof AnalysisError) {
    const type = err.errorType ?? "";
    if (
      type === "Config Error" ||
      err.message.includes("設定が完了していません")
    ) {
      return "画像解析APIの設定が完了していません。.env.local に OPENAI_API_KEY を設定し、開発サーバーを再起動してください。";
    }
    if (type === "Fetch Error") {
      return "画像の送信に失敗しました。ネットワーク接続を確認して、もう一度お試しください。";
    }
    if (type === "Validation Error") {
      return (
        err.message ||
        "画像形式が正しくありません。JPG / JPEG / PNG / WEBP で送信してください。"
      );
    }
    if (type === "JSON Parse Error") {
      return "画像解析結果のJSON解析に失敗しました。もう一度お試しください。";
    }
    if (type === "Empty Extraction") {
      return err.message;
    }
    if (type === "OpenAI Error") {
      return (
        err.message ||
        "画像解析サービスでエラーが発生しました。しばらくしてから再度お試しください。"
      );
    }
    return err.message || "画像の自動解析に失敗しました。";
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return "画像の自動解析に失敗しました。もう一度お試しください。";
}

export type ExtractSoxaiResult = {
  metrics: AnalysisMetrics;
  conflicts: MetricConflict[];
};

export async function extractSoxaiMetrics(
  images: string[],
): Promise<AnalysisMetrics> {
  const result = await extractSoxaiMetricsDetailed(images);
  return result.metrics;
}

export async function extractSoxaiMetricsDetailed(
  images: string[],
): Promise<ExtractSoxaiResult> {
  if (!Array.isArray(images) || images.length === 0) {
    throw new AnalysisError("睡眠データ画像が不足しています。", {
      errorType: "Validation Error",
    });
  }

  const payloadBytes = images.reduce((sum, image) => sum + image.length, 0);
  console.info("[extract] sending images to /api/extract", {
    count: images.length,
    approxBytes: payloadBytes,
    mimeHints: images.map((image) => {
      const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
      return match?.[1] ?? "unknown";
    }),
  });

  let response: Response;
  try {
    response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });
  } catch (fetchError) {
    console.error("Extract fetch failed:", fetchError);
    throw new AnalysisError(
      "画像の送信に失敗しました。ネットワークエラーが発生しました。",
      {
        errorType: "Fetch Error",
        details:
          fetchError instanceof Error
            ? fetchError.message
            : String(fetchError),
      },
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (parseError) {
    console.error("Extract response JSON parse failed:", parseError, {
      status: response.status,
    });
    throw new AnalysisError(
      "画像解析結果のJSON解析に失敗しました。",
      {
        status: response.status,
        errorType: "JSON Parse Error",
        details:
          parseError instanceof Error
            ? parseError.message
            : String(parseError),
      },
    );
  }

  if (!response.ok) {
    const errorPayload =
      data && typeof data === "object"
        ? (data as {
            error?: unknown;
            errorType?: unknown;
            details?: unknown;
          })
        : {};

    const message =
      typeof errorPayload.error === "string"
        ? errorPayload.error
        : "画像の自動解析に失敗しました。";
    const errorType =
      typeof errorPayload.errorType === "string"
        ? errorPayload.errorType
        : "OpenAI Error";
    const details =
      typeof errorPayload.details === "string"
        ? errorPayload.details
        : undefined;

    console.error("Extract API error:", {
      status: response.status,
      errorType,
      message,
      details,
    });

    throw new AnalysisError(message, {
      status: response.status,
      errorType,
      details,
    });
  }

  const metricsRaw =
    data && typeof data === "object" && "metrics" in data
      ? (data as { metrics: Partial<AnalysisMetrics> }).metrics
      : (data as Partial<AnalysisMetrics>);

  if (!metricsRaw || typeof metricsRaw !== "object") {
    console.error("Extract API returned invalid metrics payload:", data);
    throw new AnalysisError(
      "画像解析結果の形式が不正です。もう一度お試しください。",
      { errorType: "JSON Parse Error", status: response.status },
    );
  }

  const normalized = normalizeMetrics(metricsRaw);
  const conflicts = normalizeExtractConflicts(
    data && typeof data === "object" && "conflicts" in data
      ? (data as { conflicts: unknown }).conflicts
      : undefined,
  );

  console.info("[extract] metrics received", {
    collected: collectedMetricKeys(normalized).length,
    keys: collectedMetricKeys(normalized),
    conflicts: conflicts.length,
  });

  return { metrics: normalized, conflicts };
}

function normalizeExtractConflicts(raw: unknown): MetricConflict[] {
  if (!Array.isArray(raw)) return [];

  const labelByKey = new Map(
    SOXAI_METRIC_FIELDS.map((field) => [field.key, field.label] as const),
  );
  const validKeys = new Set(SOXAI_METRIC_FIELDS.map((field) => field.key));

  return raw
    .map((item): MetricConflict | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as {
        key?: unknown;
        adopted?: unknown;
        adoptedValue?: unknown;
        alternatives?: unknown;
        otherValues?: unknown;
      };
      const key =
        typeof record.key === "string" && validKeys.has(record.key as MetricFieldKey)
          ? (record.key as MetricFieldKey)
          : null;
      if (!key) return null;

      const adopted = asString(record.adopted || record.adoptedValue).trim();
      const altSource = Array.isArray(record.alternatives)
        ? record.alternatives
        : Array.isArray(record.otherValues)
          ? record.otherValues
          : [];
      const alternatives = altSource
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value && value !== adopted);

      if (!adopted || alternatives.length === 0) return null;

      return {
        key,
        label: labelByKey.get(key) ?? key,
        adopted,
        alternatives: [...new Set(alternatives)],
      };
    })
    .filter((item): item is MetricConflict => item !== null);
}

/** 抽出結果と任意の手入力をマージ（画像で取れた値を優先） */
export function mergeMetricsPreferImage(
  extracted: AnalysisMetrics,
  manual: Partial<AnalysisMetrics>,
): AnalysisMetrics {
  const imageKeys = new Set(collectedMetricKeys(extracted));
  const base = emptyMetrics();

  for (const key of Object.keys(base) as MetricFieldKey[]) {
    if (key === "sleepScore") {
      if (imageKeys.has("sleepScore")) {
        base.sleepScore = extracted.sleepScore;
      } else if (
        typeof manual.sleepScore === "number" &&
        Number.isFinite(manual.sleepScore)
      ) {
        base.sleepScore = manual.sleepScore;
      } else {
        base.sleepScore = null;
      }
      continue;
    }

    if (imageKeys.has(key)) {
      base[key] = extracted[key];
    } else {
      const manualValue = asString(manual[key]).trim();
      base[key] = manualValue || "";
    }
  }

  return base;
}

export function runPendingAnalysis(): Promise<AnalysisResult> {
  if (inFlightAnalysis) {
    return inFlightAnalysis;
  }

  const payload = pendingRequest;
  if (!payload) {
    return Promise.reject(
      new Error("分析データが見つかりません。最初から入力してください。"),
    );
  }

  inFlightAnalysis = (async () => {
    let response: Response;
    try {
      response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (fetchError) {
      console.error("Analysis fetch failed:", fetchError);
      throw new AnalysisError(
        "AI分析に失敗しました。ネットワークエラーが発生しました。",
        {
          errorType: "Fetch Error",
          details:
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
        },
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Analysis response JSON parse failed:", parseError, {
        status: response.status,
      });
      throw new AnalysisError("AI分析に失敗しました。", {
        status: response.status,
        errorType: "JSON Parse Error",
        details:
          parseError instanceof Error
            ? parseError.message
            : String(parseError),
      });
    }

    if (!response.ok) {
      const errorPayload =
        data && typeof data === "object"
          ? (data as {
              error?: unknown;
              errorType?: unknown;
              details?: unknown;
            })
          : {};

      const message =
        typeof errorPayload.error === "string"
          ? errorPayload.error
          : "AI分析に失敗しました。";
      const errorType =
        typeof errorPayload.errorType === "string"
          ? errorPayload.errorType
          : "OpenAI Error";
      const details =
        typeof errorPayload.details === "string"
          ? errorPayload.details
          : undefined;

      console.error("Analysis API error:", {
        status: response.status,
        errorType,
        message,
        details,
        data,
      });

      throw new AnalysisError(message, {
        status: response.status,
        errorType,
        details,
      });
    }

    const raw = data as AnalysisResult;
    const result = normalizeAnalysisResult(raw, {
      clientId: payload.lifestyle.clientId,
      clientName: payload.lifestyle.clientName,
      measurementDate: payload.lifestyle.measurementDate,
    });

    pendingRequest = null;
    clearExtractionDraft();
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
    storeImages(payload.images);
    return result;
  })();

  inFlightAnalysis.catch((error) => {
    console.error("Pending analysis failed:", error);
    inFlightAnalysis = null;
  });

  return inFlightAnalysis;
}

export function loadAnalysisResult(): AnalysisResult | null {
  const raw = sessionStorage.getItem(RESULT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AnalysisResult;
    return normalizeAnalysisResult(parsed);
  } catch {
    return null;
  }
}

export function loadAnalysisImages(): string[] {
  const raw = sessionStorage.getItem(IMAGES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string =>
        typeof item === "string" && item.startsWith("data:image/"),
    );
  } catch {
    return [];
  }
}
