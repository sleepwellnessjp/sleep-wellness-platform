/**
 * SOXAI 専用 OCR の画面別読み取り領域（ROI）マップ。
 * 座標は画像全体に対する正規化 [0,1]（左上原点）。
 * iPhone 縦スクショ（ステータスバー〜下部タブ）の固定レイアウト想定。
 *
 * 方針:
 * - 画像全体は OCR しない（画面種別ごとに固定 ROI を切り出して別 OCR）
 * - 各 ROI は「その切り出しに見える数値だけ」を対象（推測禁止）
 */

import type { MetricFieldKey } from "@/lib/soxai-metrics";
import type { SoxaiScreenType } from "@/lib/soxai-screen";

export type SoxaiRoiRect = {
  /** 左端 0–1 */
  x: number;
  /** 上端 0–1 */
  y: number;
  /** 幅 0–1 */
  w: number;
  /** 高さ 0–1 */
  h: number;
};

export type SoxaiRoiDef = {
  id: string;
  /** 人間向けラベル */
  label: string;
  rect: SoxaiRoiRect;
  /** この領域で取るべき見出し */
  focusLabels: string[];
  /** 対応メトリクス（ログ・優先度用） */
  focusKeys: MetricFieldKey[];
  /** Vision への短い指示 */
  promptHint: string;
};

function roi(
  id: string,
  label: string,
  rect: SoxaiRoiRect,
  focusLabels: string[],
  focusKeys: MetricFieldKey[],
  promptHint: string,
): SoxaiRoiDef {
  return { id, label, rect, focusLabels, focusKeys, promptHint };
}

const VISIBLE_ONLY =
  "切り出し内に実際に印刷されているラベルと数値だけを返す。見えなければその項目は省略。数値の推測・補完・例示値のコピーは禁止。";

/**
 * 睡眠系は固定2 ROIのみ（別々に OCR → 既存パイプラインで JSON 統合）。
 * ① 入眠・起床・潜時
 * ② 覚醒率・レム・レム率・ノンレム（深い睡眠）・ノンレム率
 */
const ROI_SLEEP_BED_WAKE_LATENCY: SoxaiRoiDef = roi(
  "roi_bed_wake_latency",
  "①入眠・起床・潜時",
  // 睡眠カード右の HH:mm|HH:mm 〜 トレンドの入眠潜時までをカバー
  { x: 0.0, y: 0.2, w: 1.0, h: 0.55 },
  [
    "就寝時刻",
    "起床時刻",
    "入眠時間",
    "起床時間",
    "入眠潜時",
    "入眠",
    "起床",
    "就寝",
  ],
  ["bedtime", "wakeTime", "sleepLatency"],
  `${VISIBLE_ONLY}
対象はこの3つだけ（ラベル表記ゆれ・ラベル無しの両方）:
- 就寝時刻 / 入眠時間: 睡眠カード（大きな「○h ○○min 睡眠」）の右側に縦並びの HH:mm の「上」
- 起床時刻 / 起床時間: 同・縦並びの「下」
- 入眠潜時（大きな主値。下の小さな比較値は捨てる）

重要:
- 就寝/起床は見出し文字が無いことが多い。縦並び HH:mm を見たら必ず
  上→ラベル「就寝時刻」、下→ラベル「起床時刻」として visibleReadings に返す
- 「HH:mm - HH:mm」「HH:mm | HH:mm」「HH:mm / HH:mm」なら左/上が就寝、右/下が起床
- 睡眠ステージ帯グラフ両端の HH:mm（左端=就寝、右端=起床）も同じラベルで返す
- 「全就床時間」の値・入眠潜時の 0:MM・グラフ軸目盛だけを就寝/起床にしてはいけない
覚醒・レム・深い睡眠・睡眠効率・全就床・スコアは返さない。`,
);

const ROI_SLEEP_STAGES_CORE: SoxaiRoiDef = roi(
  "roi_sleep_stages_core",
  "②覚醒・レム・浅い・深い",
  // 下方向へ拡張し、深い睡眠行まで完全に含める（浅い睡眠の取りこぼし禁止）
  { x: 0.0, y: 0.12, w: 1.0, h: 0.86 },
  [
    "覚醒",
    "覚醒率",
    "覚醒時間",
    "レム睡眠",
    "レム睡眠率",
    "浅い睡眠",
    "浅い睡眠率",
    "深い睡眠",
    "深い睡眠率",
  ],
  [
    "awakeningRate",
    "awakenings",
    "remSleep",
    "remSleepRate",
    "lightSleep",
    "lightSleepRate",
    "deepSleep",
    "deepSleepRate",
    "nonRemSleep",
    "nonRemSleepRate",
  ],
  `${VISIBLE_ONLY}
対象はこの画面のステージ行だけ（4行すべて必須・見逃し禁止）:
- 覚醒率（%）と覚醒時間
- レム睡眠率（%）とレム睡眠（時間）
- 浅い睡眠率（%）と浅い睡眠（時間）※「浅い睡眠」行を省略しない
- 深い睡眠率（%）と深い睡眠（時間）
各行はラベル直後の%と時間を別エントリで返す。右端の昨日比較（↑↓隣）は捨てる。
入眠・起床・潜時・酸素・グラフ軸は返さない。浅い睡眠は必ず返す。`,
);

/** 睡眠系画面に共通で載せる2 ROI（順序固定・別 OCR） */
const SLEEP_TWO_ROIS: SoxaiRoiDef[] = [
  ROI_SLEEP_BED_WAKE_LATENCY,
  ROI_SLEEP_STAGES_CORE,
];

/**
 * 睡眠概要: スコア直下の睡眠時間 + 睡眠トレンド上段の全就床時間。
 * 旧 ROI（h≈0.42）では「睡眠トレンド」の全就床カードが切り出し外だった。
 */
const ROI_SLEEP_OVERVIEW_DURATION: SoxaiRoiDef = roi(
  "roi_sleep_overview_duration",
  "睡眠スコア・睡眠時間・全就床時間",
  // スコア円〜睡眠トレンドの全就床カードまで（入眠潜時手前）
  { x: 0.02, y: 0.1, w: 0.96, h: 0.62 },
  ["睡眠スコア", "睡眠時間", "睡眠", "全就床時間", "全就床"],
  ["sleepScore", "sleepDuration", "timeInBed"],
  `${VISIBLE_ONLY}
対象:
- 睡眠スコア（大きな円の中心値。0–100）
- 見出し「睡眠時間」の値（時間と分の表記）。必ず label「睡眠時間」で返す
- 見出し「全就床時間」（睡眠トレンド内のベッドアイコンカード）。主値のみ。必ず label「全就床時間」で返す（下段の小さな比較値は捨てる）
禁止:
- 「必要睡眠時間」「目標達成率」「全就床時間」「ベッド滞在」を睡眠時間にしない
- 「睡眠時間」を全就床時間にしない（別エントリ）
- 就寝時刻・起床時刻・入眠潜時は返さない（別画面）
- 睡眠時間の値を就寝時刻にしてはいけない`,
);

/** 睡眠詳細トレンド: 効率・負債・潜時・体内時計・総睡眠・全就床・入眠/起床 */
const ROI_SLEEP_DETAIL_TRENDS: SoxaiRoiDef = roi(
  "roi_sleep_detail_trends",
  "睡眠詳細トレンド",
  { x: 0.02, y: 0.06, w: 0.96, h: 0.86 },
  [
    "睡眠時間",
    "睡眠",
    "全就床時間",
    "全就床",
    "睡眠効率",
    "睡眠負債",
    "入眠潜時",
    "体内時計",
    "就寝時刻",
    "起床時刻",
  ],
  [
    "sleepDuration",
    "timeInBed",
    "sleepEfficiency",
    "sleepDebt",
    "sleepLatency",
    "circadianRhythm",
    "bedtime",
    "wakeTime",
  ],
  `${VISIBLE_ONLY}
対象（見えるものだけ・ラベルは画面表記どおり）:
- 睡眠時間: 見出し「睡眠時間」、または大きな「○h ○○min 睡眠」カードの主値 → label「睡眠時間」
- 全就床時間: 見出し「全就床時間」の主値 → label「全就床時間」（必須。下段の小さな比較値は捨てる）
- 睡眠効率（%）: 見出し「睡眠効率」のみ。覚醒率と取り違えない
- 睡眠負債 / 入眠潜時 / 体内時計
- 就寝時刻・起床時刻: 睡眠カード右の縦並び HH:mm（上=就寝、下=起床）
禁止:
- 全就床時間・必要睡眠時間を睡眠時間にしない
- 睡眠時間を全就床時間にしない（別エントリ）
- 睡眠効率の%を覚醒率にしない
- 右端の昨日比較（↑↓隣）は捨てる`,
);

/** heart_hrv スロット用: 上部の酸素・呼吸・安静時（単体 ROI に統合済みのため参照用に残さない） */

/** 画面種別判定用（タブ・見出しの手がかり。数値精密読みは不要） */
export const CLASSIFY_ROI: SoxaiRoiDef = roi(
  "classify_header",
  "ヘッダー／タブ／上部コンテンツ",
  { x: 0.0, y: 0.02, w: 1.0, h: 0.45 },
  [
    "概要",
    "睡眠",
    "体調",
    "運動",
    "皮膚温度",
    "ストレス",
    "安静時心拍",
    "心拍変動",
    "呼吸速度",
    "平均酸素",
    "覚醒",
    "レム",
    "浅い睡眠",
    "深い睡眠",
    "入眠潜時",
    "睡眠効率",
    "全就床時間",
  ],
  [],
  "タブと見出しだけから screenType を判定する。数値の精密読みは不要。",
);

/**
 * 画面種別ごとの固定 ROI。
 * - sleep_stages / bed_wake: 入眠潜時＋ステージの2 ROI
 * - sleep_overview / sleep_detail: 睡眠時間・効率など画面固有 ROI
 * - hrv（UIの heart_hrv=呼吸・心拍）: 酸素・呼吸・安静時＋HRV
 */
export const SOXAI_SCREEN_ROIS: Record<SoxaiScreenType, SoxaiRoiDef[]> = {
  // —— ホーム／概要 ——
  home: [
    roi(
      "home_qol_ring",
      "QoL円と昨日スコア",
      { x: 0.05, y: 0.14, w: 0.9, h: 0.28 },
      ["QoL", "昨日のスコア", "現在のスコア"],
      ["qol", "yesterdayQol"],
      `${VISIBLE_ONLY} QoL円の中心値と昨日のスコアだけ。`,
    ),
    roi(
      "home_category_scores",
      "睡眠・体調スコア行",
      { x: 0.02, y: 0.38, w: 0.96, h: 0.16 },
      ["睡眠", "体調", "運動"],
      ["sleepScore", "conditionScore"],
      `${VISIBLE_ONLY} 「睡眠」「体調」のスコア（0–100）。睡眠時間は取らない。`,
    ),
  ],

  // —— 睡眠概要: 睡眠時間を落とさない ——
  sleep_overview: [ROI_SLEEP_OVERVIEW_DURATION],
  // —— 睡眠詳細: 効率・負債・潜時・総睡眠 ——
  sleep_detail: [ROI_SLEEP_DETAIL_TRENDS],
  bed_wake: SLEEP_TWO_ROIS,
  sleep_stages: SLEEP_TWO_ROIS,

  circadian: [
    roi(
      "circadian_main",
      "体内時計",
      { x: 0.04, y: 0.18, w: 0.92, h: 0.45 },
      ["体内時計"],
      ["circadianRhythm"],
      `${VISIBLE_ONLY} 体内時計の位相差表示だけ。`,
    ),
  ],

  stress: [
    roi(
      "stress_value",
      "ストレス値",
      { x: 0.08, y: 0.18, w: 0.84, h: 0.4 },
      ["ストレス", "ストレスモニター"],
      ["stress"],
      `${VISIBLE_ONLY} 明示されているストレス数値だけ。`,
    ),
  ],

  // —— 呼吸画面（変更なし） ——
  respiration: [
    roi(
      "resp_spo2",
      "平均酸素レベル",
      { x: 0.02, y: 0.12, w: 0.96, h: 0.2 },
      ["平均酸素レベル", "酸素"],
      ["spo2"],
      `${VISIBLE_ONLY} 平均酸素レベル（%）だけ。`,
    ),
    roi(
      "resp_rate",
      "呼吸速度",
      { x: 0.02, y: 0.28, w: 0.96, h: 0.16 },
      ["呼吸速度"],
      ["respiratoryRate"],
      `${VISIBLE_ONLY} 「呼吸速度」の数値だけ（rpm可）。`,
    ),
    roi(
      "resp_rhr",
      "安静時心拍",
      { x: 0.1, y: 0.42, w: 0.8, h: 0.22 },
      ["安静時心拍数", "平均", "最小"],
      ["restingHeartRate", "restingHeartRateMin"],
      `${VISIBLE_ONLY} 安静時心拍の平均・最小が見えるときだけ。取り違えない。見えなければ省略。`,
    ),
  ],

  // —— 心拍（安静時）画面（変更なし） ——
  rhr: [
    roi(
      "rhr_header_values",
      "安静時心拍の数値",
      { x: 0.1, y: 0.16, w: 0.8, h: 0.28 },
      ["安静時心拍数", "平均", "最小", "最大"],
      ["restingHeartRate", "restingHeartRateMin", "restingHeartRateMax"],
      `${VISIBLE_ONLY} 安静時心拍の平均・最小・最大が見えるものだけ。グラフ軸は取らない。`,
    ),
    roi(
      "rhr_resp_above",
      "同画面の呼吸・酸素",
      { x: 0.02, y: 0.08, w: 0.96, h: 0.2 },
      ["平均酸素レベル", "呼吸速度"],
      ["spo2", "respiratoryRate"],
      `${VISIBLE_ONLY} 酸素・呼吸速度が見えるときだけ。`,
    ),
  ],

  // —— HRV / heart_hrv（呼吸・酸素・安静時が同居。ROI過多は55s壁時計超過の原因） ——
  hrv: [
    roi(
      "hrv_vitals_full",
      "呼吸・酸素・安静時・HRV",
      { x: 0.02, y: 0.08, w: 0.96, h: 0.82 },
      [
        "平均酸素レベル",
        "呼吸速度",
        "安静時心拍数",
        "安静時心拍数平均",
        "安静時心拍数最小",
        "平均",
        "最小",
        "心拍変動",
        "平均HRV",
        "最大HRV",
        "最小HRV",
      ],
      [
        "spo2",
        "respiratoryRate",
        "restingHeartRate",
        "restingHeartRateMin",
        "restingHeartRateMax",
        "hrv",
        "hrvMax",
        "hrvMin",
      ],
      `${VISIBLE_ONLY}
この切り出しに見える指標をラベルごとに全部返す（1指標に限定しない）:
- 平均酸素レベル / SpO₂（%）→ label「平均酸素レベル」
- 呼吸速度（rpm）→ label「呼吸速度」
- 安静時心拍数カード:
  - 小さめ「平均 NN」→ label「安静時心拍数平均」（bpm。ms禁止）
  - 大きめ「最小 NN bpm」→ label「安静時心拍数最小」
- 心拍変動カード:
  - 平均HRV（ms）→ label「平均HRV」
  - 最大 / 最小が見えれば最大HRV・最小HRV（ms）
bpm と ms を取り違えない。見えなければその項目は省略。`,
    ),
  ],

  skin_temp: [
    roi(
      "skin_primary",
      "皮膚温度の最新値",
      { x: 0.1, y: 0.12, w: 0.8, h: 0.26 },
      ["皮膚温度", "最新の変化"],
      ["skinTemperature"],
      `${VISIBLE_ONLY} 最新の変化（℃）だけ。説明文は無視。`,
    ),
  ],

  other: [
    roi(
      "other_upper",
      "上部コンテンツ",
      { x: 0.04, y: 0.12, w: 0.92, h: 0.35 },
      [],
      [],
      `${VISIBLE_ONLY} 見える指標のラベルと数値だけ。`,
    ),
    roi(
      "other_lower",
      "中〜下部コンテンツ",
      { x: 0.04, y: 0.4, w: 0.92, h: 0.4 },
      [],
      [],
      `${VISIBLE_ONLY} 見える指標のラベルと数値だけ。`,
    ),
  ],
};

export function getRoisForScreen(screenType: SoxaiScreenType): SoxaiRoiDef[] {
  return SOXAI_SCREEN_ROIS[screenType] ?? SOXAI_SCREEN_ROIS.other;
}

/** 正規化 ROI をピクセル矩形へ（はみ出しクリップ） */
export function roiRectToPixels(
  rect: SoxaiRoiRect,
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } {
  const left = Math.max(0, Math.floor(rect.x * width));
  const top = Math.max(0, Math.floor(rect.y * height));
  const right = Math.min(width, Math.ceil((rect.x + rect.w) * width));
  const bottom = Math.min(height, Math.ceil((rect.y + rect.h) * height));
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}
