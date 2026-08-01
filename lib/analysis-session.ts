import {
  collectedMetricKeys,
  emptyMetrics,
  metricDisplayValue,
  normalizeMetrics,
  SOXAI_METRIC_FIELDS,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import {
  emptyGraphBundle,
  type SoxaiGraphBundle,
} from "@/lib/soxai-graphs";
import {
  mergeMetricsFromVisibleReadings,
  normalizeVisibleReadings,
} from "@/lib/soxai-reading-map";
import type { MetricConfidenceMap } from "@/lib/soxai-merge";
import {
  applyNonRemFromStageOcr,
  OCR_LOW_CONFIDENCE_THRESHOLD,
} from "@/lib/soxai-merge";
import { normalizeMetricsForDisplay } from "@/lib/soxai-display-normalize";
import {
  detectMetricConsistencyWarnings,
  consistencyWarningKeys,
} from "@/lib/soxai-consistency";
import type {
  AnalysisDayContext,
  ClientProfileSections,
} from "@/lib/client-profiles/types";
import type { AnalysisAiInput } from "@/lib/client-profiles/ai-input";
import type { SwsMetricEntry } from "@/lib/sws-standard";
import {
  improvementTexts,
  normalizeImprovements,
  type ImprovementItem,
} from "@/lib/improvement-priority";
import {
  runSoxaiOcr,
  type OcrProgressSnapshot,
  type SoxaiExtractSection as RunnerSoxaiExtractSection,
  type SoxaiOcrImageStatusRecord,
  type SoxaiOcrRunResult,
} from "@/lib/soxai-ocr-runner";
import {
  hashImageDataUrls,
  isSoxaiOcrDebugMode,
  setFingerprintFromHashes,
  getCachedOcrSet,
  setCachedOcrSet,
  clearSoxaiOcrCaches,
} from "@/lib/soxai-ocr-cache";
import { recordOpenAiUsage } from "@/lib/openai-usage";

export type { AnalysisMetrics };
export type { SoxaiGraphBundle };
export type { MetricConfidenceMap };
export type { ImprovementItem };
export { normalizeMetrics };
export {
  formatImprovementStars,
  improvementPriorityLabel,
  normalizeImprovements,
  improvementTexts,
} from "@/lib/improvement-priority";

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
  /** 旧データ互換。入力画面からは送らない（残っていても無視可） */
  nasalCongestion?: string;
  notes: string;
};

export type AnalysisRequest = {
  lifestyle: LifestyleData;
  images: string[];
  inputSource?: "soxai" | "manual";
  swsMetrics?: SwsMetricEntry[];
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
  /**
   * Score-first で先行確定したスコア。AI に渡して scoreComment を整合させる。
   * 確認済みメトリクスがある場合、画像は送らない。
   */
  seedScore?: number;
  seedScoreBreakdown?: ScoreBreakdown;
  seedCategoryScores?: WellnessCategoryScores;
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
  inputSource?: "soxai" | "manual";
  extractedMetrics: AnalysisMetrics;
  /** 画像から取得できたキー */
  imageKeys: MetricFieldKey[];
  /** 複数画像間で値が食い違った項目 */
  conflicts?: MetricConflict[];
  /** 項目別 OCR 信頼度 0–1 */
  ocrConfidence?: MetricConfidenceMap;
  /** OCRで抽出したグラフ（Visual / PDF 共通） */
  graphs: SoxaiGraphBundle;
  /** 画像単位の OCR 成否（成功 / 失敗 / タイムアウト / 中止） */
  ocrImageStatuses?: SoxaiOcrImageStatusRecord[];
  /** アップロード時の section 対応 */
  ocrSections?: SoxaiExtractSection[];
  /** 選択クライアントの固定プロフィール（あれば） */
  fixedProfile?: ClientProfileSections;
  /** 当日情報（将来用。今回は通常未設定） */
  dayContext?: AnalysisDayContext;
  /** Sleep Wellness Standard 形式（分析入力の共通契約） */
  swsMetrics?: SwsMetricEntry[];
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

/**
 * Sleep Wellness Platform 独自のカテゴリースコア（各 0〜100）。
 * SOXAI 睡眠スコアとは別指標。総合の睡眠ウェルネススコアを4軸で可視化する。
 */
export type WellnessCategoryScores = {
  /** 身体：睡眠ステージ・回復・SpO₂・運動・健康など */
  body: number;
  /** 心：HRV・ストレス・自律神経など */
  mind: number;
  /** 生活：飲酒・カフェイン・食事・勤務リズム・運動タイミングなど */
  lifestyle: number;
  /** 環境：寝室・室温湿度・寝具・職場環境など */
  environment: number;
};

export const WELLNESS_CATEGORY_LABELS = {
  body: "身体",
  mind: "心",
  lifestyle: "生活",
  environment: "環境",
} as const satisfies Record<keyof WellnessCategoryScores, string>;

export type WellnessCategoryKey = keyof WellnessCategoryScores;

/**
 * Sleep Wellness Score 4軸の根拠説明（各1〜2行）。
 * 認定講師が「なぜこの点数か」をそのまま説明できる品質。
 */
export type CategoryScoreRationales = {
  body: string;
  mind: string;
  lifestyle: string;
  environment: string;
};

/**
 * メラトニンヨガ™連携提案（SWIJ独自）。
 * 分析結果から推奨 Phase・呼吸法・入浴・朝の行動を提示する。
 */
export type MelatoninYogaPlan = {
  /** 推奨 Phase（例: Phase 1 入眠導入） */
  recommendedPhase: string;
  /** 推奨呼吸法 */
  breathing: string;
  /** 推奨入浴 */
  bathing: string;
  /** 朝の行動 */
  morningAction: string;
};

/**
 * AIから講師へのカウンセリング提案（構造化）。
 * クライアント向け行動指示ではない。認定講師がそのままカウンセリングに使える粒度。
 */
export type InstructorCounselingPlan = {
  /** ① 良好な点 */
  goodPoints: string[];
  /** ② 改善が必要な点 */
  needsImprovement: string[];
  /** ③ 考えられる要因 */
  possibleFactors: string[];
  /** ④ 質問候補 */
  questionCandidates: string[];
  /** @deprecated 旧フォーマット互換 */
  hearingTopics?: string[];
  /** @deprecated 旧フォーマット互換 */
  nextComparisonData?: string[];
  /** @deprecated 旧フォーマット互換 */
  lifestyleChecks?: string[];
  /** @deprecated 旧フォーマット互換 */
  improvementOutlook?: string[];
  /** @deprecated 旧フォーマット互換 */
  observationPoints?: string[];
};

/**
 * 分析履歴がある場合の AI 比較解説。
 */
export type ComparisonNarrative = {
  /** 前回分析との変化の解説 */
  vsPrevious?: string;
  /** 初回分析との変化の解説（2回目以降で初回と前回が異なる場合） */
  vsFirst?: string;
};

/** 睡眠へ影響している要因ランキング（推定・断定ではない） */
export type SleepFactorRankingItem = {
  /** 短い要因名（例: 飲酒、勤務時間、睡眠負債） */
  factor: string;
  /** 今回の睡眠への影響度の可能性（1〜5） */
  stars: ScoreStars;
};

/**
 * 改善効果予測（Wellness Score への予測インパクト）。
 * 絶対値ではなく予測レンジ。生活改善の参考であり医療診断ではない。
 */
export type ImprovementEffectPrediction = {
  /** 短い改善アクション（例: 飲酒量を減らす、鼻づまり改善） */
  action: string;
  /** 予測レンジ下限（点） */
  minPoints: number;
  /** 予測レンジ上限（点）。必ず minPoints より大きい */
  maxPoints: number;
};

/** ⑧AI宿題（次回までの行動目標）。チェック状態を次回比較に使う */
export type NextActionGoal = {
  id: string;
  text: string;
  checked: boolean;
};

/** AI宿題の達成率スナップショット（カルテ・次回比較用） */
export type HomeworkAchievement = {
  /** 達成件数 */
  checked: number;
  /** 目標件数（4〜6） */
  total: number;
  /** 0〜100（整数）。total が 0 のときは 0 */
  rate: number;
};

export type AnalysisContentStatus = "pending" | "ready" | "error";

export type AnalysisResult = {
  /**
   * Score-first 表示用。pending の間は AIカルテ・宿題・コメントを後から描画する。
   * 未設定は従来どおり ready 扱い。
   */
  contentStatus?: AnalysisContentStatus;
  /** ③総合評価（短段落・100〜200文字）。必ず良かった点から書き始める */
  summary: string;
  /**
   * Sleep Wellness Insight（旧称 AIカルテ）。
   * ■今回最も重要な課題 / ■判断の根拠 / ■今回もっとも改善効果が高い行動 の3見出し構成。
   * 睡眠データ・SOXAI・生活習慣を統合した総合考察。認定講師がそのまま説明できる品質。
   * 分析履歴に時系列保存する。summary（今回評価）とは別役割。
   */
  karteSummary: string;
  /** ①今回の睡眠で良かった点（2〜4件の短文）。必須・省略禁止 */
  goodPoints: string[];
  /** ②改善が期待できるポイント（重要度順・最大5件。whyNow で優先理由） */
  improvements: ImprovementItem[];
  /** ④プロフィールとの関連（短段落。普段の傾向と今回データのつながり） */
  profileRelation: string;
  /**
   * ⑤睡眠ウェルネススコアの解説（短段落）。
   * 数値そのものは score / categoryScores で保持。
   */
  scoreComment: string;
  /**
   * 身体・心・生活・環境それぞれの点数根拠（各1〜2行）。
   */
  categoryScoreRationales?: CategoryScoreRationales;
  /**
   * ⑥今日やる3つ（必ず3件・優先順位順）。
   * 睡眠データ／体内時計／ストレス／飲酒／運動／生活習慣から毎回異なる個人専用アクション。
   */
  todaysRecommendations: string[];
  /** ⑦次回比較ポイント（2〜4件。次回分析で見るべき観点） */
  nextComparisonPoints: string[];
  /**
   * ⑧AI宿題（次回までの行動目標・4〜6件。優先順位付き・今日／今週／継続）。
   * 分析結果に応じて完全自動生成。固定リスト禁止。
   */
  recommendationsUntilNext: NextActionGoal[];
  /**
   * ⑨AIから講師への提案（フラット配列・互換用）。
   * instructorCounseling があればそこから正規化時に生成する。
   */
  instructorSuggestions: string[];
  /**
   * ⑨AIから講師への提案（構造化）。
   * 良好な点 / 改善が必要な点 / 考えられる要因 / 質問候補。
   */
  instructorCounseling?: InstructorCounselingPlan;
  /**
   * メラトニンヨガ™連携提案（推奨 Phase・呼吸法・入浴・朝の行動）。
   */
  melatoninYogaPlan?: MelatoninYogaPlan;
  /**
   * 前回・初回との比較解説（分析履歴がある場合）。
   */
  comparisonNarrative?: ComparisonNarrative;
  /**
   * AI宿題の達成率。goals のチェックから算出して保存する。
   * 未設定時は normalize 時に goals から再計算する。
   */
  homeworkAchievement?: HomeworkAchievement;
  /** Sleep Wellness Platform 独自の総合スコア（0〜100）。SOXAI睡眠スコアとは別 */
  score: number;
  scoreBreakdown: ScoreBreakdown;
  /** 身体 / 心 / 生活 / 環境（各 0〜100）。レーダーチャート用 */
  categoryScores: WellnessCategoryScores;
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
  /** @deprecated 旧スキーマ互換 → 本文には使わない */
  sleepAnalysis?: string;
  /** @deprecated 旧スキーマ互換 */
  autonomicAssessment?: string;
  /** @deprecated 旧スキーマ互換 */
  recoveryAssessment?: string;
  /** @deprecated 旧スキーマ互換 */
  evidenceTitle?: string;
  /** @deprecated 旧スキーマ互換 */
  evidence?: string[];
  /** @deprecated 旧スキーマ互換 */
  sleepFactorRanking?: SleepFactorRankingItem[];
  /** @deprecated 旧スキーマ互換 */
  improvementEffectPredictions?: ImprovementEffectPrediction[];
  /** @deprecated 旧スキーマ互換 */
  melatoninYoga?: string;
  /** @deprecated 旧スキーマ互換 → sleepAnalysis */
  sleepCharacteristics?: string;
  /** @deprecated 旧スキーマ互換 */
  actionPlan?: string[];
  /** @deprecated 旧スキーマ互換 → sleepAnalysis */
  dataInsight?: string;
  /** @deprecated 旧スキーマ互換 → profileRelation */
  lifestyleRelation?: string;
  /** @deprecated 旧スキーマ互換 → nextComparisonPoints */
  tomorrowPlan?: string[];
};

const RESULT_KEY = "swij-analysis-result";
const IMAGES_KEY = "swij-analysis-images";
const GRAPHS_KEY = "swij-analysis-graphs";
const EXTRACTION_DRAFT_KEY = "swij-extraction-draft-v1";
const PENDING_REQUEST_KEY = "swij-pending-analysis-request-v1";
const MAX_STORED_IMAGES = 10;

export type ExtractSoxaiResult = {
  metrics: AnalysisMetrics;
  conflicts: MetricConflict[];
  graphs: SoxaiGraphBundle;
  confidence: MetricConfidenceMap;
};

export type SoxaiMetricSource = {
  section: string;
  imageIndex: number;
};

export type OcrVerifyRow = {
  key: MetricFieldKey;
  label: string;
  value: string;
  section: string;
  success: boolean;
  missing: boolean;
  abnormal: boolean;
  missingReason:
    | "OCR未検出"
    | "section違い"
    | "マッピング漏れ"
    | "正規化漏れ"
    | "マージ漏れ"
    | "";
};

export type OcrVerifyResult = {
  rows: OcrVerifyRow[];
  metrics: AnalysisMetrics;
  imageCount: number;
  visibleCount: number;
  acquiredCount: number;
};

export type BackgroundOcrStatus = "idle" | "running" | "ready" | "error" | "cancelled";
export type SoxaiExtractSection = RunnerSoxaiExtractSection;
export type { SoxaiOcrImageStatusRecord, OcrProgressSnapshot };

/** 画像アップロード直後に先行実行する OCR ジョブ（入力中の待ち時間短縮用） */
type BackgroundOcrJob = {
  fingerprint: string;
  promise: Promise<SoxaiOcrRunResult>;
  status: "running" | "ready" | "error" | "cancelled";
  error?: unknown;
  abortController: AbortController;
  progress: OcrProgressSnapshot | null;
  /** 画面遷移後に完了しても自動遷移しないための世代 */
  generation: number;
  listeners: Set<(progress: OcrProgressSnapshot) => void>;
};

let pendingRequest: AnalysisRequest | null = null;
let extractionDraft: ExtractionDraft | null = null;
let inFlightAnalysis: Promise<AnalysisResult> | null = null;
let backgroundOcrJob: BackgroundOcrJob | null = null;
let backgroundOcrGeneration = 0;

/** 同一画像セットの OCR 結果キャッシュ（再解析防止）— SHA-256 セットキャッシュへ委譲 */
const ocrResultCache = new Map<string, SoxaiOcrRunResult>();
const OCR_CACHE_STORAGE_KEY = "swij-soxai-ocr-cache-v5";
const OCR_CACHE_MAX_ENTRIES = 8;
/** キャッシュ採用の最低取得数（25項目中95%以上） */
const MIN_CACHED_METRIC_COUNT = 24;

type AnalysisSessionListener = (result: AnalysisResult) => void;
const analysisSessionListeners = new Set<AnalysisSessionListener>();

export function subscribeAnalysisSession(
  listener: AnalysisSessionListener,
): () => void {
  analysisSessionListeners.add(listener);
  return () => {
    analysisSessionListeners.delete(listener);
  };
}

function notifyAnalysisSessionListeners(result: AnalysisResult) {
  for (const listener of analysisSessionListeners) {
    try {
      listener(result);
    } catch (error) {
      console.error("Analysis session listener failed:", error);
    }
  }
}

function readOcrCacheFromStorage(fingerprint: string): SoxaiOcrRunResult | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(OCR_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<
      string,
      {
        metrics?: unknown;
        conflicts?: unknown;
        graphs?: unknown;
        confidence?: unknown;
        imageStatuses?: unknown;
      }
    >;
    const entry = parsed[fingerprint];
    if (!entry || typeof entry !== "object") return null;
    return {
      metrics: normalizeMetrics(entry.metrics as AnalysisMetrics),
      conflicts: normalizeExtractConflicts(entry.conflicts),
      graphs: normalizeGraphBundle(entry.graphs),
      confidence: normalizeConfidenceMap(entry.confidence),
      imageStatuses: normalizeImageStatuses(entry.imageStatuses),
      cancelled: false,
      elapsedMs: 0,
    };
  } catch {
    return null;
  }
}

function writeOcrCacheToStorage(
  fingerprint: string,
  result: SoxaiOcrRunResult | ExtractSoxaiResult,
) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(OCR_CACHE_STORAGE_KEY);
    const parsed =
      raw && raw.trim()
        ? (JSON.parse(raw) as Record<string, unknown>)
        : {};
    parsed[fingerprint] = {
      metrics: result.metrics,
      conflicts: result.conflicts,
      graphs: result.graphs,
      confidence: result.confidence,
      imageStatuses: "imageStatuses" in result ? result.imageStatuses : undefined,
    };
    const keys = Object.keys(parsed);
    if (keys.length > OCR_CACHE_MAX_ENTRIES) {
      for (const key of keys.slice(0, keys.length - OCR_CACHE_MAX_ENTRIES)) {
        delete parsed[key];
      }
    }
    sessionStorage.setItem(OCR_CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // quota / private mode — メモリキャッシュのみで継続
  }
}

function isAcceptableCachedExtraction(
  result: SoxaiOcrRunResult,
  imageCount: number,
): boolean {
  if (result.cancelled) return false;
  const metricCount = collectedMetricKeys(result.metrics).length;
  if (metricCount < MIN_CACHED_METRIC_COUNT) return false;
  if (
    result.imageStatuses.length > 0 &&
    result.imageStatuses.length !== imageCount
  ) {
    return false;
  }
  if (
    result.imageStatuses.length > 0 &&
    result.imageStatuses.some((status) => status.status !== "success")
  ) {
    return false;
  }
  return true;
}

export async function getCachedSoxaiExtraction(
  images: string[],
): Promise<SoxaiOcrRunResult | null> {
  if (!Array.isArray(images) || images.length === 0) return null;
  const fingerprint = await soxaiImagesFingerprint(images);
  const memory = ocrResultCache.get(fingerprint);
  if (memory) {
    return isAcceptableCachedExtraction(memory, images.length) ? memory : null;
  }
  const fromSet = getCachedOcrSet(fingerprint);
  if (fromSet) {
    const result: SoxaiOcrRunResult = {
      metrics: fromSet.metrics,
      conflicts: fromSet.conflicts,
      graphs: fromSet.graphs,
      confidence: fromSet.confidence,
      imageStatuses: fromSet.imageStatuses.map((status) => ({
        index: status.index,
        section: (status.section || "") as SoxaiExtractSection | "",
        label: status.label,
        status: status.status,
        error: status.error,
        durationMs: status.durationMs,
      })),
      cancelled: false,
      elapsedMs: 0,
      fromCache: true,
      imageHashes: fromSet.imageHashes,
    };
    if (!isAcceptableCachedExtraction(result, images.length)) return null;
    ocrResultCache.set(fingerprint, result);
    return result;
  }
  const stored = readOcrCacheFromStorage(fingerprint);
  if (stored) {
    if (!isAcceptableCachedExtraction(stored, images.length)) return null;
    ocrResultCache.set(fingerprint, stored);
    return stored;
  }
  return null;
}

async function rememberSoxaiExtraction(
  fingerprint: string,
  result: SoxaiOcrRunResult,
  imageHashes?: string[],
) {
  // 中止結果はキャッシュしない（再開できるように）
  if (result.cancelled) return;
  ocrResultCache.set(fingerprint, result);
  writeOcrCacheToStorage(fingerprint, result);
  if (imageHashes && imageHashes.length > 0) {
    setCachedOcrSet({
      fingerprint,
      imageHashes,
      metrics: result.metrics,
      conflicts: result.conflicts,
      graphs: result.graphs,
      confidence: result.confidence,
      imageStatuses: result.imageStatuses,
      cachedAt: Date.now(),
    });
  }
}

function normalizeImageStatuses(raw: unknown): SoxaiOcrImageStatusRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): SoxaiOcrImageStatusRecord | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const index =
        typeof record.index === "number" && Number.isFinite(record.index)
          ? Math.floor(record.index)
          : -1;
      if (index < 0) return null;
      const status = record.status;
      if (
        status !== "success" &&
        status !== "failed" &&
        status !== "timeout" &&
        status !== "cancelled"
      ) {
        return null;
      }
      return {
        index,
        section:
          typeof record.section === "string"
            ? (record.section as SoxaiExtractSection | "")
            : "",
        label: typeof record.label === "string" ? record.label : `画像${index + 1}`,
        status,
        error: typeof record.error === "string" ? record.error : undefined,
        durationMs:
          typeof record.durationMs === "number" && Number.isFinite(record.durationMs)
            ? record.durationMs
            : undefined,
      };
    })
    .filter((item): item is SoxaiOcrImageStatusRecord => item !== null);
}

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

function clampScore100(value: unknown, fallback: number): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : fallback;
  return Math.max(0, Math.min(100, n));
}

function starsToScore100(stars: ScoreStars): number {
  return Math.round((stars / 5) * 100);
}

function averageScore100(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

/**
 * カテゴリースコアを正規化。未提供時は scoreBreakdown / 総合スコアから補完
 *（旧保存結果・デモデータ互換）。
 */
export function normalizeCategoryScores(
  raw: Partial<WellnessCategoryScores> | undefined,
  score: number,
  breakdown: ScoreBreakdown,
): WellnessCategoryScores {
  const fallbackBody = averageScore100([
    starsToScore100(breakdown.sleepDuration),
    starsToScore100(breakdown.sleepEfficiency),
    starsToScore100(breakdown.deepSleep),
    starsToScore100(breakdown.spo2),
    starsToScore100(breakdown.recovery),
  ]);
  const fallbackMind = averageScore100([
    starsToScore100(breakdown.hrv),
    starsToScore100(breakdown.stress),
    starsToScore100(breakdown.recovery),
  ]);

  return {
    body: clampScore100(raw?.body, fallbackBody || score),
    mind: clampScore100(raw?.mind, fallbackMind || score),
    lifestyle: clampScore100(raw?.lifestyle, score),
    environment: clampScore100(raw?.environment, score),
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

const RANKING_CIRCLED = ["①", "②", "③", "④", "⑤"] as const;

/** ★★★★☆ 形式（1〜5すべて表示） */
export function formatSleepFactorStars(stars: ScoreStars): string {
  const filled = Math.max(1, Math.min(5, Math.round(stars))) as ScoreStars;
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export function formatSleepFactorRankingLine(
  item: SleepFactorRankingItem,
  index: number,
): string {
  const mark = RANKING_CIRCLED[index] ?? `${index + 1}.`;
  return `${mark}${item.factor} ${formatSleepFactorStars(item.stars)}`;
}

export function normalizeSleepFactorRanking(
  raw: unknown,
): SleepFactorRankingItem[] {
  if (!Array.isArray(raw)) return [];
  const items: SleepFactorRankingItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as { factor?: unknown; stars?: unknown };
    const factor = asString(record.factor).trim().slice(0, 40);
    if (!factor) continue;
    items.push({
      factor,
      stars: clampStars(record.stars, 3),
    });
    if (items.length >= 5) break;
  }
  return items;
}

function clampPointDelta(value: unknown, fallback: number): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : fallback;
  return Math.max(1, Math.min(30, n));
}

/** 「＋4〜8点」形式 */
export function formatImprovementEffectRange(
  item: ImprovementEffectPrediction,
): string {
  return `＋${item.minPoints}〜${item.maxPoints}点`;
}

export function normalizeImprovementEffectPredictions(
  raw: unknown,
): ImprovementEffectPrediction[] {
  if (!Array.isArray(raw)) return [];
  const items: ImprovementEffectPrediction[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as {
      action?: unknown;
      minPoints?: unknown;
      maxPoints?: unknown;
    };
    const action = asString(record.action).trim().slice(0, 40);
    if (!action) continue;
    const minPoints = clampPointDelta(record.minPoints, 2);
    let maxPoints = clampPointDelta(record.maxPoints, minPoints + 2);
    if (maxPoints <= minPoints) {
      maxPoints = Math.min(30, minPoints + 2);
    }
    items.push({ action, minPoints, maxPoints });
    if (items.length >= 5) break;
  }
  return items;
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
  goodPoints?: unknown;
  profileRelation?: unknown;
  lifestyleRelation?: unknown;
  scoreComment?: unknown;
  nextComparisonPoints?: unknown;
  tomorrowPlan?: unknown;
  evidence?: unknown;
  evidenceTitle?: unknown;
  sleepFactorRanking?: unknown;
  improvementEffectPredictions?: unknown;
  todaysRecommendations?: unknown;
  recommendationsUntilNext?: unknown;
  instructorSuggestions?: unknown;
  instructorCounseling?: unknown;
  categoryScoreRationales?: unknown;
  melatoninYogaPlan?: unknown;
  comparisonNarrative?: unknown;
  improvements?: unknown;
  karteSummary?: unknown;
  homeworkAchievement?: unknown;
  /** 旧フィールド互換 */
  achievementRate?: unknown;
};

function normalizeCategoryScoreRationales(
  raw: unknown,
): CategoryScoreRationales | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const pick = (key: keyof CategoryScoreRationales): string => {
    const value = record[key];
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.length > 200
      ? `${trimmed.slice(0, 199).trimEnd()}…`
      : trimmed;
  };
  const body = pick("body");
  const mind = pick("mind");
  const lifestyle = pick("lifestyle");
  const environment = pick("environment");
  if (!body && !mind && !lifestyle && !environment) return undefined;
  return { body, mind, lifestyle, environment };
}

function normalizeMelatoninYogaPlan(
  raw: unknown,
): MelatoninYogaPlan | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const pick = (key: keyof MelatoninYogaPlan): string => {
    const value = record[key];
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.length > 80
      ? `${trimmed.slice(0, 79).trimEnd()}…`
      : trimmed;
  };
  const recommendedPhase = pick("recommendedPhase");
  const breathing = pick("breathing");
  const bathing = pick("bathing");
  const morningAction = pick("morningAction");
  if (!recommendedPhase && !breathing && !bathing && !morningAction) {
    return undefined;
  }
  return { recommendedPhase, breathing, bathing, morningAction };
}

function normalizeComparisonNarrative(
  raw: unknown,
): ComparisonNarrative | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const vsPrevious =
    typeof record.vsPrevious === "string" ? record.vsPrevious.trim() : "";
  const vsFirst =
    typeof record.vsFirst === "string" ? record.vsFirst.trim() : "";
  if (!vsPrevious && !vsFirst) return undefined;
  const clamp = (text: string) =>
    text.length > 280 ? `${text.slice(0, 279).trimEnd()}…` : text;
  return {
    ...(vsPrevious ? { vsPrevious: clamp(vsPrevious) } : {}),
    ...(vsFirst ? { vsFirst: clamp(vsFirst) } : {}),
  };
}

function normalizeInstructorCounseling(
  raw: unknown,
): InstructorCounselingPlan | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;

  const goodPoints = normalizeStringList(record.goodPoints, 5);
  let needsImprovement = normalizeStringList(record.needsImprovement, 5);
  let possibleFactors = normalizeStringList(record.possibleFactors, 4);
  let questionCandidates = normalizeStringList(record.questionCandidates, 4);

  // 旧フォーマット互換
  const hearingTopics = normalizeStringList(record.hearingTopics, 3);
  const nextComparisonData = normalizeStringList(record.nextComparisonData, 3);
  let lifestyleChecks = normalizeStringList(record.lifestyleChecks, 3);
  let improvementOutlook = normalizeStringList(record.improvementOutlook, 3);
  const observationPoints = normalizeStringList(record.observationPoints, 3);
  const legacyPriority = normalizeStringList(record.priorityChecks, 3);
  if (lifestyleChecks.length === 0 && legacyPriority.length > 0) {
    lifestyleChecks = legacyPriority;
  }
  if (improvementOutlook.length === 0) {
    improvementOutlook = normalizeStringList(
      record.expectedImprovements ?? record.promisingImprovements,
      3,
    );
  }

  const hasNew =
    goodPoints.length > 0 ||
    needsImprovement.length > 0 ||
    possibleFactors.length > 0 ||
    questionCandidates.length > 0;
  const hasLegacy =
    hearingTopics.length > 0 ||
    nextComparisonData.length > 0 ||
    lifestyleChecks.length > 0 ||
    improvementOutlook.length > 0 ||
    observationPoints.length > 0;

  if (!hasNew && hasLegacy) {
    // 旧データの見出しを可能な範囲で新4区分へ寄せる（断定表現は付けない）
    if (questionCandidates.length === 0) {
      questionCandidates = hearingTopics;
    }
    if (needsImprovement.length === 0) {
      needsImprovement = improvementOutlook;
    }
    if (possibleFactors.length === 0) {
      possibleFactors = [...lifestyleChecks, ...observationPoints].slice(0, 4);
    }
  }

  if (
    goodPoints.length === 0 &&
    needsImprovement.length === 0 &&
    possibleFactors.length === 0 &&
    questionCandidates.length === 0
  ) {
    return undefined;
  }
  return {
    goodPoints,
    needsImprovement,
    possibleFactors,
    questionCandidates,
  };
}

/** 構造化カウンセリング提案をフラット配列へ（旧UI・保存互換） */
export function flattenInstructorCounseling(
  plan: InstructorCounselingPlan | undefined,
): string[] {
  if (!plan) return [];
  return [
    ...plan.goodPoints.map((item) => `良好な点：${item}`),
    ...plan.needsImprovement.map((item) => `改善が必要な点：${item}`),
    ...plan.possibleFactors.map((item) => `考えられる要因：${item}`),
    ...plan.questionCandidates.map((item) => `質問候補：${item}`),
  ].slice(0, 16);
}

/**
 * 主案の空カテゴリをフォールバックで補完する。
 */
export function mergeInstructorCounseling(
  primary: InstructorCounselingPlan | undefined,
  fallback: InstructorCounselingPlan | undefined,
): InstructorCounselingPlan | undefined {
  if (!primary && !fallback) return undefined;
  const pick = (a: string[] | undefined, b: string[] | undefined) =>
    (a && a.length > 0 ? a : (b ?? [])).slice(0, 5);
  const merged: InstructorCounselingPlan = {
    goodPoints: pick(primary?.goodPoints, fallback?.goodPoints),
    needsImprovement: pick(
      primary?.needsImprovement,
      fallback?.needsImprovement,
    ),
    possibleFactors: pick(
      primary?.possibleFactors,
      fallback?.possibleFactors,
    ).slice(0, 4),
    questionCandidates: pick(
      primary?.questionCandidates,
      fallback?.questionCandidates,
    ).slice(0, 4),
  };
  if (
    merged.goodPoints.length === 0 &&
    merged.needsImprovement.length === 0 &&
    merged.possibleFactors.length === 0 &&
    merged.questionCandidates.length === 0
  ) {
    return undefined;
  }
  return merged;
}

/**
 * フラットな講師提案から構造化へ復元（プレフィックス付き文字列向け）。
 */
export function parseInstructorSuggestionsToCounseling(
  items: string[],
): InstructorCounselingPlan | undefined {
  if (items.length === 0) return undefined;
  const goodPoints: string[] = [];
  const needsImprovement: string[] = [];
  const possibleFactors: string[] = [];
  const questionCandidates: string[] = [];
  const uncategorized: string[] = [];

  for (const raw of items) {
    const item = raw.trim();
    if (!item) continue;
    if (/^(良好な点|良かった点)[：:]/.test(item)) {
      goodPoints.push(item.replace(/^(良好な点|良かった点)[：:]\s*/, ""));
    } else if (/^(改善が必要な点|改善点|整えたい点)[：:]/.test(item)) {
      needsImprovement.push(
        item.replace(/^(改善が必要な点|改善点|整えたい点)[：:]\s*/, ""),
      );
    } else if (/^(考えられる要因|悪化原因|要因)[：:]/.test(item)) {
      possibleFactors.push(
        item.replace(/^(考えられる要因|悪化原因|要因)[：:]\s*/, ""),
      );
    } else if (/^(質問候補|ヒアリング|追加ヒアリング|重点ヒアリング)[：:]/.test(item)) {
      questionCandidates.push(
        item.replace(
          /^(質問候補|ヒアリング|追加ヒアリング|重点ヒアリング)[：:]\s*/,
          "",
        ),
      );
    } else if (/^(次回比較|比較)[：:]/.test(item)) {
      // 旧プレフィックス — 質問候補へ寄せない（比較観点は別役割）
      uncategorized.push(item.replace(/^(次回比較|比較)[：:]\s*/, ""));
    } else if (/^(生活習慣|生活確認)[：:]/.test(item)) {
      possibleFactors.push(item.replace(/^(生活習慣|生活確認)[：:]\s*/, ""));
    } else if (/^(改善見込み|改善|改善ポイント)[：:]/.test(item)) {
      needsImprovement.push(
        item.replace(/^(改善見込み|改善|改善ポイント)[：:]\s*/, ""),
      );
    } else if (/^(観察|注意観察|観察ポイント)[：:]/.test(item)) {
      possibleFactors.push(
        item.replace(/^(観察|注意観察|観察ポイント)[：:]\s*/, ""),
      );
    } else if (/^(確認|優先確認)[：:]/.test(item)) {
      possibleFactors.push(item.replace(/^(確認|優先確認)[：:]\s*/, ""));
    } else {
      uncategorized.push(item);
    }
  }

  for (const item of uncategorized) {
    if (questionCandidates.length < 4) questionCandidates.push(item);
    else if (needsImprovement.length < 5) needsImprovement.push(item);
    else if (possibleFactors.length < 4) possibleFactors.push(item);
    else if (goodPoints.length < 5) goodPoints.push(item);
  }

  if (
    goodPoints.length === 0 &&
    needsImprovement.length === 0 &&
    possibleFactors.length === 0 &&
    questionCandidates.length === 0
  ) {
    return undefined;
  }
  return {
    goodPoints: goodPoints.slice(0, 5),
    needsImprovement: needsImprovement.slice(0, 5),
    possibleFactors: possibleFactors.slice(0, 4),
    questionCandidates: questionCandidates.slice(0, 4),
  };
}

function createNextActionGoalId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `goal-${hash.toString(36)}`;
}

function trimActionGoalText(text: string): string {
  const cleaned = text
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d]+[\.．、:：\s]*/, "")
    .trim();
  if (cleaned.length <= 60) return cleaned;
  return `${cleaned.slice(0, 59).trimEnd()}…`;
}

/** 次回までのおすすめ（4〜6件）を正規化。string[] / オブジェクト両対応 */
export function normalizeRecommendationsUntilNext(
  raw: unknown,
): NextActionGoal[] {
  if (!Array.isArray(raw)) return [];
  const items: NextActionGoal[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const text = trimActionGoalText(entry);
      if (!text) continue;
      items.push({
        id: createNextActionGoalId(`${items.length}:${text}`),
        text,
        checked: false,
      });
    } else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const record = entry as {
        id?: unknown;
        text?: unknown;
        checked?: unknown;
      };
      const text = trimActionGoalText(asString(record.text));
      if (!text) continue;
      const id =
        typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : createNextActionGoalId(`${items.length}:${text}`);
      items.push({
        id,
        text,
        checked: record.checked === true,
      });
    }
    if (items.length >= 6) break;
  }
  return items;
}

/** AI宿題の達成率を goals から算出 */
export function computeHomeworkAchievement(
  goals: NextActionGoal[] | unknown,
): HomeworkAchievement {
  const list = normalizeRecommendationsUntilNext(goals);
  const total = list.length;
  const checked = list.filter((item) => item.checked).length;
  const rate =
    total > 0 ? Math.round((checked / total) * 100) : 0;
  return { checked, total, rate };
}

function normalizeHomeworkAchievement(
  raw: unknown,
  goals: NextActionGoal[],
): HomeworkAchievement {
  const fromGoals = computeHomeworkAchievement(goals);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    // 旧フィールド: achievementRate が number のみの場合
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return {
        ...fromGoals,
        rate: Math.max(0, Math.min(100, Math.round(raw))),
      };
    }
    return fromGoals;
  }
  const record = raw as {
    checked?: unknown;
    total?: unknown;
    rate?: unknown;
  };
  const total =
    typeof record.total === "number" && Number.isFinite(record.total)
      ? Math.max(0, Math.round(record.total))
      : fromGoals.total;
  const checked =
    typeof record.checked === "number" && Number.isFinite(record.checked)
      ? Math.max(0, Math.min(total, Math.round(record.checked)))
      : fromGoals.checked;
  const rate =
    typeof record.rate === "number" && Number.isFinite(record.rate)
      ? Math.max(0, Math.min(100, Math.round(record.rate)))
      : total > 0
        ? Math.round((checked / total) * 100)
        : 0;
  // goals があるときは常に最新チェックから再計算（保存ズレ防止）
  if (goals.length > 0) return fromGoals;
  return { checked, total, rate };
}

/** 総合評価を 100〜200 文字に整える（短すぎる場合はそのまま） */
function normalizeSummaryLength(text: string, max = 200): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  // 文末付近で切る
  const slice = trimmed.slice(0, max);
  const lastPunct = Math.max(
    slice.lastIndexOf("。"),
    slice.lastIndexOf("！"),
    slice.lastIndexOf("？"),
    slice.lastIndexOf("."),
  );
  if (lastPunct >= Math.min(100, Math.floor(max * 0.5))) {
    return slice.slice(0, lastPunct + 1);
  }
  return `${slice.trimEnd()}…`;
}

export function normalizeAnalysisResult(
  raw: Omit<
    AnalysisResult,
    "categoryScores" | "goodPoints" | "instructorSuggestions"
  > & {
    categoryScores?: Partial<WellnessCategoryScores>;
    goodPoints?: string[];
    instructorSuggestions?: string[];
  } & LegacyAnalysisFields,
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
    return "";
  })();

  const improvements = (() => {
    const list = normalizeImprovements(raw.improvements, 5);
    if (list.length >= 1) return list;
    if (actionPlan.length > 0) {
      return normalizeImprovements(actionPlan, 5);
    }
    return [];
  })();
  const improvementTextList = improvementTexts(improvements);

  const goodPoints = (() => {
    const list = normalizeStringList(raw.goodPoints, 4);
    if (list.length > 0) return list;
    // 旧結果互換: evidence / sleepAnalysis から補完しにくいため空でも可
    return [];
  })();

  const profileRelation = (() => {
    if (typeof raw.profileRelation === "string" && raw.profileRelation.trim()) {
      return raw.profileRelation.trim();
    }
    if (
      typeof raw.lifestyleRelation === "string" &&
      raw.lifestyleRelation.trim()
    ) {
      return raw.lifestyleRelation.trim();
    }
    const factors = normalizeStringList(raw.possibleFactors, 3).join(" ");
    return factors;
  })();

  const scoreComment = (() => {
    if (typeof raw.scoreComment === "string" && raw.scoreComment.trim()) {
      return raw.scoreComment.trim();
    }
    return "";
  })();

  const nextComparisonPoints = (() => {
    const list = normalizeStringList(raw.nextComparisonPoints, 4);
    if (list.length > 0) return list;
    const fromTomorrow = normalizeStringList(raw.tomorrowPlan, 4);
    if (fromTomorrow.length > 0) return fromTomorrow;
    return improvementTextList.slice(0, 3);
  })();

  const evidence = normalizeStringList(raw.evidence, 6);
  const evidenceTitle = (() => {
    const title = asString(raw.evidenceTitle).trim();
    if (title) return title;
    if (evidence.length > 0) return "今回の睡眠に影響した可能性がある要因";
    return "";
  })();

  const sleepFactorRanking = (() => {
    const normalized = normalizeSleepFactorRanking(raw.sleepFactorRanking);
    if (normalized.length > 0) return normalized;
    return evidence.slice(0, 5).map((factor, index) => ({
      factor: factor.replace(/^(優先\d+[:：]\s*)/, "").slice(0, 40),
      stars: clampStars(5 - index, 3),
    }));
  })();

  const improvementEffectPredictions = normalizeImprovementEffectPredictions(
    raw.improvementEffectPredictions,
  );

  const todaysRecommendations = (() => {
    const list = normalizeStringList(raw.todaysRecommendations, 3)
      .map((item) =>
        item
          .replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d]+[\.．、:：\s]*/, "")
          .trim(),
      )
      .map((item) =>
        item.length > 56 ? `${item.slice(0, 55).trimEnd()}…` : item,
      )
      .filter(Boolean);
    if (list.length >= 3) return list.slice(0, 3);
    const fromImprovements = improvementTextList
      .map((item) =>
        item.length > 56 ? `${item.slice(0, 55).trimEnd()}…` : item,
      )
      .filter(Boolean);
    return [...list, ...fromImprovements].slice(0, 3);
  })();

  const recommendationsUntilNext = (() => {
    const list = normalizeRecommendationsUntilNext(
      raw.recommendationsUntilNext,
    );
    if (list.length >= 4) return list.slice(0, 6);
    // 旧結果互換: 3件でも保持（今日やる3つとは役割が異なるため補完しない）
    return list.slice(0, 6);
  })();

  const instructorCounseling = (() => {
    const structured = normalizeInstructorCounseling(
      (raw as LegacyAnalysisFields).instructorCounseling,
    );
    const flat = normalizeStringList(raw.instructorSuggestions, 9)
      .map((item) =>
        item
          .replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d]+[\.．、:：\s]*/, "")
          .trim(),
      )
      .filter(Boolean);
    const fromFlat = parseInstructorSuggestionsToCounseling(flat);
    return mergeInstructorCounseling(structured, fromFlat);
  })();

  const instructorSuggestions = (() => {
    const fromPlan = flattenInstructorCounseling(instructorCounseling);
    if (fromPlan.length > 0) return fromPlan.slice(0, 9);
    return normalizeStringList(raw.instructorSuggestions, 5)
      .map((item) =>
        item
          .replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d]+[\.．、:：\s]*/, "")
          .trim(),
      )
      .map((item) =>
        item.length > 56 ? `${item.slice(0, 55).trimEnd()}…` : item,
      )
      .filter(Boolean)
      .slice(0, 5);
  })();

  const categoryScoreRationales = normalizeCategoryScoreRationales(
    (raw as LegacyAnalysisFields).categoryScoreRationales,
  );
  const melatoninYogaPlan = normalizeMelatoninYogaPlan(
    (raw as LegacyAnalysisFields).melatoninYogaPlan,
  );
  const comparisonNarrative = normalizeComparisonNarrative(
    (raw as LegacyAnalysisFields).comparisonNarrative,
  );

  const homeworkAchievement = normalizeHomeworkAchievement(
    raw.homeworkAchievement ?? raw.achievementRate,
    recommendationsUntilNext,
  );

  const summary = normalizeSummaryLength(
    typeof raw.summary === "string" ? raw.summary : "",
  );

  const karteSummary = normalizeSummaryLength(
    typeof raw.karteSummary === "string" ? raw.karteSummary : "",
    560,
  );

  const scoreBreakdown = normalizeScoreBreakdown(raw.scoreBreakdown, score);

  const contentStatus: AnalysisContentStatus | undefined = (() => {
    const rawStatus = (raw as { contentStatus?: unknown }).contentStatus;
    if (rawStatus === "pending" || rawStatus === "ready" || rawStatus === "error") {
      return rawStatus;
    }
    return undefined;
  })();

  return {
    contentStatus,
    summary,
    karteSummary,
    goodPoints,
    improvements,
    profileRelation,
    scoreComment,
    categoryScoreRationales,
    todaysRecommendations,
    nextComparisonPoints,
    recommendationsUntilNext,
    instructorSuggestions,
    instructorCounseling,
    melatoninYogaPlan,
    comparisonNarrative,
    homeworkAchievement,
    score,
    scoreBreakdown,
    categoryScores: normalizeCategoryScores(
      raw.categoryScores,
      score,
      scoreBreakdown,
    ),
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
    sleepAnalysis,
    autonomicAssessment,
    recoveryAssessment,
    evidenceTitle,
    evidence,
    sleepFactorRanking,
    improvementEffectPredictions,
    melatoninYoga,
    sleepCharacteristics: sleepAnalysis,
    actionPlan:
      actionPlan.length > 0 ? actionPlan : improvementTextList.slice(0, 3),
    dataInsight: sleepAnalysis,
    lifestyleRelation: profileRelation,
    tomorrowPlan:
      nextComparisonPoints.length > 0
        ? nextComparisonPoints
        : actionPlan.length > 0
          ? actionPlan
          : improvementTextList.slice(0, 3),
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

function persistExtractionDraft(draft: ExtractionDraft | null) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!draft) {
      sessionStorage.removeItem(EXTRACTION_DRAFT_KEY);
      return;
    }
    // 画像は IMAGES_KEY に分離保存（容量対策）
    const rest = { ...draft, images: undefined };
    delete (rest as { images?: string[] }).images;
    sessionStorage.setItem(EXTRACTION_DRAFT_KEY, JSON.stringify(rest));
    storeImages(draft.images);
    console.info("[ocr-trace] persistExtractionDraft ok", {
      metricCount: collectedMetricKeys(draft.extractedMetrics).length,
      imageKeys: draft.imageKeys?.length ?? 0,
    });
  } catch (error) {
    console.error("[ocr-trace] ⑧ persistExtractionDraft failed", {
      message: error instanceof Error ? error.message : String(error),
      metricCount: draft
        ? collectedMetricKeys(draft.extractedMetrics).length
        : 0,
    });
    try {
      sessionStorage.removeItem(EXTRACTION_DRAFT_KEY);
    } catch {
      // ignore
    }
  }
}

function readExtractionDraftFromStorage(): ExtractionDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(EXTRACTION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Omit<ExtractionDraft, "images"> & {
      images?: string[];
    };
    const images =
      Array.isArray(parsed.images) && parsed.images.length > 0
        ? parsed.images.filter(
            (item): item is string =>
              typeof item === "string" && item.startsWith("data:image/"),
          )
        : loadAnalysisImages();
    const extractedMetrics = normalizeMetrics(parsed.extractedMetrics);
    return {
      lifestyle: parsed.lifestyle,
      images,
      extractedMetrics,
      imageKeys:
        Array.isArray(parsed.imageKeys) && parsed.imageKeys.length > 0
          ? parsed.imageKeys
          : collectedMetricKeys(extractedMetrics),
      conflicts: parsed.conflicts ? [...parsed.conflicts] : [],
      ocrConfidence: parsed.ocrConfidence
        ? { ...parsed.ocrConfidence }
        : undefined,
      graphs: normalizeGraphBundle(parsed.graphs),
      ocrImageStatuses: normalizeImageStatuses(
        (parsed as { ocrImageStatuses?: unknown }).ocrImageStatuses,
      ),
      ocrSections: Array.isArray(
        (parsed as { ocrSections?: unknown }).ocrSections,
      )
        ? ((parsed as { ocrSections: SoxaiExtractSection[] }).ocrSections)
        : undefined,
      fixedProfile: parsed.fixedProfile,
      dayContext: parsed.dayContext,
    };
  } catch {
    return null;
  }
}

function persistPendingRequest(request: AnalysisRequest | null) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!request) {
      sessionStorage.removeItem(PENDING_REQUEST_KEY);
      return;
    }
    const rest = { ...request, images: undefined };
    delete (rest as { images?: string[] }).images;
    sessionStorage.setItem(PENDING_REQUEST_KEY, JSON.stringify(rest));
    if (request.images?.length) {
      storeImages(request.images);
    }
  } catch {
    try {
      sessionStorage.removeItem(PENDING_REQUEST_KEY);
    } catch {
      // ignore
    }
  }
}

function readPendingRequestFromStorage(): AnalysisRequest | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_REQUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalysisRequest;
    const images =
      Array.isArray(parsed.images) && parsed.images.length > 0
        ? parsed.images.filter(
            (item): item is string =>
              typeof item === "string" && item.startsWith("data:image/"),
          )
        : loadAnalysisImages();
    return {
      ...parsed,
      images,
      metrics: parsed.metrics ? normalizeMetrics(parsed.metrics) : undefined,
      extractedMetrics: parsed.extractedMetrics
        ? normalizeMetrics(parsed.extractedMetrics)
        : undefined,
      graphs: normalizeGraphBundle(parsed.graphs),
      ocrConfidence: parsed.ocrConfidence
        ? { ...parsed.ocrConfidence }
        : undefined,
    };
  } catch {
    return null;
  }
}

export function setExtractionDraft(draft: ExtractionDraft) {
  // 確認画面の初期値は OCR 最終 metrics を表示正規化して保存（キー名・空文字判定を揃える）
  // 前回 draft とのマージはしない（新しい API レスポンスで完全置換）
  const extractedMetrics = normalizeMetricsForDisplay(
    normalizeMetrics(draft.extractedMetrics),
  );
  applyNonRemFromStageOcr(extractedMetrics);
  extractionDraft = {
    lifestyle: draft.lifestyle,
    images: Array.isArray(draft.images) ? [...draft.images] : [],
    extractedMetrics,
    imageKeys: collectedMetricKeys(extractedMetrics),
    conflicts: draft.conflicts ? [...draft.conflicts] : [],
    ocrConfidence: draft.ocrConfidence
      ? { ...draft.ocrConfidence }
      : undefined,
    graphs: normalizeGraphBundle(draft.graphs),
    ocrImageStatuses: draft.ocrImageStatuses
      ? [...draft.ocrImageStatuses]
      : undefined,
    ocrSections: draft.ocrSections ? [...draft.ocrSections] : undefined,
    fixedProfile: draft.fixedProfile,
    dayContext: draft.dayContext,
    inputSource: draft.inputSource ?? "soxai",
    swsMetrics: draft.swsMetrics ? [...draft.swsMetrics] : undefined,
  };
  persistExtractionDraft(extractionDraft);
}

export function getExtractionDraft(): ExtractionDraft | null {
  if (extractionDraft) return extractionDraft;
  extractionDraft = readExtractionDraftFromStorage();
  return extractionDraft;
}

export function clearExtractionDraft() {
  extractionDraft = null;
  persistExtractionDraft(null);
}

/**
 * 新規分析開始時専用。ページ更新では呼ばない。
 * 古い draft / pending / 前回結果 / OCR 一時キャッシュを破棄し、
 * 新しい API レスポンスだけが確認・結果画面に載るようにする。
 */
export function beginNewSoxaiAnalysisSession(options?: {
  /** true のとき実行中バックグラウンド OCR は維持（同一アップロードの提出時） */
  keepBackgroundOcr?: boolean;
  /** false のとき OCR local/memory キャッシュは残す（同一画像セットの提出再利用） */
  clearOcrCaches?: boolean;
}): void {
  const keepBackgroundOcr = options?.keepBackgroundOcr === true;
  const shouldClearOcrCaches = options?.clearOcrCaches !== false;

  clearExtractionDraft();
  clearPendingAnalysisRequest();
  inFlightAnalysis = null;

  if (!keepBackgroundOcr) {
    clearBackgroundSoxaiExtraction();
  }

  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(RESULT_KEY);
      sessionStorage.removeItem(GRAPHS_KEY);
      sessionStorage.removeItem(IMAGES_KEY);
      if (shouldClearOcrCaches) {
        sessionStorage.removeItem(OCR_CACHE_STORAGE_KEY);
      }
    } catch {
      // private mode
    }
  }

  if (shouldClearOcrCaches) {
    ocrResultCache.clear();
    clearSoxaiOcrCaches();
  }
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
    seedScore: request.seedScore,
    seedScoreBreakdown: request.seedScoreBreakdown,
    seedCategoryScores: request.seedCategoryScores,
    inputSource: request.inputSource ?? "soxai",
    swsMetrics: request.swsMetrics ? [...request.swsMetrics] : undefined,
  };
  inFlightAnalysis = null;
  persistPendingRequest(pendingRequest);
}

export function clearPendingAnalysisRequest() {
  pendingRequest = null;
  persistPendingRequest(null);
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
      return "画像解析APIの設定が完了していません。管理者に OPENAI_API_KEY の設定を依頼してください。";
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

export async function extractSoxaiMetrics(
  images: string[],
): Promise<AnalysisMetrics> {
  const result = await extractSoxaiMetricsDetailed(images);
  return result.metrics;
}

export async function extractSoxaiMetricsDetailed(
  images: string[],
  sections?: SoxaiExtractSection[],
  options?: {
    signal?: AbortSignal;
    onProgress?: (snapshot: OcrProgressSnapshot) => void;
    onlyIndexes?: number[];
    seed?: SoxaiOcrRunResult["imageStatuses"] extends infer _
      ? {
          metrics?: AnalysisMetrics;
          graphs?: SoxaiGraphBundle;
          confidence?: MetricConfidenceMap;
          conflicts?: MetricConflict[];
          imageStatuses?: SoxaiOcrImageStatusRecord[];
        }
      : never;
  },
): Promise<SoxaiOcrRunResult> {
  if (!Array.isArray(images) || images.length === 0) {
    throw new AnalysisError("睡眠データ画像が不足しています。", {
      errorType: "Validation Error",
    });
  }

  try {
    return await runSoxaiOcr({
      images,
      sections,
      signal: options?.signal,
      onProgress: options?.onProgress,
      onlyIndexes: options?.onlyIndexes,
      seed: options?.seed,
    });
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new AnalysisError("OCR解析を中止しました。", {
        errorType: "Fetch Error",
      });
    }
    if (error instanceof AnalysisError) throw error;
    throw new AnalysisError(
      error instanceof Error
        ? error.message
        : "画像の自動解析に失敗しました。",
      { errorType: "OpenAI Error" },
    );
  }
}

function normalizeMetricSourceMap(
  raw: unknown,
): Partial<Record<MetricFieldKey, SoxaiMetricSource>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const validKeys = new Set(SOXAI_METRIC_FIELDS.map((field) => field.key));
  const out: Partial<Record<MetricFieldKey, SoxaiMetricSource>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!validKeys.has(key as MetricFieldKey)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as { section?: unknown; imageIndex?: unknown };
    const section =
      typeof record.section === "string" ? record.section.trim() : "";
    const imageIndex =
      typeof record.imageIndex === "number" &&
      Number.isFinite(record.imageIndex) &&
      record.imageIndex >= 0
        ? Math.floor(record.imageIndex)
        : -1;
    if (!section || imageIndex < 0) continue;
    out[key as MetricFieldKey] = { section, imageIndex };
  }
  return out;
}

type VerifyMetricDiagnostic = {
  presentInAnyImage?: unknown;
  presentInMergedRaw?: unknown;
  presentBeforeDisplayNormalize?: unknown;
  hasStrongLabel?: unknown;
  strongLabelScreens?: unknown;
  expectedScreens?: unknown;
  sectionMismatch?: unknown;
};

function normalizeVerifyDiagnostics(
  raw: unknown,
): Partial<Record<MetricFieldKey, VerifyMetricDiagnostic>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const validKeys = new Set(SOXAI_METRIC_FIELDS.map((field) => field.key));
  const out: Partial<Record<MetricFieldKey, VerifyMetricDiagnostic>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!validKeys.has(key as MetricFieldKey)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    out[key as MetricFieldKey] = value as VerifyMetricDiagnostic;
  }
  return out;
}

function boolish(value: unknown): boolean {
  return value === true;
}

function detectMissingReason(
  diagnostic: VerifyMetricDiagnostic | undefined,
): OcrVerifyRow["missingReason"] {
  if (!diagnostic) return "OCR未検出";

  const presentInAnyImage = boolish(diagnostic.presentInAnyImage);
  const presentInMergedRaw = boolish(diagnostic.presentInMergedRaw);
  const presentBeforeDisplayNormalize = boolish(
    diagnostic.presentBeforeDisplayNormalize,
  );
  const hasStrongLabel = boolish(diagnostic.hasStrongLabel);
  const sectionMismatch = boolish(diagnostic.sectionMismatch);

  if (presentInAnyImage && !presentInMergedRaw) return "マージ漏れ";
  if (presentInMergedRaw && !presentBeforeDisplayNormalize) {
    return "正規化漏れ";
  }
  if (sectionMismatch) return "section違い";
  if (hasStrongLabel && !presentInAnyImage) return "マッピング漏れ";
  if (hasStrongLabel && presentInAnyImage && !presentBeforeDisplayNormalize) {
    return "正規化漏れ";
  }
  return "OCR未検出";
}

function isOcrAbnormalValue(key: MetricFieldKey, value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  const num = Number(text.replace(/[^\d.-]/g, ""));

  switch (key) {
    case "sleepScore":
    case "qol":
    case "yesterdayQol":
    case "conditionScore":
    case "stress":
      return !Number.isFinite(num) || num < 0 || num > 100;
    case "sleepEfficiency":
    case "awakeningRate":
    case "remSleepRate":
    case "nonRemSleepRate":
    case "lightSleepRate":
    case "deepSleepRate":
    case "spo2":
      return !/%|％/.test(text) || !Number.isFinite(num) || num < 0 || num > 100;
    case "bedtime":
    case "wakeTime":
      return !/^\d{2}:\d{2}$/.test(text);
    case "restingHeartRate":
      return !Number.isFinite(num) || num < 30 || num > 140;
    case "hrv":
    case "hrvMax":
      return !Number.isFinite(num) || num < 5 || num > 250;
    case "respiratoryRate":
      return !Number.isFinite(num) || num < 5 || num > 35;
    case "skinTemperature":
      return (
        !/[℃°]/.test(text) &&
        !/^[+-]\d+(\.\d+)?$/.test(text) &&
        !Number.isFinite(num)
      );
    default:
      return false;
  }
}

export async function extractSoxaiOcrVerifyData(
  images: string[],
  sections?: SoxaiExtractSection[],
): Promise<OcrVerifyResult> {
  if (!Array.isArray(images) || images.length === 0) {
    throw new AnalysisError("睡眠データ画像が不足しています。", {
      errorType: "Validation Error",
    });
  }

  let response: Response;
  try {
    response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images, sections }),
    });
  } catch (fetchError) {
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
    throw new AnalysisError("画像解析結果のJSON解析に失敗しました。", {
      status: response.status,
      errorType: "JSON Parse Error",
      details:
        parseError instanceof Error ? parseError.message : String(parseError),
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
        : "画像の自動解析に失敗しました。";
    throw new AnalysisError(message, {
      status: response.status,
      errorType:
        typeof errorPayload.errorType === "string"
          ? errorPayload.errorType
          : "OpenAI Error",
      details:
        typeof errorPayload.details === "string"
          ? errorPayload.details
          : undefined,
    });
  }

  const metricsRaw =
    data && typeof data === "object" && "metrics" in data
      ? (data as { metrics: Partial<AnalysisMetrics> }).metrics
      : undefined;
  const metrics = normalizeMetricsForDisplay(normalizeMetrics(metricsRaw));
  const metricSources = normalizeMetricSourceMap(
    data && typeof data === "object" && "metricSources" in data
      ? (data as { metricSources: unknown }).metricSources
      : undefined,
  );
  const verifyDiagnostics = normalizeVerifyDiagnostics(
    data && typeof data === "object" && "verifyDiagnostics" in data
      ? (data as { verifyDiagnostics: unknown }).verifyDiagnostics
      : undefined,
  );
  const imageCount =
    data && typeof data === "object" && "imageCount" in data
      ? Number((data as { imageCount: unknown }).imageCount) || images.length
      : images.length;
  const visibleCount =
    data && typeof data === "object" && "visibleCount" in data
      ? Number((data as { visibleCount: unknown }).visibleCount) || 0
      : 0;

  const rows: OcrVerifyRow[] = SOXAI_METRIC_FIELDS.map((field) => {
    const value = metricDisplayValue(metrics, field.key).trim();
    const success = Boolean(value);
    const missing = !success;
    return {
      key: field.key,
      label: field.label,
      value,
      section: metricSources[field.key]?.section ?? "-",
      success,
      missing,
      abnormal: success ? isOcrAbnormalValue(field.key, value) : false,
      missingReason: missing
        ? detectMissingReason(verifyDiagnostics[field.key])
        : "",
    };
  });
  const acquiredCount = rows.filter((row) => row.success).length;
  return { rows, metrics, imageCount, visibleCount, acquiredCount };
}

/** data URL 配列の SHA-256 指紋。同一画像セットの OCR 重複実行を防ぐ */
export async function soxaiImagesFingerprint(images: string[]): Promise<string> {
  const hashes = await hashImageDataUrls(images);
  return setFingerprintFromHashes(hashes);
}

function soxaiSectionsFingerprint(sections?: SoxaiExtractSection[]): string {
  if (!sections || sections.length === 0) return "";
  return sections.join(",");
}

export function isAnalysisOcrDebugMode(): boolean {
  return isSoxaiOcrDebugMode();
}

/**
 * SOXAI 画像アップロード直後に OCR をバックグラウンド開始する。
 * 同じ指紋のキャッシュ／ジョブがあれば再利用し、再解析しない。
 */
export async function startBackgroundSoxaiExtraction(
  images: string[],
  sections?: SoxaiExtractSection[],
  options?: {
    onProgress?: (snapshot: OcrProgressSnapshot) => void;
  },
): Promise<SoxaiOcrRunResult> {
  if (!Array.isArray(images) || images.length === 0) {
    return Promise.reject(
      new AnalysisError("睡眠データ画像が不足しています。", {
        errorType: "Validation Error",
      }),
    );
  }

  const strongFp = await soxaiImagesFingerprint(images);
  const fingerprint = `${strongFp}::${soxaiSectionsFingerprint(sections)}`;

  const cached = await getCachedSoxaiExtraction(images);
  if (cached) {
    const readyProgress: OcrProgressSnapshot = {
      phase: "done",
      message: `${images.length} / ${images.length}枚 完了`,
      total: images.length,
      completed: images.length,
      activeLabels: [],
      startedAt: Date.now(),
      estimatedRemainingMs: 0,
      cancelled: false,
      images: images.map((_, index) => ({
        index,
        section: sections?.[index] ?? "",
        label: sections?.[index] ?? `画像${index + 1}`,
        status: "success",
        startedAt: null,
        endedAt: null,
      })),
    };
    const abortController = new AbortController();
    const promise = Promise.resolve({
      ...cached,
      imageStatuses:
        (cached as SoxaiOcrRunResult).imageStatuses ??
        images.map((_, index) => ({
          index,
          section: (sections?.[index] ?? "") as SoxaiExtractSection | "",
          label: String(index + 1),
          status: "success" as const,
        })),
      cancelled: false,
      elapsedMs: 0,
      fromCache: true,
    } satisfies SoxaiOcrRunResult);
    backgroundOcrJob = {
      fingerprint,
      promise,
      status: "ready",
      abortController,
      progress: readyProgress,
      generation: backgroundOcrGeneration,
      listeners: new Set(),
    };
    options?.onProgress?.(readyProgress);
    return promise;
  }

  if (
    backgroundOcrJob &&
    backgroundOcrJob.fingerprint === fingerprint &&
    backgroundOcrJob.status !== "error"
  ) {
    if (options?.onProgress) {
      backgroundOcrJob.listeners.add(options.onProgress);
      if (backgroundOcrJob.progress) {
        options.onProgress(backgroundOcrJob.progress);
      }
    }
    return backgroundOcrJob.promise;
  }

  // 旧ジョブがあれば中止（新しい画像セット）
  if (backgroundOcrJob && backgroundOcrJob.status === "running") {
    backgroundOcrJob.abortController.abort();
  }

  const abortController = new AbortController();
  const generation = ++backgroundOcrGeneration;
  const listeners = new Set<(progress: OcrProgressSnapshot) => void>();
  if (options?.onProgress) listeners.add(options.onProgress);

  const notify = (progress: OcrProgressSnapshot) => {
    if (backgroundOcrJob?.fingerprint === fingerprint) {
      backgroundOcrJob.progress = progress;
    }
    for (const listener of listeners) {
      try {
        listener(progress);
      } catch (error) {
        console.error("[ocr] progress listener failed:", error);
      }
    }
  };

  const promise = extractSoxaiMetricsDetailed(images, sections, {
    signal: abortController.signal,
    onProgress: notify,
  })
    .then(async (result) => {
      await rememberSoxaiExtraction(
        strongFp,
        result,
        result.imageHashes,
      );
      if (backgroundOcrJob?.fingerprint === fingerprint) {
        backgroundOcrJob.status = result.cancelled ? "cancelled" : "ready";
      }
      return result;
    })
    .catch((error) => {
      if (backgroundOcrJob?.fingerprint === fingerprint) {
        backgroundOcrJob.status =
          abortController.signal.aborted ? "cancelled" : "error";
        backgroundOcrJob.error = error;
      }
      throw error;
    });

  backgroundOcrJob = {
    fingerprint,
    promise,
    status: "running",
    abortController,
    progress: null,
    generation,
    listeners,
  };

  return promise;
}

/** 現在のバックグラウンド OCR 状態（UI 表示用） */
export function getBackgroundSoxaiExtractionStatus(): BackgroundOcrStatus {
  if (!backgroundOcrJob) return "idle";
  if (backgroundOcrJob.status === "ready") return "ready";
  if (backgroundOcrJob.status === "error") return "error";
  if (backgroundOcrJob.status === "cancelled") return "cancelled";
  return "running";
}

export function getBackgroundSoxaiExtractionProgress(): OcrProgressSnapshot | null {
  return backgroundOcrJob?.progress ?? null;
}

export function subscribeBackgroundSoxaiExtractionProgress(
  listener: (progress: OcrProgressSnapshot) => void,
): () => void {
  if (!backgroundOcrJob) return () => {};
  backgroundOcrJob.listeners.add(listener);
  if (backgroundOcrJob.progress) listener(backgroundOcrJob.progress);
  return () => {
    backgroundOcrJob?.listeners.delete(listener);
  };
}

export function getBackgroundSoxaiGeneration(): number {
  return backgroundOcrJob?.generation ?? backgroundOcrGeneration;
}

/**
 * 提出時に OCR 結果を取得する。
 * キャッシュ／バックグラウンド完了済みなら即座に返し、未開始なら新規開始する。
 */
export async function resolveSoxaiExtraction(
  images: string[],
  sections?: SoxaiExtractSection[],
  options?: {
    onProgress?: (snapshot: OcrProgressSnapshot) => void;
    signal?: AbortSignal;
  },
): Promise<SoxaiOcrRunResult> {
  const cached = await getCachedSoxaiExtraction(images);
  if (cached && !(cached as SoxaiOcrRunResult).cancelled) {
    const result: SoxaiOcrRunResult = {
      ...cached,
      imageStatuses:
        (cached as SoxaiOcrRunResult).imageStatuses ??
        images.map((_, index) => ({
          index,
          section: (sections?.[index] ?? "") as SoxaiExtractSection | "",
          label: String(index + 1),
          status: "success" as const,
        })),
      cancelled: false,
      elapsedMs: 0,
      fromCache: true,
    };
    return result;
  }

  const strongFp = await soxaiImagesFingerprint(images);
  const fingerprint = `${strongFp}::${soxaiSectionsFingerprint(sections)}`;
  if (
    backgroundOcrJob &&
    backgroundOcrJob.fingerprint === fingerprint &&
    backgroundOcrJob.status !== "error" &&
    backgroundOcrJob.status !== "cancelled"
  ) {
    if (options?.onProgress) {
      backgroundOcrJob.listeners.add(options.onProgress);
      if (backgroundOcrJob.progress) {
        options.onProgress(backgroundOcrJob.progress);
      }
    }
    if (options?.signal) {
      const onAbort = () => backgroundOcrJob?.abortController.abort();
      if (options.signal.aborted) onAbort();
      else options.signal.addEventListener("abort", onAbort, { once: true });
    }
    return backgroundOcrJob.promise;
  }
  return startBackgroundSoxaiExtraction(images, sections, {
    onProgress: options?.onProgress,
  });
}

export function cancelBackgroundSoxaiExtraction(): void {
  if (!backgroundOcrJob) return;
  backgroundOcrJob.abortController.abort();
  backgroundOcrJob.status = "cancelled";
}

export function clearBackgroundSoxaiExtraction() {
  if (backgroundOcrJob?.status === "running") {
    backgroundOcrJob.abortController.abort();
  }
  backgroundOcrJob = null;
}

/** 確認画面から失敗画像のみ再解析 */
export async function reanalyzeSoxaiImages(params: {
  images: string[];
  sections?: SoxaiExtractSection[];
  indexes: number[];
  seed: {
    metrics: AnalysisMetrics;
    graphs: SoxaiGraphBundle;
    confidence?: MetricConfidenceMap;
    conflicts?: MetricConflict[];
    imageStatuses?: SoxaiOcrImageStatusRecord[];
  };
  signal?: AbortSignal;
  onProgress?: (snapshot: OcrProgressSnapshot) => void;
}): Promise<SoxaiOcrRunResult> {
  return extractSoxaiMetricsDetailed(params.images, params.sections, {
    signal: params.signal,
    onProgress: params.onProgress,
    onlyIndexes: params.indexes,
    seed: params.seed,
  });
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
    // OCR と分析を分離: 確認済みメトリクスがある場合は画像を絶対に送らない
    const analyzePayload = {
      lifestyle: payload.lifestyle,
      images: payload.metrics ? ([] as string[]) : payload.images,
      metrics: payload.metrics,
      extractedMetrics: payload.extractedMetrics,
      graphs: payload.graphs,
      ocrConfidence: payload.ocrConfidence,
      fixedProfile: payload.fixedProfile,
      dayContext: payload.dayContext,
      aiInput: payload.aiInput,
      inputSource: payload.inputSource,
      swsMetrics: payload.swsMetrics,
      seedScore: payload.seedScore,
      seedScoreBreakdown: payload.seedScoreBreakdown,
      seedCategoryScores: payload.seedCategoryScores,
    };

    let response: Response;
    try {
      response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analyzePayload),
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

    const raw = data as AnalysisResult & {
      usage?: {
        purpose?: string;
        model?: string;
        apiCalls?: number;
        inputTokens?: number;
        outputTokens?: number;
        durationMs?: number;
        imageCount?: number;
        note?: string;
      };
    };
    if (raw.usage && typeof raw.usage === "object") {
      recordOpenAiUsage({
        purpose: "analyze",
        model: raw.usage.model ?? "gpt-4o",
        apiCalls: raw.usage.apiCalls ?? 1,
        inputTokens: raw.usage.inputTokens ?? 0,
        outputTokens: raw.usage.outputTokens ?? 0,
        durationMs: raw.usage.durationMs,
        imageCount: raw.usage.imageCount,
        note: raw.usage.note,
      });
    }
    const result = normalizeAnalysisResult(
      raw,
      {
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
      },
    );

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

    // Score-first の seed があれば AI のスコア上書きを抑止し、説明文の点数も整合
    if (
      typeof payload.seedScore === "number" &&
      Number.isFinite(payload.seedScore)
    ) {
      result.score = Math.max(0, Math.min(100, Math.round(payload.seedScore)));
    }
    if (payload.seedScoreBreakdown) {
      result.scoreBreakdown = normalizeScoreBreakdown(
        payload.seedScoreBreakdown,
        result.score,
      );
    }
    if (payload.seedCategoryScores) {
      result.categoryScores = normalizeCategoryScores(
        payload.seedCategoryScores,
        result.score,
        result.scoreBreakdown,
      );
    }
    if (
      typeof payload.seedScore === "number" ||
      payload.seedCategoryScores
    ) {
      const { alignScoreNarrativesToLocked } = await import(
        "@/lib/analysis-fast-path"
      );
      const aligned = alignScoreNarrativesToLocked({
        scoreComment: result.scoreComment,
        categoryScoreRationales: result.categoryScoreRationales,
        lockedScore: result.score,
        lockedCategories: result.categoryScores,
      });
      result.scoreComment = aligned.scoreComment;
      result.categoryScoreRationales = aligned.categoryScoreRationales;
    }

    result.contentStatus = "ready";

    clearPendingAnalysisRequest();
    clearExtractionDraft();
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
    storeImages(payload.images);
    storeGraphs(result.graphs);
    notifyAnalysisSessionListeners(result);
    return result;
  })();

  inFlightAnalysis.catch((error) => {
    console.error("Pending analysis failed:", error);
    inFlightAnalysis = null;
  });

  return inFlightAnalysis;
}

export function getPendingAnalysisRequest(): AnalysisRequest | null {
  if (pendingRequest) return pendingRequest;
  pendingRequest = readPendingRequestFromStorage();
  return pendingRequest;
}

export function peekPendingAnalysisImages(): string[] {
  return pendingRequest?.images ? [...pendingRequest.images] : [];
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
  options?: { images?: string[]; notify?: boolean },
): AnalysisResult {
  const normalized = normalizeAnalysisResult(result);
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(normalized));
  storeGraphs(normalizeGraphBundle(normalized.graphs));
  if (options?.images && options.images.length > 0) {
    storeImages(options.images);
  }
  if (options?.notify !== false) {
    notifyAnalysisSessionListeners(normalized);
  }
  return normalized;
}
