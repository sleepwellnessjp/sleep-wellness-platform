type LifestyleData = {
  clientName: string;
  measurementDate: string;
  bedtime: string;
  wakeTime: string;
  exercise: string;
  yoga: string;
  bathing: string;
  alcohol: string;
  alcoholDrank: string;
  alcoholType: string;
  alcoholAmount: string;
  alcoholEndTime: string;
  alcoholNotes: string;
  caffeine: string;
  stress: string;
  meals: string;
  breakfastTime: string;
  breakfastContent: string;
  lunchTime: string;
  lunchContent: string;
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
  deepSleep: string;
  awakenings: string;
  heartRate: string;
  hrv: string;
  stress: string;
  spo2: string;
  skinTemperature: string;
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
  summary: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  metrics: AnalysisMetrics;
  goodPoints: string[];
  improvements: string[];
  possibleFactors: string[];
  actions: string[];
  yoga: string;
  /** 今回の総括（100〜150文字程度） */
  closingSummary: string;
  /** 次回確認したいポイント */
  nextCheckPoints: string[];
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

function normalizeMetrics(
  metrics: Partial<AnalysisMetrics> | undefined,
): AnalysisMetrics {
  return {
    sleepScore:
      typeof metrics?.sleepScore === "number" ? metrics.sleepScore : null,
    bedtime: typeof metrics?.bedtime === "string" ? metrics.bedtime : "",
    wakeTime: typeof metrics?.wakeTime === "string" ? metrics.wakeTime : "",
    sleepDuration:
      typeof metrics?.sleepDuration === "string" ? metrics.sleepDuration : "",
    sleepEfficiency:
      typeof metrics?.sleepEfficiency === "string"
        ? metrics.sleepEfficiency
        : "",
    deepSleep: typeof metrics?.deepSleep === "string" ? metrics.deepSleep : "",
    awakenings:
      typeof metrics?.awakenings === "string" ? metrics.awakenings : "",
    heartRate: typeof metrics?.heartRate === "string" ? metrics.heartRate : "",
    hrv: typeof metrics?.hrv === "string" ? metrics.hrv : "",
    stress: typeof metrics?.stress === "string" ? metrics.stress : "",
    spo2: typeof metrics?.spo2 === "string" ? metrics.spo2 : "",
    skinTemperature:
      typeof metrics?.skinTemperature === "string"
        ? metrics.skinTemperature
        : "",
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

function normalizeAnalysisResult(
  raw: AnalysisResult,
  extras?: { clientName?: string; measurementDate?: string },
): AnalysisResult {
  const score =
    typeof raw.score === "number" && Number.isFinite(raw.score)
      ? Math.max(0, Math.min(100, Math.round(raw.score)))
      : 0;

  return {
    ...raw,
    score,
    scoreBreakdown: normalizeScoreBreakdown(raw.scoreBreakdown, score),
    metrics: normalizeMetrics(raw.metrics),
    goodPoints: normalizeStringList(raw.goodPoints, 3),
    improvements: normalizeStringList(raw.improvements, 2),
    possibleFactors: normalizeStringList(raw.possibleFactors, 3),
    actions: normalizeStringList(raw.actions, 3),
    closingSummary:
      typeof raw.closingSummary === "string" ? raw.closingSummary.trim() : "",
    nextCheckPoints: normalizeStringList(raw.nextCheckPoints, 5),
    clientName: extras?.clientName ?? raw.clientName,
    measurementDate: extras?.measurementDate ?? raw.measurementDate,
  };
}

function storeImages(images: string[]) {
  const limited = images.slice(0, MAX_STORED_IMAGES);

  try {
    sessionStorage.setItem(IMAGES_KEY, JSON.stringify(limited));
  } catch {
    // Quota exceeded: drop images one by one until it fits.
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
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as
      | AnalysisResult
      | { error?: string };

    if (!response.ok) {
      throw new Error(
        typeof data === "object" &&
          data &&
          "error" in data &&
          typeof data.error === "string"
          ? data.error
          : "AI分析に失敗しました。",
      );
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

  inFlightAnalysis.catch(() => {
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
