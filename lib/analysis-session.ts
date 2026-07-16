type LifestyleData = {
  clientName: string;
  measurementDate: string;
  bedtime: string;
  wakeTime: string;
  exercise: string;
  yoga: string;
  bathing: string;
  alcohol: string;
  caffeine: string;
  stress: string;
  meals: string;
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

export type AnalysisResult = {
  summary: string;
  score: number;
  metrics: AnalysisMetrics;
  goodPoints: string[];
  improvements: string[];
  possibleFactors: string[];
  actions: string[];
  yoga: string;
  caution: string;
  disclaimer: string;
  clientName?: string;
  measurementDate?: string;
};

const RESULT_KEY = "swij-analysis-result";

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
    const result: AnalysisResult = {
      ...raw,
      metrics: normalizeMetrics(raw.metrics),
      clientName: payload.lifestyle.clientName,
      measurementDate: payload.lifestyle.measurementDate,
    };

    pendingRequest = null;
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
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
    return {
      ...parsed,
      metrics: normalizeMetrics(parsed.metrics),
    };
  } catch {
    return null;
  }
}
