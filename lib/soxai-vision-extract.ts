/**
 * SOXAI Vision 抽出のプロンプト・重要項目判定・テレメトリ（PII / 画像なし）。
 * API ルートと検証スクリプトから共用する。
 */

import type { SoxaiExtractSection } from "@/lib/soxai-ocr-runner";
import type { SoxaiVision24 } from "@/lib/soxai-vision-schema";

export const SOXAI_VISION_SECTION_LABELS: Record<
  SoxaiExtractSection,
  string
> = {
  home: "概要",
  stress: "ストレス",
  sleep_overview: "睡眠概要",
  sleep_detail: "睡眠詳細",
  sleep_stages: "睡眠ステージ",
  circadian: "体内時計",
  respiration: "呼吸",
  heart_hrv: "呼吸・心拍",
  skin_temp: "皮膚温",
};

const VALID_SECTIONS = new Set<string>(
  Object.keys(SOXAI_VISION_SECTION_LABELS),
);

/** 空なら 1 回だけ再読み取りする Vision キー（一括。心拍系は専用パスで上書き） */
export const SOXAI_VISION_CRITICAL_KEYS = [
  "restingHeartRateAvg",
  "hrvAvg",
  "sleepDuration",
  "awakeDuration",
  "sleepDebt",
  "bedTime",
  "wakeTime",
] as const satisfies ReadonlyArray<keyof SoxaiVision24>;

/** 一括パスの再読み取り対象（心拍・HRV は heart_hrv 専用パスに任せる） */
export const SOXAI_VISION_BULK_RETRY_KEYS = [
  "sleepDuration",
  "awakeDuration",
  "sleepDebt",
  "bedTime",
  "wakeTime",
] as const satisfies ReadonlyArray<keyof SoxaiVision24>;

export type SoxaiVisionCriticalKey =
  (typeof SOXAI_VISION_CRITICAL_KEYS)[number];

export type SoxaiVisionBulkRetryKey =
  (typeof SOXAI_VISION_BULK_RETRY_KEYS)[number];

export type HeartHrvDedicatedStatus =
  | "success"
  | "empty"
  | "error"
  | "timeout"
  | "skipped";

/** 専用パスの入力選定 */
export type HeartHrvDedicatedMode = "slot" | "label_fallback" | "none";

export type SoxaiVisionImageSizeTelemetry = {
  index: number;
  section: string;
  profile: string;
  maxEdgePx: number;
  jpegQuality: number;
  bytes: number;
  dataUrlChars: number;
};

export type SoxaiVisionTelemetry = {
  imageCount: number;
  sections: Array<SoxaiExtractSection | "">;
  hasHeartHrv: boolean;
  heartHrvDedicatedPass: boolean;
  heartHrvImageCount: number;
  heartHrvDedicatedStatus: HeartHrvDedicatedStatus;
  heartHrvDedicatedError: string | null;
  heartHrvDedicatedDurationMs: number | null;
  /** slot: heart_hrv スロット画像 / label_fallback: 全画像をラベル探索 */
  heartHrvDedicatedMode: HeartHrvDedicatedMode;
  bulkDurationMs: number | null;
  totalDurationMs: number | null;
  restingHeartRateAvg: string | null;
  restingHeartRateMin: string | null;
  restingHeartRateMax: string | null;
  hrvAvg: string | null;
  hrvMax: string | null;
  bedTime: string | null;
  wakeTime: string | null;
  imageSizes: SoxaiVisionImageSizeTelemetry[];
  emptyCriticalKeys: SoxaiVisionCriticalKey[];
  retried: boolean;
  retryFilledKeys: SoxaiVisionCriticalKey[];
};

export function normalizeVisionSections(
  raw: unknown,
  imageCount: number,
): Array<SoxaiExtractSection | ""> {
  if (!Array.isArray(raw)) {
    return Array.from({ length: imageCount }, () => "" as const);
  }
  return Array.from({ length: imageCount }, (_, index) => {
    const value = raw[index];
    if (typeof value !== "string") return "" as const;
    const trimmed = value.trim();
    if (!VALID_SECTIONS.has(trimmed)) return "" as const;
    return trimmed as SoxaiExtractSection;
  });
}

function isBlankVisionValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value !== "string") return true;
  return value.trim().length === 0;
}

export function emptyCriticalVisionKeys(
  vision: SoxaiVision24,
): SoxaiVisionCriticalKey[] {
  return SOXAI_VISION_CRITICAL_KEYS.filter((key) =>
    isBlankVisionValue(vision[key]),
  );
}

export function emptyBulkRetryVisionKeys(
  vision: SoxaiVision24,
): SoxaiVisionBulkRetryKey[] {
  return SOXAI_VISION_BULK_RETRY_KEYS.filter((key) =>
    isBlankVisionValue(vision[key]),
  );
}

/** 2 回目で埋まった重要キー（1 回目が空で 2 回目が非空） */
export function retryFilledCriticalKeys(
  first: SoxaiVision24,
  second: SoxaiVision24,
): SoxaiVisionCriticalKey[] {
  return SOXAI_VISION_CRITICAL_KEYS.filter(
    (key) =>
      isBlankVisionValue(first[key]) && !isBlankVisionValue(second[key]),
  );
}

export function retryFilledBulkKeys(
  first: SoxaiVision24,
  second: SoxaiVision24,
): SoxaiVisionBulkRetryKey[] {
  return SOXAI_VISION_BULK_RETRY_KEYS.filter(
    (key) =>
      isBlankVisionValue(first[key]) && !isBlankVisionValue(second[key]),
  );
}

/**
 * 再読み取り結果をマージ。各キーは「非空を優先、両方非空なら 2 回目」。
 */
export function mergeVisionPreferFilled(
  first: SoxaiVision24,
  second: SoxaiVision24,
): SoxaiVision24 {
  const merged = { ...first };
  for (const key of Object.keys(first) as Array<keyof SoxaiVision24>) {
    const a = first[key];
    const b = second[key];
    if (!isBlankVisionValue(b)) {
      (merged as Record<string, unknown>)[key] = b;
    } else if (!isBlankVisionValue(a)) {
      (merged as Record<string, unknown>)[key] = a;
    } else {
      (merged as Record<string, unknown>)[key] = null;
    }
  }
  return merged;
}

/**
 * 先に入った非空を保ち、空欄だけ後続で埋める（専用パスの複数クロップ用）。
 */
export function mergeVisionFillBlanksOnly(
  first: SoxaiVision24,
  second: SoxaiVision24,
): SoxaiVision24 {
  const merged = { ...first };
  for (const key of Object.keys(first) as Array<keyof SoxaiVision24>) {
    if (
      isBlankVisionValue(merged[key]) &&
      !isBlankVisionValue(second[key])
    ) {
      (merged as Record<string, unknown>)[key] = second[key];
    }
  }
  return merged;
}

export function buildSoxaiVisionTelemetry(params: {
  imageCount: number;
  sections: Array<SoxaiExtractSection | "">;
  vision: SoxaiVision24;
  retried: boolean;
  retryFilledKeys?: SoxaiVisionCriticalKey[];
  heartHrvDedicatedPass?: boolean;
  heartHrvImageCount?: number;
  heartHrvDedicatedStatus?: HeartHrvDedicatedStatus;
  heartHrvDedicatedError?: string | null;
  heartHrvDedicatedDurationMs?: number | null;
  heartHrvDedicatedMode?: HeartHrvDedicatedMode;
  bulkDurationMs?: number | null;
  totalDurationMs?: number | null;
  imageSizes?: SoxaiVisionImageSizeTelemetry[];
}): SoxaiVisionTelemetry {
  const { vision } = params;
  const mode = params.heartHrvDedicatedMode ?? "none";
  return {
    imageCount: params.imageCount,
    sections: [...params.sections],
    hasHeartHrv:
      params.sections.includes("heart_hrv") || mode === "label_fallback",
    heartHrvDedicatedPass: params.heartHrvDedicatedPass === true,
    heartHrvImageCount: params.heartHrvImageCount ?? 0,
    heartHrvDedicatedStatus: params.heartHrvDedicatedStatus ?? "skipped",
    heartHrvDedicatedError: params.heartHrvDedicatedError ?? null,
    heartHrvDedicatedDurationMs: params.heartHrvDedicatedDurationMs ?? null,
    heartHrvDedicatedMode: mode,
    bulkDurationMs: params.bulkDurationMs ?? null,
    totalDurationMs: params.totalDurationMs ?? null,
    restingHeartRateAvg:
      vision.restingHeartRateAvg == null
        ? null
        : String(vision.restingHeartRateAvg),
    restingHeartRateMin:
      vision.restingHeartRateMin == null
        ? null
        : String(vision.restingHeartRateMin),
    restingHeartRateMax:
      vision.restingHeartRateMax == null
        ? null
        : String(vision.restingHeartRateMax),
    hrvAvg: vision.hrvAvg == null ? null : String(vision.hrvAvg),
    hrvMax: vision.hrvMax == null ? null : String(vision.hrvMax),
    bedTime: vision.bedTime == null ? null : String(vision.bedTime),
    wakeTime: vision.wakeTime == null ? null : String(vision.wakeTime),
    imageSizes: params.imageSizes ? [...params.imageSizes] : [],
    emptyCriticalKeys: emptyCriticalVisionKeys(vision),
    retried: params.retried,
    retryFilledKeys: params.retryFilledKeys ?? [],
  };
}

export function buildVisionPrompt(
  imageCount: number,
  sections: Array<SoxaiExtractSection | ""> = [],
): string {
  const sectionLines =
    sections.length === imageCount && sections.some((s) => s)
      ? sections
          .map((section, index) => {
            const label = section
              ? SOXAI_VISION_SECTION_LABELS[section] ?? section
              : "（種別未指定）";
            const id = section || "unknown";
            return `- 画像${index + 1}: ${label}（section=${id}）`;
          })
          .join("\n")
      : `- 各画像の種別は未指定。画面見出しから判断すること`;

  return `あなたは SOXAI Ring アプリのスクリーンショット解析器です。
${imageCount}枚の画像を横断して読み、見える数値だけを JSON にまとめてください。

画像と画面種別の対応（この順番どおり）:
${sectionLines}
- heart_hrv（呼吸・心拍）の画像では、安静時心拍・HRV・呼吸・SpO₂ を優先して読む
- sleep_overview（睡眠概要）では、就寝時刻・起床時刻を読む。bedTime は就寝時刻、wakeTime は起床時刻。入眠潜時・覚醒時間・グラフ端点は使わない
- sleep_detail では睡眠負債・体内時計を優先して読む
- sleep_stages では覚醒・レム・浅い・深いの行を優先して読む

ルール:
- 捏造禁止。画像に無い項目は null
- 単位が画面にあれば値に含める（%、bpm、ms、rpm、℃、時間分 など）
- 入眠時間(bedTime)と入眠潜時(sleepLatency)を取り違えない
- 起床時間(wakeTime)と覚醒時間(awakeDuration)を取り違えない
- 睡眠時間(sleepDuration)と全就床時間(timeInBed)を取り違えない（別項目）
- 全就床時間(timeInBed): 見出し「全就床時間」の主値（例: 5:47）。下段の小さな比較値は捨てる。見えるときは省略禁止
- 睡眠効率(sleepEfficiency)と覚醒率(awakePercent)を取り違えない
- 安静時心拍(bpm)とHRV(ms)を取り違えない
- 概要の「心拍数」カード（最新値の下の小さな数字など）は安静時心拍数ではない。restingHeartRate* に入れない
- 平均 / 最小 / 最大の割り当て（安静時心拍・心拍変動の両方）:
  - 数字の大きさや画面上の位置では判断しない
  - 数値のすぐそばに書かれたラベル文字だけで決める
    - 「平均」→ Avg（restingHeartRateAvg / hrvAvg）
    - 「最小」→ Min（restingHeartRateMin / hrvMin）
    - 「最大」→ Max（restingHeartRateMax / hrvMax）
  - 例: 安静時は大きな数字が「最小」、小さな枠が「平均」のことがある
  - 例: 心拍変動は大きな数字が「平均」、小さな枠が「最大」のことがある
  - ラベルが無い数値は入れない。平均が見えなければ Avg は null（Min/Max で代用しない）
  - 画面に Max（または Min）が出ていないときは、そのキーは null のまま（捏造しない）
- 睡眠負債(sleepDebt)と体内時計の位相差(circadianShift):
  - 画面にマイナス記号（− / -）があれば、必ず符号付きで返す（例: -1:30, -0:28）
  - 符号を落とさない。画面に符号が無いときだけ符号なしでよい
- 平均酸素レベルは spo2
- 呼吸速度は respirationRate
- 体内時計の位相差は circadianShift
- ホーム画面のスコアはそれぞれ独立。互いに流用・コピーしてはならない:
  - sleepScore → 見出し「睡眠」行、または睡眠画面のスコア
  - conditionScore → 見出し「体調」「体調スコア」
  - qol → 「QoL」「現在のスコア」などの QoL 円／ラベルが画面にあるときだけ
  - yesterdayQol → 「昨日のスコア」「昨日のQoL」
- QoL の円や「QoL」ラベルが画面に存在しない場合、qol は必ず null（SOXAIアップデートで QoL 表示が消えているケースがある）
- 同じ数値を sleepScore / conditionScore / qol / yesterdayQol の複数キーに入れない（偶然の一致でも、見出しが無いキーは null）
- 睡眠ステージは画面の行どおりに分ける（合算・言い換え禁止）:
  - 「覚醒」行 → awakeDuration / awakePercent
  - 「レム睡眠」行 → remDuration / remPercent
  - 「浅い睡眠」行 → lightSleepDuration / lightSleepPercent
  - 「深い睡眠」行 → deepSleepDuration / deepSleepPercent
- 浅い睡眠をノンレムにしない。深い睡眠をノンレムにしない。合算しない
- breathingEvents が見えなければ null

必須キー（すべて返す）:
sleepScore, qol, yesterdayQol, conditionScore, sleepDuration, timeInBed, sleepEfficiency,
sleepDebt, bedTime, wakeTime, sleepLatency, awakeDuration, awakePercent,
remDuration, remPercent, lightSleepDuration, lightSleepPercent,
deepSleepDuration, deepSleepPercent, restingHeartRateAvg, restingHeartRateMin,
restingHeartRateMax, respirationRate, spo2, hrvAvg, hrvMin, hrvMax, stress,
skinTemperature, circadianShift, breathingEvents`;
}

/**
 * heart_hrv 専用パス用。安静時心拍・心拍変動の見出し枠内だけを読む。
 * 画像は切り取りせず全体を渡す。複数枚ある場合はすべて見る。
 * labelFallback: スロット不明時。全画像から見出しラベルで枠を探す。
 */
export function buildHeartHrvVisionPrompt(
  imageCount: number,
  options?: { labelFallback?: boolean },
): string {
  const intro = options?.labelFallback
    ? `あなたは SOXAI Ring 画面の心拍系ラベル探索器です。
画面種別（スロット）は不明です。${imageCount}枚すべてを見て、
見出し「安静時心拍数」「心拍変動」（または「HRV」）のカード枠だけを探して読んでください。
該当見出しが無い画像は無視し、見つかった枠の数値だけを集約してください。`
    : `あなたは SOXAI Ring の「呼吸・心拍」画面専用の読み取り器です。
${imageCount}枚の画像をすべて見てください（切り取りなし・全画面）。
安静時心拍数と心拍変動が別スクショに分かれている場合も、全枚から集約してください。`;

  return `${intro}

厳守（これ以外はすべて無視）:
1. 「安静時心拍数」見出しのカード枠の中だけ
   - 灰色の小さい枠に「平均」と並ぶ数字（例: 平均51）→ restingHeartRateAvg
   - 「最小」の下の大きな数字 → restingHeartRateMin
   - 「最大」があれば restingHeartRateMax、無ければ null
2. 「心拍変動」見出しのカード枠の中だけ
   - 「平均」→ hrvAvg / 「最大」→ hrvMax / 「最小」→ hrvMin
3. 禁止（絶対に使わない）:
   - 折れ線グラフ・点・塗りつぶしの高さ
   - Y軸・X軸の目盛り（40/45/50/55/60/65 など）
   - 枠外の数値（平均酸素・呼吸速度・他カード・他画面）
   - ラベル無しの数字（概要の「心拍数」カードの下段数字など）
4. 数字の大きさや位置だけでは Avg/Min/Max を決めない。ラベル文字だけで決める
5. 「平均」ラベル付きのテキストが読めないときは restingHeartRateAvg / hrvAvg は null（グラフから推測して埋めない）
6. 捏造禁止。単位があれば含める（bpm / ms）

必須キー:
restingHeartRateAvg, restingHeartRateMin, restingHeartRateMax,
hrvAvg, hrvMin, hrvMax`;
}
