import {
  collectedMetricKeys,
  emptyMetrics,
  normalizeMetrics,
  SOXAI_METRIC_FIELDS,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import {
  emptyGraphBundle,
  graphPanelCount,
  type SoxaiGraphBundle,
} from "@/lib/soxai-graphs";
import {
  mergeMetricsFromVisibleReadings,
  normalizeVisibleReadings,
} from "@/lib/soxai-reading-map";
import type { MetricConfidenceMap } from "@/lib/soxai-merge";
import type {
  AnalysisDayContext,
  ClientProfileSections,
} from "@/lib/client-profiles/types";
import type { AnalysisAiInput } from "@/lib/client-profiles/ai-input";

export type { AnalysisMetrics };
export type { SoxaiGraphBundle };
export type { MetricConfidenceMap };
export { normalizeMetrics };

type LifestyleData = {
  /** 既存クライアントから開始した場合の ID（Supabase / ローカル保存用） */
  clientId?: string;
  clientName: string;
  measurementDate: string;
  /** クライアント基本情報 */
  age?: string;
  gender?: string;
  heightCm?: string;
  weightKg?: string;
  medications?: string;
  drinkingHabit?: string;
  exerciseHabit?: string;
  snoringNasal?: string;
  medicalHistory?: string;
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
  /** OCR生データ（確認前）。保存用 */
  extractedMetrics?: AnalysisMetrics;
  /** OCRで抽出したグラフデータ（Visual Report 用） */
  graphs?: SoxaiGraphBundle;
  /** 項目別 OCR 信頼度 0–1 */
  ocrConfidence?: MetricConfidenceMap;
  /**
   * 選択クライアントの固定プロフィール（client_profiles）
   * 当日情報と混在させない。未選択時は undefined
   */
  fixedProfile?: ClientProfileSections;
  /**
   * 分析日ごとの当日情報（将来フォーム用。今回は通常未設定）
   */
  dayContext?: AnalysisDayContext;
  /**
   * AI分析用の構造化入力（SOXAI + 当日 + 固定プロフィール）
   * Medical / Visual / PDF が同じ分析結果を使うための準備
   */
  aiInput?: AnalysisAiInput;
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
  /** 項目別 OCR 信頼度 0–1 */
  ocrConfidence?: MetricConfidenceMap;
  /** OCRで抽出したグラフ（Visual / PDF 共通） */
  graphs: SoxaiGraphBundle;
  /** 選択クライアントの固定プロフィール（あれば） */
  fixedProfile?: ClientProfileSections;
  /** 当日情報（将来用。今回は通常未設定） */
  dayContext?: AnalysisDayContext;
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
  /** ①総合評価（100〜200文字） */
  summary: string;
  /** ②睡眠分析（指標を関連付けた考察） */
  sleepAnalysis: string;
  /** ③自律神経評価（HRV・安静時心拍・ストレス） */
  autonomicAssessment: string;
  /** ④回復力評価（睡眠の質・身体回復・疲労回復） */
  recoveryAssessment: string;
  /** ⑤改善ポイント（優先順位付き 3〜5件） */
  improvements: string[];
  /** ⑥メラトニンヨガ™の視点（光・呼吸・運動・食事・入浴・瞑想） */
  melatoninYoga: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  metrics: AnalysisMetrics;
  /** OCRグラフ（Medical / Visual / PDF 共通） */
  graphs?: SoxaiGraphBundle;
  /** OCR抽出時点の値（保存・履歴用。分析本文には使わない） */
  extractedMetrics?: AnalysisMetrics;
  caution: string;
  disclaimer: string;
  clientId?: string;
  clientName?: string;
  measurementDate?: string;
  /** クライアント基本情報（Medical Report 用） */
  age?: string;
  gender?: string;
  heightCm?: string;
  weightKg?: string;
  medications?: string;
  drinkingHabit?: string;
  exerciseHabit?: string;
  snoringNasal?: string;
  medicalHistory?: string;
  /** 保存済み分析の再表示用 ID */
  analysisId?: string;
  /** 項目別 OCR 信頼度（保存用） */
  ocrConfidence?: MetricConfidenceMap;
  /** @deprecated 旧スキーマ互換 → sleepAnalysis */
  sleepCharacteristics?: string;
  /** @deprecated 旧スキーマ互換 */
  actionPlan?: string[];
  /** @deprecated 旧スキーマ互換 */
  goodPoints?: string[];
  /** @deprecated 旧スキーマ互換 → sleepAnalysis */
  dataInsight?: string;
  /** @deprecated 旧スキーマ互換 */
  lifestyleRelation?: string;
  /** @deprecated 旧スキーマ互換 */
  tomorrowPlan?: string[];
};

const RESULT_KEY = "swij-analysis-result";
const IMAGES_KEY = "swij-analysis-images";
const GRAPHS_KEY = "swij-analysis-graphs";
const MAX_STORED_IMAGES = 10;

let pendingRequest: AnalysisRequest | null = null;
let extractionDraft: ExtractionDraft | null = null;
let inFlightAnalysis: Promise<AnalysisResult> | null = null;

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
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
  sleepAnalysis?: unknown;
  sleepCharacteristics?: unknown;
  autonomicAssessment?: unknown;
  recoveryAssessment?: unknown;
  actionPlan?: unknown;
  melatoninYoga?: unknown;
};

/** 総合評価を 100〜200 文字に整える（短すぎる場合はそのまま） */
function normalizeSummaryLength(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 200) return trimmed;
  // 文末付近で切る
  const slice = trimmed.slice(0, 200);
  const lastPunct = Math.max(
    slice.lastIndexOf("。"),
    slice.lastIndexOf("！"),
    slice.lastIndexOf("？"),
    slice.lastIndexOf("."),
  );
  if (lastPunct >= 100) return slice.slice(0, lastPunct + 1);
  return `${slice.trimEnd()}…`;
}

export function normalizeAnalysisResult(
  raw: AnalysisResult & LegacyAnalysisFields,
  extras?: {
    clientId?: string;
    clientName?: string;
    measurementDate?: string;
    age?: string;
    gender?: string;
    heightCm?: string;
    weightKg?: string;
    medications?: string;
    drinkingHabit?: string;
    exerciseHabit?: string;
    snoringNasal?: string;
    medicalHistory?: string;
  },
): AnalysisResult {
  const score =
    typeof raw.score === "number" && Number.isFinite(raw.score)
      ? Math.max(0, Math.min(100, Math.round(raw.score)))
      : 0;

  const sleepAnalysis = (() => {
    if (typeof raw.sleepAnalysis === "string" && raw.sleepAnalysis.trim()) {
      return raw.sleepAnalysis.trim();
    }
    if (
      typeof raw.sleepCharacteristics === "string" &&
      raw.sleepCharacteristics.trim()
    ) {
      return raw.sleepCharacteristics.trim();
    }
    if (typeof raw.dataInsight === "string" && raw.dataInsight.trim()) {
      return raw.dataInsight.trim();
    }
    if (typeof raw.closingSummary === "string" && raw.closingSummary.trim()) {
      return raw.closingSummary.trim();
    }
    return "";
  })();

  const autonomicAssessment =
    typeof raw.autonomicAssessment === "string"
      ? raw.autonomicAssessment.trim()
      : "";

  const recoveryAssessment =
    typeof raw.recoveryAssessment === "string"
      ? raw.recoveryAssessment.trim()
      : "";

  const actionPlan = (() => {
    const plan = normalizeStringList(raw.actionPlan, 5);
    if (plan.length > 0) return plan;
    const legacy = normalizeStringList(raw.tomorrowPlan, 5);
    if (legacy.length > 0) return legacy;
    return normalizeStringList(raw.actions, 5);
  })();

  const melatoninYoga = (() => {
    if (typeof raw.melatoninYoga === "string" && raw.melatoninYoga.trim()) {
      return raw.melatoninYoga.trim();
    }
    if (typeof raw.yoga === "string" && raw.yoga.trim()) {
      return raw.yoga.trim();
    }
    return [
      "今回のデータでは、光・呼吸・入浴の整えから始めるのがよい可能性があります。",
      "就寝前は強い光を控え、3:6呼吸で副交感神経側への切り替えを促します。",
      "必要に応じてぬるめの入浴と短い瞑想を組み合わせ、無理に眠ろうとせず身体感覚を整えます。",
    ].join("\n");
  })();

  const improvements = (() => {
    const list = normalizeStringList(raw.improvements, 5);
    if (list.length >= 3) return list;
    // 旧 actionPlan を補完に使う
    if (list.length > 0 && actionPlan.length > 0) {
      return [...list, ...actionPlan].slice(0, 5);
    }
    if (list.length > 0) return list;
    return actionPlan.slice(0, 5);
  })();

  const summary = normalizeSummaryLength(
    typeof raw.summary === "string" ? raw.summary : "",
  );

  return {
    summary,
    sleepAnalysis,
    autonomicAssessment,
    recoveryAssessment,
    improvements,
    melatoninYoga,
    score,
    scoreBreakdown: normalizeScoreBreakdown(raw.scoreBreakdown, score),
    metrics: normalizeMetrics(raw.metrics),
    graphs: normalizeGraphBundle(raw.graphs ?? emptyGraphBundle()),
    extractedMetrics: raw.extractedMetrics
      ? normalizeMetrics(raw.extractedMetrics)
      : undefined,
    caution: typeof raw.caution === "string" ? raw.caution.trim() : "",
    disclaimer: typeof raw.disclaimer === "string" ? raw.disclaimer.trim() : "",
    clientId: extras?.clientId ?? raw.clientId,
    clientName: extras?.clientName ?? raw.clientName,
    measurementDate: extras?.measurementDate ?? raw.measurementDate,
    age: extras?.age ?? raw.age,
    gender: extras?.gender ?? raw.gender,
    heightCm: extras?.heightCm ?? raw.heightCm,
    weightKg: extras?.weightKg ?? raw.weightKg,
    medications: extras?.medications ?? raw.medications,
    drinkingHabit: extras?.drinkingHabit ?? raw.drinkingHabit,
    exerciseHabit: extras?.exerciseHabit ?? raw.exerciseHabit,
    snoringNasal: extras?.snoringNasal ?? raw.snoringNasal,
    medicalHistory: extras?.medicalHistory ?? raw.medicalHistory,
    analysisId: typeof raw.analysisId === "string" ? raw.analysisId : undefined,
    // 旧UI・保存互換
    sleepCharacteristics: sleepAnalysis,
    actionPlan: actionPlan.length > 0 ? actionPlan : improvements.slice(0, 3),
    goodPoints: normalizeStringList(raw.goodPoints, 3),
    dataInsight: sleepAnalysis,
    lifestyleRelation:
      typeof raw.lifestyleRelation === "string"
        ? raw.lifestyleRelation.trim()
        : normalizeStringList(raw.possibleFactors, 3).join(" "),
    tomorrowPlan: actionPlan.length > 0 ? actionPlan : improvements.slice(0, 3),
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

function normalizeGraphBundle(raw: unknown): SoxaiGraphBundle {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyGraphBundle();
  }
  return raw as SoxaiGraphBundle;
}

function storeGraphs(graphs: SoxaiGraphBundle) {
  try {
    sessionStorage.setItem(GRAPHS_KEY, JSON.stringify(graphs));
  } catch {
    sessionStorage.removeItem(GRAPHS_KEY);
  }
}

export function setExtractionDraft(draft: ExtractionDraft) {
  const extractedMetrics = normalizeMetrics(draft.extractedMetrics);
  extractionDraft = {
    ...draft,
    extractedMetrics,
    imageKeys: collectedMetricKeys(extractedMetrics),
    conflicts: draft.conflicts ? [...draft.conflicts] : [],
    ocrConfidence: draft.ocrConfidence
      ? { ...draft.ocrConfidence }
      : undefined,
    graphs: normalizeGraphBundle(draft.graphs),
    fixedProfile: draft.fixedProfile,
    dayContext: draft.dayContext,
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
    extractedMetrics: request.extractedMetrics
      ? normalizeMetrics(request.extractedMetrics)
      : undefined,
    graphs: normalizeGraphBundle(request.graphs),
    ocrConfidence: request.ocrConfidence
      ? { ...request.ocrConfidence }
      : undefined,
    fixedProfile: request.fixedProfile,
    dayContext: request.dayContext,
    aiInput: request.aiInput,
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
  graphs: SoxaiGraphBundle;
  confidence: MetricConfidenceMap;
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

  const visibleReadings = normalizeVisibleReadings(
    data && typeof data === "object" && "visibleReadings" in data
      ? (data as { visibleReadings: unknown }).visibleReadings
      : [],
  );

  // visibleReadings がある場合は必ず再マッピングして metrics に反映
  const normalized = mergeMetricsFromVisibleReadings(
    metricsRaw,
    visibleReadings,
  );
  const conflicts = normalizeExtractConflicts(
    data && typeof data === "object" && "conflicts" in data
      ? (data as { conflicts: unknown }).conflicts
      : undefined,
  );

  const graphs = normalizeGraphBundle(
    data && typeof data === "object" && "graphs" in data
      ? (data as { graphs: unknown }).graphs
      : emptyGraphBundle(),
  );

  const confidence = normalizeConfidenceMap(
    data && typeof data === "object" && "confidence" in data
      ? (data as { confidence: unknown }).confidence
      : undefined,
  );

  console.info("[extract] metrics received", {
    collected: collectedMetricKeys(normalized).length,
    keys: collectedMetricKeys(normalized),
    visibleReadingCount: visibleReadings.length,
    visibleLabels: visibleReadings.map((reading) => reading.label),
    graphPanelCount: graphPanelCount(graphs),
    conflicts: conflicts.length,
    critical: {
      bedtime: normalized.bedtime,
      wakeTime: normalized.wakeTime,
      skinTemperature: normalized.skinTemperature,
      stress: normalized.stress,
    },
  });

  return { metrics: normalized, conflicts, graphs, confidence };
}

function normalizeConfidenceMap(raw: unknown): MetricConfidenceMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: MetricConfidenceMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key as MetricFieldKey] = Math.min(1, Math.max(0, value));
    }
  }
  return out;
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
      age: payload.lifestyle.age,
      gender: payload.lifestyle.gender,
      heightCm: payload.lifestyle.heightCm,
      weightKg: payload.lifestyle.weightKg,
      medications: payload.lifestyle.medications,
      drinkingHabit: payload.lifestyle.drinkingHabit,
      exerciseHabit: payload.lifestyle.exerciseHabit,
      snoringNasal: payload.lifestyle.snoringNasal,
      medicalHistory: payload.lifestyle.medicalHistory,
    });

    // OCR→確認で確定した confirmedMetrics / graphs を単一の数値根拠として強制採用
    if (payload.metrics) {
      result.metrics = normalizeMetrics(payload.metrics);
    }
    if (payload.extractedMetrics) {
      result.extractedMetrics = normalizeMetrics(payload.extractedMetrics);
    } else if (extractionDraft?.extractedMetrics) {
      result.extractedMetrics = normalizeMetrics(
        extractionDraft.extractedMetrics,
      );
    }
    if (payload.graphs) {
      result.graphs = normalizeGraphBundle(payload.graphs);
    } else if (extractionDraft?.graphs) {
      result.graphs = normalizeGraphBundle(extractionDraft.graphs);
    } else {
      result.graphs = emptyGraphBundle();
    }

    result.ocrConfidence =
      payload.ocrConfidence ??
      extractionDraft?.ocrConfidence ??
      undefined;

    pendingRequest = null;
    clearExtractionDraft();
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
    storeImages(payload.images);
    storeGraphs(result.graphs);
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

export function loadAnalysisGraphs(): SoxaiGraphBundle {
  const raw = sessionStorage.getItem(GRAPHS_KEY);
  if (!raw) return emptyGraphBundle();
  try {
    return normalizeGraphBundle(JSON.parse(raw));
  } catch {
    return emptyGraphBundle();
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

/** 保存済み分析を結果画面で再表示できるよう sessionStorage に書き戻す */
export function hydrateAnalysisSession(
  result: AnalysisResult,
  options?: { images?: string[] },
): AnalysisResult {
  const normalized = normalizeAnalysisResult(result);
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(normalized));
  storeGraphs(normalizeGraphBundle(normalized.graphs));
  if (options?.images && options.images.length > 0) {
    storeImages(options.images);
  } else {
    sessionStorage.removeItem(IMAGES_KEY);
  }
  return normalized;
}
