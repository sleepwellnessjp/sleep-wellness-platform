/**
 * OpenAI API 利用テレメトリ（トークン・処理時間）。
 * 処理速度改善のための開発用ログ。料金・原価・利益集計は対象外。
 */

export type OpenAiModelId = "gpt-4o" | "gpt-4o-mini" | string;

export type OpenAiUsagePurpose = "ocr" | "analyze" | "other";

export type OpenAiUsageEntry = {
  id: string;
  at: string;
  purpose: OpenAiUsagePurpose;
  model: OpenAiModelId;
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
  durationMs?: number;
  imageCount?: number;
  cacheHits?: number;
  note?: string;
};

export type OpenAiUsageSummary = {
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
  durationMs?: number;
  entries: OpenAiUsageEntry[];
};

export type OpenAiUsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
};

const MAX_ENTRIES = 40;
let memoryLog: OpenAiUsageEntry[] = [];

export function tokensFromUsage(usage: OpenAiUsageLike | null | undefined): {
  inputTokens: number;
  outputTokens: number;
} {
  if (!usage || typeof usage !== "object") {
    return { inputTokens: 0, outputTokens: 0 };
  }
  const inputTokens =
    typeof usage.input_tokens === "number"
      ? usage.input_tokens
      : typeof usage.prompt_tokens === "number"
        ? usage.prompt_tokens
        : 0;
  const outputTokens =
    typeof usage.output_tokens === "number"
      ? usage.output_tokens
      : typeof usage.completion_tokens === "number"
        ? usage.completion_tokens
        : 0;
  return {
    inputTokens: Math.max(0, inputTokens),
    outputTokens: Math.max(0, outputTokens),
  };
}

export function recordOpenAiUsage(
  entry: Omit<OpenAiUsageEntry, "id" | "at">,
): OpenAiUsageEntry {
  const full: OpenAiUsageEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  };
  memoryLog = [...memoryLog, full].slice(-MAX_ENTRIES);
  console.info("[openai-usage]", {
    purpose: full.purpose,
    model: full.model,
    apiCalls: full.apiCalls,
    inputTokens: full.inputTokens,
    outputTokens: full.outputTokens,
    durationMs: full.durationMs,
    imageCount: full.imageCount,
    cacheHits: full.cacheHits,
    note: full.note,
  });
  return full;
}

export function summarizeOpenAiUsage(
  entries: OpenAiUsageEntry[] = memoryLog,
): OpenAiUsageSummary {
  return {
    apiCalls: entries.reduce((sum, e) => sum + e.apiCalls, 0),
    inputTokens: entries.reduce((sum, e) => sum + e.inputTokens, 0),
    outputTokens: entries.reduce((sum, e) => sum + e.outputTokens, 0),
    durationMs: entries.reduce((sum, e) => sum + (e.durationMs ?? 0), 0),
    entries,
  };
}
