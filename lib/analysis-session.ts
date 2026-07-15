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
};

const RESULT_KEY = "swij-analysis-result";

let pendingRequest: AnalysisRequest | null = null;
let inFlightAnalysis: Promise<AnalysisResult> | null = null;

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

    const result = data as AnalysisResult;
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
    return JSON.parse(raw) as AnalysisResult;
  } catch {
    return null;
  }
}
