type LifestyleData = {
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
};

export type AnalysisMetrics = {
  sleepScore: number | null;
  bedtime: string;
  wakeTime: string;
  sleepDuration: string;
  sleepEfficiency: string;
  awakenings: string;
  remSleep: string;
  lightSleep: string;
  deepSleep: string;
  sleepDebt: string;
  sleepLatency: string;
  circadianRhythm: string;
  respiratoryRate: string;
  spo2: string;
  heartRate: string;
  hrv: string;
  skinTemperature: string;
  stress: string;
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
  clientName?: string;
  measurementDate?: string;
};

const RESULT_KEY = "swij-analysis-result";
const IMAGES_KEY = "swij-analysis-images";
const MAX_STORED_IMAGES = 6;

let pendingRequest: AnalysisRequest | null = null;
let inFlightAnalysis: Promise<AnalysisResult> | null = null;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeMetrics(
  metrics: Partial<AnalysisMetrics> | undefined,
): AnalysisMetrics {
  return {
    sleepScore:
      typeof metrics?.sleepScore === "number" ? metrics.sleepScore : null,
    bedtime: asString(metrics?.bedtime),
    wakeTime: asString(metrics?.wakeTime),
    sleepDuration: asString(metrics?.sleepDuration),
    sleepEfficiency: asString(metrics?.sleepEfficiency),
    awakenings: asString(metrics?.awakenings),
    remSleep: asString(metrics?.remSleep),
    lightSleep: asString(metrics?.lightSleep),
    deepSleep: asString(metrics?.deepSleep),
    sleepDebt: asString(metrics?.sleepDebt),
    sleepLatency: asString(metrics?.sleepLatency),
    circadianRhythm: asString(metrics?.circadianRhythm),
    respiratoryRate: asString(metrics?.respiratoryRate),
    spo2: asString(metrics?.spo2),
    heartRate: asString(metrics?.heartRate),
    hrv: asString(metrics?.hrv),
    skinTemperature: asString(metrics?.skinTemperature),
    stress: asString(metrics?.stress),
  };
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
  extras?: { clientName?: string; measurementDate?: string },
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

export function setPendingAnalysisRequest(request: AnalysisRequest) {
  pendingRequest = request;
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
      clientName: payload.lifestyle.clientName,
      measurementDate: payload.lifestyle.measurementDate,
    });

    pendingRequest = null;
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
