import fs from "node:fs";
import { buildScoreFirstAnalysisResult } from "../lib/analysis-fast-path";
import type { AnalysisRequest } from "../lib/analysis-session";

const extract = JSON.parse(
  fs.readFileSync("/tmp/soxai-e2e-9.json.extract-response.json", "utf8"),
);

const lifestyle = {
  clientName: "E2E SOXAI 9",
  measurementDate: "2026-07-28",
  age: "42",
  gender: "male",
  bedtime: "",
  wakeTime: "",
  exercise: "",
  yoga: "",
  bathing: "",
  alcohol: "",
  alcoholDrank: "",
  alcoholType: "",
  alcoholAmount: "",
  alcoholEndTime: "",
  alcoholNotes: "",
  caffeine: "",
  stress: "",
  meals: "",
  breakfastTime: "",
  breakfastContent: "",
  lunchTime: "",
  lunchContent: "",
  dinnerTime: "",
  dinnerContent: "",
  work: "",
  condition: "",
  nasalCongestion: "",
  notes: "e2e-soxai-9",
};

const request = {
  lifestyle,
  images: [] as string[],
  inputSource: "soxai" as const,
  metrics: extract.metrics,
  extractedMetrics: extract.metrics,
  graphs: extract.graphs ?? {},
  ocrConfidence: extract.confidence ?? {},
};

const preliminary = buildScoreFirstAnalysisResult(request as AnalysisRequest);
const payload = {
  pending: {
    ...request,
    seedScore: preliminary.score,
    seedScoreBreakdown: preliminary.scoreBreakdown,
    seedCategoryScores: preliminary.categoryScores,
  },
  result: preliminary,
};

fs.writeFileSync("/tmp/soxai-e2e-session.json", JSON.stringify(payload));
fs.mkdirSync("public/e2e", { recursive: true });
fs.writeFileSync("public/e2e/session.json", JSON.stringify(payload));
console.log(
  JSON.stringify(
    {
      score: preliminary.score,
      clientName: preliminary.clientName,
      metricCount: Object.keys(preliminary.metrics || {}).length,
    },
    null,
    2,
  ),
);
