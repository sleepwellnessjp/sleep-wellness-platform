import type {
  AiIntelligenceFeatureId,
  KnowledgeCategory,
  PredictionMetricKey,
} from "./types";

export const AI_INTELLIGENCE_FEATURE_IDS: readonly AiIntelligenceFeatureId[] = [
  "sleep_coach",
  "instructor_assistant",
  "swij_intelligence",
  "predictive_analysis",
  "research_ai",
  "knowledge_base",
] as const;

export const AI_INTELLIGENCE_FEATURE_LABELS: Record<
  AiIntelligenceFeatureId,
  string
> = {
  sleep_coach: "Sleep Coach",
  instructor_assistant: "Instructor Assistant",
  swij_intelligence: "SWIJ Intelligence",
  predictive_analysis: "Predictive Analysis",
  research_ai: "Research AI",
  knowledge_base: "Knowledge Base",
};

export const AI_INTELLIGENCE_FEATURE_DESCRIPTIONS: Record<
  AiIntelligenceFeatureId,
  string
> = {
  sleep_coach:
    "毎朝の睡眠状態・コンディション・おすすめ行動・メラトニンヨガ™・励ましを提供します。",
  instructor_assistant:
    "分析画面で改善点・悪化原因・質問候補・カウンセリング内容・Homeworkを提案します。",
  swij_intelligence:
    "全国平均・年代別比較・改善率/講師ランキング・イベント効果・季節変動を分析します。",
  predictive_analysis:
    "継続した場合の睡眠効率・ストレス等の改善予測を表示します。",
  research_ai: "匿名データから研究レポートを自動生成します。",
  knowledge_base:
    "Sleep Wellness Method・メラトニンヨガ™・睡眠科学・認定テキスト・論文を検索します。",
};

export const KNOWLEDGE_CATEGORIES: readonly KnowledgeCategory[] = [
  "sleep_wellness_method",
  "melatonin_yoga",
  "sleep_science",
  "certification_text",
  "research_paper",
] as const;

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  sleep_wellness_method: "Sleep Wellness Method",
  melatonin_yoga: "メラトニンヨガ™",
  sleep_science: "睡眠科学",
  certification_text: "認定テキスト",
  research_paper: "研究論文",
};

export const PREDICTION_METRIC_LABELS: Record<PredictionMetricKey, string> = {
  sleep_efficiency: "睡眠効率",
  stress: "ストレス",
  hrv: "HRV",
  deep_sleep: "深睡眠",
  wellness_score: "ウェルネススコア",
};

export const DEFAULT_PREDICTION_HORIZON_DAYS = 14;

export const AI_INTELLIGENCE_ROUTES = {
  admin: "/admin/ai",
  knowledge: "/knowledge",
  clientCoach: "/client/coach",
  api: {
    sleepCoach: "/api/ai-intelligence/sleep-coach",
    instructorAssistant: "/api/ai-intelligence/instructor-assistant",
    predictive: "/api/ai-intelligence/predictive",
    research: "/api/ai-intelligence/research",
    knowledge: "/api/ai-intelligence/knowledge",
    admin: "/api/admin/ai-intelligence",
  },
} as const;

export function isAiIntelligenceFeatureId(
  value: string,
): value is AiIntelligenceFeatureId {
  return (AI_INTELLIGENCE_FEATURE_IDS as readonly string[]).includes(value);
}

export function isKnowledgeCategory(value: string): value is KnowledgeCategory {
  return (KNOWLEDGE_CATEGORIES as readonly string[]).includes(value);
}
