/**
 * AI 生成文が「未入力の生活習慣」を断定・言及していないか検出するガード。
 * Day 4 summary ガードと同様に、検出 → 1回再生成 → なお残れば文削除／安全文へ差し替え。
 */

export type LifestyleMentionCategory =
  | "alcohol"
  | "caffeine"
  | "exercise"
  | "bathing"
  | "meals"
  | "medications"
  | "work"
  | "snoring"
  | "nasalCongestion"
  | "bruxism";

/** 分析 API の lifestyle フォームと共通の最小形 */
export type LifestyleMentionSource = {
  medications?: string;
  drinkingHabit?: string;
  exerciseHabit?: string;
  exercise?: string;
  yoga?: string;
  yogaDone?: string;
  pilates?: string;
  pilatesDone?: string;
  otherExerciseDone?: string;
  otherExerciseName?: string;
  bathing?: string;
  alcohol?: string;
  alcoholDrank?: string;
  alcoholType?: string;
  alcoholAmount?: string;
  alcoholEndTime?: string;
  alcoholNotes?: string;
  caffeine?: string;
  caffeineDone?: string;
  caffeineType?: string;
  caffeineAmount?: string;
  caffeineTime?: string;
  caffeineNotes?: string;
  meals?: string;
  breakfastEaten?: string;
  breakfastTime?: string;
  breakfastContent?: string;
  lunchEaten?: string;
  lunchTime?: string;
  lunchContent?: string;
  dinnerEaten?: string;
  dinnerTime?: string;
  dinnerContent?: string;
  work?: string;
  /** クライアント基本情報・当日フォーム */
  snoringNasal?: string;
  nasalCongestion?: string;
  /** Profile V2（将来含む） */
  snoring?: string;
  nasalCongestionHabitual?: string;
  bruxism?: string;
};

export type LifestyleMentionField =
  | "summary"
  | "scoreComment"
  | "profileRelation"
  | "categoryScoreRationales.body"
  | "categoryScoreRationales.mind"
  | "categoryScoreRationales.lifestyle"
  | "categoryScoreRationales.environment";

export type LifestyleMentionHit = {
  field: LifestyleMentionField;
  categories: LifestyleMentionCategory[];
};

const CATEGORY_LABEL_JA: Record<LifestyleMentionCategory, string> = {
  alcohol: "飲酒",
  caffeine: "カフェイン",
  exercise: "運動",
  bathing: "入浴",
  meals: "食事",
  medications: "服薬",
  work: "勤務・仕事",
  snoring: "いびき",
  nasalCongestion: "鼻づまり・鼻閉",
  bruxism: "歯ぎしり",
};

/** 未入力カテゴリを検出するキーワード（入力があるカテゴリには使わない） */
export const LIFESTYLE_MENTION_KEYWORDS: Record<
  LifestyleMentionCategory,
  RegExp
> = {
  alcohol:
    /飲酒量|多めの飲酒|飲酒の習慣|飲酒習慣|お酒を飲|酒を飲|飲んで|飲酒|アルコール|お酒|酒量/u,
  caffeine: /カフェイン|コーヒー|紅茶|緑茶|エナジードリンク/u,
  exercise:
    /運動量|運動習慣|運動|ヨガ|ピラティス|筋トレ|トレーニング|散歩|ウォーキング/u,
  bathing: /入浴|お風呂|シャワー|湯船|半身浴/u,
  meals: /食事|朝食|昼食|夕食|欠食|食べな|摂らな|摂っていな/u,
  medications: /服薬|くすり|薬を|薬の|薬剤/u,
  work: /勤務|仕事|シフト|夜勤|残業|労働/u,
  snoring: /いびき|snor/i,
  nasalCongestion: /鼻づま|鼻閉|鼻詰|鼻塞|nasal/i,
  bruxism: /歯ぎしり|歯ぐせ|ブラキシズム|teeth.?grind/i,
};

function trim(value?: string | null): string {
  return (value ?? "").trim();
}

function hasText(value?: string | null): boolean {
  return Boolean(trim(value));
}

/** yes / none の明示選択は「入力あり」（なしも記録） */
function hasYesNone(value?: string | null): boolean {
  const v = trim(value).toLowerCase();
  return v === "yes" || v === "none";
}

function mealFilled(
  eaten?: string,
  time?: string,
  content?: string,
): boolean {
  return hasYesNone(eaten) || hasText(time) || hasText(content);
}

function parseSnoringNasalHint(text?: string | null): {
  snoring: boolean;
  nasal: boolean;
} {
  const raw = trim(text);
  if (!raw) return { snoring: false, nasal: false };
  const parts = raw.split(/\s*\/\s*/u);
  if (parts.length >= 2) {
    return {
      snoring: /いびき|snor/i.test(parts[0] ?? ""),
      nasal: /鼻|nasal/i.test(parts[1] ?? ""),
    };
  }
  return {
    snoring: /いびき|snor/i.test(raw),
    nasal: /鼻づま|鼻閉|鼻詰|鼻塞|nasal/i.test(raw),
  };
}

/** lifestyle フォームと AnalysisResult 由来の基本情報を統合 */
export function mergeLifestyleMentionSource(
  primary?: LifestyleMentionSource | null,
  secondary?: LifestyleMentionSource | null,
): LifestyleMentionSource {
  return { ...secondary, ...primary };
}

/**
 * 生活習慣フォームから「記録がない」カテゴリ一覧を返す。
 * 明示的な「なし／していない」は入力ありとみなす。
 */
export function collectUnfilledLifestyleCategories(
  lifestyle: LifestyleMentionSource | null | undefined,
): LifestyleMentionCategory[] {
  if (!lifestyle) {
    return [
      "alcohol",
      "caffeine",
      "exercise",
      "bathing",
      "meals",
      "medications",
      "work",
      "snoring",
      "nasalCongestion",
      "bruxism",
    ];
  }

  const unfilled: LifestyleMentionCategory[] = [];

  const alcoholFilled =
    hasYesNone(lifestyle.alcoholDrank) ||
    hasText(lifestyle.alcohol) ||
    hasText(lifestyle.alcoholType) ||
    hasText(lifestyle.alcoholAmount) ||
    hasText(lifestyle.alcoholEndTime) ||
    hasText(lifestyle.alcoholNotes) ||
    hasText(lifestyle.drinkingHabit);
  if (!alcoholFilled) unfilled.push("alcohol");

  const caffeineFilled =
    hasYesNone(lifestyle.caffeineDone) ||
    hasText(lifestyle.caffeine) ||
    hasText(lifestyle.caffeineType) ||
    hasText(lifestyle.caffeineAmount) ||
    hasText(lifestyle.caffeineTime) ||
    hasText(lifestyle.caffeineNotes);
  if (!caffeineFilled) unfilled.push("caffeine");

  const exerciseFilled =
    hasYesNone(lifestyle.yogaDone) ||
    hasYesNone(lifestyle.pilatesDone) ||
    hasYesNone(lifestyle.otherExerciseDone) ||
    hasText(lifestyle.exercise) ||
    hasText(lifestyle.yoga) ||
    hasText(lifestyle.pilates) ||
    hasText(lifestyle.otherExerciseName) ||
    hasText(lifestyle.exerciseHabit);
  if (!exerciseFilled) unfilled.push("exercise");

  if (!hasText(lifestyle.bathing)) unfilled.push("bathing");

  const mealsFilled =
    mealFilled(
      lifestyle.breakfastEaten,
      lifestyle.breakfastTime,
      lifestyle.breakfastContent,
    ) ||
    mealFilled(
      lifestyle.lunchEaten,
      lifestyle.lunchTime,
      lifestyle.lunchContent,
    ) ||
    mealFilled(
      lifestyle.dinnerEaten,
      lifestyle.dinnerTime,
      lifestyle.dinnerContent,
    ) ||
    hasText(lifestyle.meals);
  if (!mealsFilled) unfilled.push("meals");

  if (!hasText(lifestyle.medications)) unfilled.push("medications");

  if (!hasText(lifestyle.work)) unfilled.push("work");

  const snoringHint = parseSnoringNasalHint(lifestyle.snoringNasal);
  const snoringFilled =
    hasText(lifestyle.snoring) ||
    snoringHint.snoring ||
    (/いびき|snor/i.test(trim(lifestyle.snoringNasal)) &&
      !/なし|無|ない|no/i.test(trim(lifestyle.snoringNasal)));
  if (!snoringFilled) unfilled.push("snoring");

  const nasalFilled =
    hasYesNone(lifestyle.nasalCongestion) ||
    hasText(lifestyle.nasalCongestionHabitual) ||
    snoringHint.nasal ||
    (/鼻|nasal/i.test(trim(lifestyle.snoringNasal)) &&
      !/なし|無|ない|no/i.test(trim(lifestyle.snoringNasal)));
  if (!nasalFilled) unfilled.push("nasalCongestion");

  if (!hasText(lifestyle.bruxism)) unfilled.push("bruxism");

  return unfilled;
}

export function categoriesMentionedInText(
  text: string,
  unfilled: LifestyleMentionCategory[],
): LifestyleMentionCategory[] {
  if (!text.trim() || unfilled.length === 0) return [];
  return unfilled.filter((category) =>
    LIFESTYLE_MENTION_KEYWORDS[category].test(text),
  );
}

function readField(
  record: Record<string, unknown>,
  field: LifestyleMentionField,
): string {
  if (field.startsWith("categoryScoreRationales.")) {
    const key = field.split(".")[1] as "body" | "mind" | "lifestyle" | "environment";
    const rationales = record.categoryScoreRationales;
    if (!rationales || typeof rationales !== "object") return "";
    const value = (rationales as Record<string, unknown>)[key];
    return typeof value === "string" ? value : "";
  }
  if (field === "profileRelation") {
    const primary =
      typeof record.profileRelation === "string" ? record.profileRelation : "";
    if (primary.trim()) return primary;
    return typeof record.lifestyleRelation === "string"
      ? record.lifestyleRelation
      : "";
  }
  const value = record[field];
  return typeof value === "string" ? value : "";
}

function writeField(
  record: Record<string, unknown>,
  field: LifestyleMentionField,
  value: string,
): void {
  if (field.startsWith("categoryScoreRationales.")) {
    const key = field.split(".")[1] as string;
    if (!record.categoryScoreRationales || typeof record.categoryScoreRationales !== "object") {
      record.categoryScoreRationales = {};
    }
    (record.categoryScoreRationales as Record<string, unknown>)[key] = value;
    return;
  }
  if (field === "profileRelation") {
    record.profileRelation = value;
    if ("lifestyleRelation" in record) {
      record.lifestyleRelation = value;
    }
    return;
  }
  record[field] = value;
}

const GUARDED_FIELDS: LifestyleMentionField[] = [
  "summary",
  "scoreComment",
  "profileRelation",
  "categoryScoreRationales.body",
  "categoryScoreRationales.mind",
  "categoryScoreRationales.lifestyle",
  "categoryScoreRationales.environment",
];

/** 対象フィールドから、未入力カテゴリへの言及を検出する */
export function detectLifestyleMentionHits(
  record: Record<string, unknown>,
  unfilled: LifestyleMentionCategory[],
): LifestyleMentionHit[] {
  if (unfilled.length === 0) return [];
  const hits: LifestyleMentionHit[] = [];
  for (const field of GUARDED_FIELDS) {
    const text = readField(record, field);
    const categories = categoriesMentionedInText(text, unfilled);
    if (categories.length > 0) {
      hits.push({ field, categories });
    }
  }
  return hits;
}

export function lifestyleMentionHasIssues(
  record: Record<string, unknown>,
  unfilled: LifestyleMentionCategory[],
): boolean {
  return detectLifestyleMentionHits(record, unfilled).length > 0;
}

/** 自己矛盾（言及しつつ「情報なし」と述べる）文を検出 */
const SELF_CONTRADICTORY_LIFESTYLE =
  /(?:かもしれません|可能性があります|影響[^。]{0,24}?(?:与え|及ぼ))[^。]{0,160}?(?:情報|記録|入力)[^。]{0,80}?(?:ありません|ない|確認できません|ありませんでした)/u;

export function sentenceIsSelfContradictoryLifestyle(text: string): boolean {
  return SELF_CONTRADICTORY_LIFESTYLE.test(text.trim());
}

/** 未入力項目への仮定・条件付き言及（「〜がある場合」等） */
const HYPOTHETICAL_LIFESTYLE =
  /(?:がある場合|があれば|であれば|の場合|場合は|ときは|際は|もし[^。]{0,24}?(?:あれば|なら)|(?:十分|定期的|日常)(?:的)?な)/u;

export function sentenceReferencesUnfilledCategory(
  sentence: string,
  unfilled: LifestyleMentionCategory[],
): boolean {
  if (!sentence.trim() || unfilled.length === 0) return false;
  if (sentenceIsSelfContradictoryLifestyle(sentence)) return true;
  const hits = categoriesMentionedInText(sentence, unfilled);
  if (hits.length === 0) return false;
  if (HYPOTHETICAL_LIFESTYLE.test(sentence)) return true;
  return true;
}

/** カテゴリごとの除去フレーズ（長い語から順に適用） */
const CATEGORY_REDACT_PHRASES: Record<LifestyleMentionCategory, string[]> = {
  alcohol: [
    "多めの飲酒",
    "飲酒の習慣",
    "飲酒習慣",
    "飲酒量",
    "お酒を飲",
    "酒を飲",
    "アルコール",
    "飲酒",
    "お酒",
    "酒量",
  ],
  caffeine: ["カフェイン", "コーヒー", "紅茶", "緑茶", "エナジードリンク"],
  exercise: [
    "運動習慣",
    "運動量",
    "ピラティス",
    "トレーニング",
    "ウォーキング",
    "筋トレ",
    "散歩",
    "ヨガ",
    "運動",
  ],
  bathing: ["半身浴", "お風呂", "シャワー", "湯船", "入浴"],
  meals: ["夕食", "昼食", "朝食", "欠食", "食事"],
  medications: ["服薬", "薬剤", "くすり", "薬"],
  work: ["夜勤", "残業", "勤務", "労働", "シフト", "仕事"],
  snoring: ["いびき"],
  nasalCongestion: ["鼻づまり", "鼻閉", "鼻詰", "鼻塞"],
  bruxism: ["歯ぎしり", "歯ぐせ", "ブラキシズム"],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** ・区切りリストから未入力カテゴリの要素だけ除去 */
function redactUnfilledListSegments(
  sentence: string,
  unfilled: LifestyleMentionCategory[],
): string {
  return sentence.replace(
    /([^。、！？\n]+(?:・[^。、！？\n]+)+(?:など)?)/gu,
    (listBlock) => {
      const trailingEtc = /など$/u.test(listBlock);
      const core = trailingEtc ? listBlock.replace(/など$/u, "") : listBlock;
      const parts = core.split("・").map((part) => part.trim()).filter(Boolean);
      const kept = parts.filter(
        (part) => categoriesMentionedInText(part, unfilled).length === 0,
      );
      if (kept.length === 0) return "";
      const joined = kept.join("・");
      return trailingEtc ? `${joined}など` : joined;
    },
  );
}

function redactUnfilledPhrases(
  sentence: string,
  unfilled: LifestyleMentionCategory[],
): string {
  let next = redactUnfilledListSegments(sentence, unfilled);
  for (const category of unfilled) {
    for (const phrase of CATEGORY_REDACT_PHRASES[category]) {
      next = next.replace(new RegExp(escapeRegExp(phrase), "gu"), "");
    }
  }
  return next
    .replace(/(?:・|、){2,}/gu, "・")
    .replace(/^[・、\s]+|[・、\s]+$/gu, "")
    .replace(/、(?=など)/gu, "")
    .replace(/(?:^|[、])など[、]?/gu, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

function isSubstantiveSentence(text: string): boolean {
  const core = text.replace(/[。．！？、・\s]/gu, "");
  if (core.length < 6) return false;
  if (/^(?:など|の低さ|夜間|要素|複数|重な|確認|状態|項目|他の)+$/u.test(core)) {
    return false;
  }
  return /[ぁ-んァ-ン一-龥\d％%]/u.test(core);
}

/** 測定値ベースの短い説明へフォールバック（⑦ why 向け） */
export function buildMeasurementFallbackFromText(text: string): string | null {
  const spo2Value = text.match(/SpO[₂2]?\s*(\d{2,3})\s*[%％]?/i);
  if (spo2Value) {
    return `SpO₂${spo2Value[1]}%は酸素供給の指標で、覚醒や回復感に関わりやすいです。`;
  }
  if (/SpO[₂2]?/i.test(text)) {
    return "SpO₂は酸素供給の指標で、覚醒や回復感に関わりやすいです。";
  }
  if (/覚醒時間/u.test(text)) {
    return "覚醒時間は、夜間の休息の連続性を見る参考指標です。";
  }
  if (/HRV/u.test(text)) {
    return "HRVは、回復やストレスバランスの参考指標です。";
  }
  if (/睡眠時間/u.test(text)) {
    return "睡眠時間は、身体の回復の土台となる参考指標です。";
  }
  return null;
}

export type SanitizeLifestyleMentionMode = "strict" | "partial";

export type SanitizeLifestyleMentionOptions = {
  mode?: SanitizeLifestyleMentionMode;
};

function processLifestyleSentence(
  sentence: string,
  unfilled: LifestyleMentionCategory[],
  mode: SanitizeLifestyleMentionMode,
): string {
  if (!sentence.trim()) return "";
  if (sentenceIsSelfContradictoryLifestyle(sentence)) return "";

  if (mode === "strict") {
    return sentenceReferencesUnfilledCategory(sentence, unfilled) ? "" : sentence;
  }

  if (categoriesMentionedInText(sentence, unfilled).length === 0) {
    return sentence;
  }

  const redacted = redactUnfilledPhrases(sentence, unfilled);
  if (
    redacted &&
    categoriesMentionedInText(redacted, unfilled).length === 0 &&
    isSubstantiveSentence(redacted)
  ) {
    return redacted.endsWith("。") ? redacted : `${redacted}。`;
  }

  const fallback = buildMeasurementFallbackFromText(sentence);
  if (fallback) return fallback;

  return "";
}

/** 未入力カテゴリに触れる文を処理。strict=文削除、partial=語句除去→再構成 */
export function stripUnfilledLifestyleSentences(
  text: string,
  unfilled: LifestyleMentionCategory[],
  options?: SanitizeLifestyleMentionOptions,
): string {
  if (!text.trim()) return text;
  const mode = options?.mode ?? "strict";
  const parts = text
    .split(/(?<=[。．！？\n])/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const kept = parts
    .map((part) => processLifestyleSentence(part, unfilled, mode))
    .filter(Boolean);
  return kept.join("").trim();
}

/** PDF⑥⑦向け: 未入力言及と自己矛盾を除去 */
export function sanitizeLifestyleMentionText(
  text: string,
  unfilled: LifestyleMentionCategory[],
  options?: SanitizeLifestyleMentionOptions,
): string {
  if (!text.trim()) return text;
  return stripUnfilledLifestyleSentences(text, unfilled, options);
}

function extractScoreHint(text: string, axisJa: string): string | null {
  const re = new RegExp(`${axisJa}\\s*(\\d{1,3})\\s*点`);
  const m = text.match(re);
  return m ? m[1]! : null;
}

export function fallbackLifestyleSafeText(
  field: LifestyleMentionField,
  previousText: string,
): string {
  switch (field) {
    case "profileRelation":
      return "今回は生活習慣の記録が少ないため、測定データ中心の参考見解です。";
    case "summary":
      return "今回は測定データを中心に評価しています。生活習慣の詳細入力があれば、次回以降より個別に整理できます。";
    case "scoreComment":
      return "今回の Sleep Wellness Score は測定データを中心に評価しています。生活習慣の詳細が揃うと、生活軸の根拠もより明確になります。";
    case "categoryScoreRationales.body": {
      const n = extractScoreHint(previousText, "身体");
      return n
        ? `身体${n}点は、睡眠時間・効率など身体回復の測定指標を中心に評価した参考値です。`
        : "身体の点数は、睡眠時間・効率など身体回復の測定指標を中心に評価した参考値です。";
    }
    case "categoryScoreRationales.mind": {
      const n = extractScoreHint(previousText, "心");
      return n
        ? `心${n}点は、HRV・ストレスなど測定指標を中心に評価した参考値です。`
        : "心の点数は、HRV・ストレスなど測定指標を中心に評価した参考値です。";
    }
    case "categoryScoreRationales.lifestyle": {
      const n = extractScoreHint(previousText, "生活");
      return n
        ? `生活${n}点は、生活習慣の詳細入力が少ないため、測定データとのバランスから付けた参考値です。未入力の習慣は評価根拠に含めていません。`
        : "生活の点数は、生活習慣の詳細入力が少ないため、測定データとのバランスから付けた参考値です。未入力の習慣は評価根拠に含めていません。";
    }
    case "categoryScoreRationales.environment": {
      const n = extractScoreHint(previousText, "環境");
      return n
        ? `環境${n}点は、体内時計など入力のある環境要因を反映した参考値です。`
        : "環境の点数は、体内時計など入力のある環境要因を反映した参考値です。";
    }
  }
}

/**
 * 再生成後も未入力言及が残る場合のフォールバック。
 * 文削除を試し、空なら安全文へ差し替え。
 */
export function sanitizeLifestyleMentionsInRecord(
  record: Record<string, unknown>,
  unfilled: LifestyleMentionCategory[],
): void {
  if (unfilled.length === 0) return;
  for (const field of GUARDED_FIELDS) {
    const previous = readField(record, field);
    if (!previous.trim()) continue;
    if (categoriesMentionedInText(previous, unfilled).length === 0) continue;
    const stripped = sanitizeLifestyleMentionText(previous, unfilled);
    writeField(
      record,
      field,
      stripped || fallbackLifestyleSafeText(field, previous),
    );
  }
}

export function formatUnfilledCategoriesForPrompt(
  unfilled: LifestyleMentionCategory[],
): string {
  return unfilled.map((c) => CATEGORY_LABEL_JA[c]).join("・");
}

export function buildLifestyleMentionRewriteInstructions(
  unfilled: LifestyleMentionCategory[],
): string {
  const names = formatUnfilledCategoriesForPrompt(unfilled);
  return `あなたは Sleep Wellness Institute Japan の文章校正者です。
与えられたフィールドを、次の制約を満たす日本語に書き直してください。

【絶対禁止】
- 次の項目は記録がないため、一切言及しないこと: ${names}
- 「していない」「多い」「摂らない」「不規則」など、未記録項目の有無・量を断定しない
- 固定プロフィールに無い飲酒・食事・勤務を捏造しない

【必須】
- 入力がある測定データ（睡眠時間・効率・HRV 等）だけを根拠にする
- 生活習慣が空の場合は「記録が少ないため測定データ中心の参考見解」と述べてよい
- 医療診断表現禁止。「可能性があります」トーンを保つ
- categoryScoreRationales がある場合、各文に「身体XX点」等の確定点数を維持する（点数自体は変えない）

出力は JSON のみ。渡されたキーだけを含める。`;
}

export type LifestyleRewritePayload = Partial<{
  summary: string;
  scoreComment: string;
  profileRelation: string;
  categoryScoreRationales: Partial<{
    body: string;
    mind: string;
    lifestyle: string;
    environment: string;
  }>;
}>;

/** 再生成結果を record にマージ（渡されたキーのみ） */
export function applyLifestyleRewritePayload(
  record: Record<string, unknown>,
  payload: LifestyleRewritePayload,
): void {
  if (typeof payload.summary === "string" && payload.summary.trim()) {
    record.summary = payload.summary.trim();
  }
  if (typeof payload.scoreComment === "string" && payload.scoreComment.trim()) {
    record.scoreComment = payload.scoreComment.trim();
  }
  if (
    typeof payload.profileRelation === "string" &&
    payload.profileRelation.trim()
  ) {
    writeField(record, "profileRelation", payload.profileRelation.trim());
  }
  if (
    payload.categoryScoreRationales &&
    typeof payload.categoryScoreRationales === "object"
  ) {
    for (const key of ["body", "mind", "lifestyle", "environment"] as const) {
      const value = payload.categoryScoreRationales[key];
      if (typeof value === "string" && value.trim()) {
        writeField(
          record,
          `categoryScoreRationales.${key}`,
          value.trim(),
        );
      }
    }
  }
}

/** 再生成 API に渡す現行文のスナップショット */
export function snapshotLifestyleGuardedFields(
  record: Record<string, unknown>,
  hits: LifestyleMentionHit[],
): LifestyleRewritePayload {
  const payload: LifestyleRewritePayload = {};
  const fields = new Set(hits.map((h) => h.field));
  if (fields.has("summary")) {
    payload.summary = readField(record, "summary");
  }
  if (fields.has("scoreComment")) {
    payload.scoreComment = readField(record, "scoreComment");
  }
  if (fields.has("profileRelation")) {
    payload.profileRelation = readField(record, "profileRelation");
  }
  const rationaleKeys = (
    ["body", "mind", "lifestyle", "environment"] as const
  ).filter((key) => fields.has(`categoryScoreRationales.${key}`));
  if (rationaleKeys.length > 0) {
    payload.categoryScoreRationales = {};
    for (const key of rationaleKeys) {
      payload.categoryScoreRationales[key] = readField(
        record,
        `categoryScoreRationales.${key}`,
      );
    }
  }
  return payload;
}

/** improvements 配列の未入力言及を除去（PDF⑦の元データ） */
export function sanitizeImprovementsInRecord(
  record: Record<string, unknown>,
  unfilled: LifestyleMentionCategory[],
): void {
  if (unfilled.length === 0 || !Array.isArray(record.improvements)) return;
  record.improvements = record.improvements
    .map((item) => {
      if (typeof item === "string") {
        return sanitizeLifestyleMentionText(item, unfilled);
      }
      if (!item || typeof item !== "object") return item;
      const next = { ...(item as Record<string, unknown>) };
      for (const key of ["text", "whyNow", "title", "reason", "action"]) {
        if (typeof next[key] === "string") {
          const original = next[key] as string;
          const mode =
            key === "reason" || key === "whyNow" ? "partial" : "strict";
          const sanitized = sanitizeLifestyleMentionText(original, unfilled, {
            mode,
          });
          if (
            (key === "reason" || key === "whyNow") &&
            !sanitized.trim()
          ) {
            next[key] =
              buildMeasurementFallbackFromText(original) ??
              "今回の測定データから優先しています。";
          } else {
            next[key] = sanitized;
          }
        }
      }
      return next;
    })
    .filter((item) => {
      if (typeof item === "string") return item.trim().length > 0;
      if (item && typeof item === "object") {
        const text = (item as { text?: string }).text;
        return typeof text !== "string" || text.trim().length > 0;
      }
      return true;
    });
}
