/**
 * SOXAI 専用 OCR の画面別読み取り領域（ROI）マップ。
 * 座標は画像全体に対する正規化 [0,1]（左上原点）。
 * iPhone 縦スクショ（ステータスバー〜下部タブ）の固定レイアウト想定。
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

/** 画面種別判定用（タブ・見出し＋中央コンテンツの手がかり） */
export const CLASSIFY_ROI: SoxaiRoiDef = roi(
  "classify_header",
  "ヘッダー／タブ／中央コンテンツ",
  { x: 0.0, y: 0.02, w: 1.0, h: 0.58 },
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
    "深い睡眠",
    "入眠潜時",
    "睡眠効率",
    "入眠時間",
    "起床時間",
  ],
  [],
  "タブの選択状態と見える見出しから screenType を判定する。入眠潜時/睡眠効率/睡眠負債→sleep_detail。覚醒・レム・浅い・深いの行→sleep_stages。入眠時間/起床時間や HH:mm-HH:mm→bed_wake。大きな数値の精密読みは不要（見出しだけでよい）。",
);

/**
 * 画面種別ごとの数値ROI。
 * 数字取得率優先のため、比較列・説明文・グラフ軸はできるだけ外す。
 */
export const SOXAI_SCREEN_ROIS: Record<SoxaiScreenType, SoxaiRoiDef[]> = {
  home: [
    roi(
      "home_scores",
      "ホームスコアカード",
      { x: 0.02, y: 0.14, w: 0.96, h: 0.42 },
      ["QoL", "昨日のスコア", "睡眠", "体調", "心拍数"],
      ["qol", "yesterdayQol", "sleepScore", "conditionScore"],
      "各カードの見出しとその直下／右の大きな数値だけ。睡眠はスコア（0–100）。睡眠時間はここから取らない。",
    ),
  ],
  sleep_overview: [
    roi(
      "overview_score_duration",
      "睡眠スコアと睡眠時間",
      { x: 0.02, y: 0.12, w: 0.96, h: 0.38 },
      ["睡眠スコア", "睡眠時間", "睡眠"],
      ["sleepScore", "sleepDuration"],
      "睡眠スコアと見出し「睡眠時間」の値だけ。全就床時間は睡眠時間にしない。",
    ),
    roi(
      "overview_bed_wake_range",
      "入眠・起床の時刻帯",
      { x: 0.4, y: 0.42, w: 0.56, h: 0.18 },
      ["入眠時間", "起床時間", "睡眠"],
      ["bedtime", "wakeTime"],
      "睡眠カード右の「HH:mm - HH:mm」（例 02:10 - 07:57）を必ず {label:\"入眠時間\",value:\"HH:mm\"} と {label:\"起床時間\",value:\"HH:mm\"} の2件で返す。潜時・就床時間は取らない。",
    ),
    roi(
      "overview_latency_trends",
      "入眠潜時などトレンド",
      { x: 0.0, y: 0.52, w: 1.0, h: 0.36 },
      ["入眠潜時", "睡眠効率", "睡眠負債", "全就床時間"],
      ["sleepLatency", "sleepEfficiency", "sleepDebt"],
      "カード見出しとその大きな主値だけ。入眠潜時は主値（例 0:30）。下の小さな比較値は捨てる。入眠潜時を入眠時間にしない。",
    ),
  ],
  sleep_detail: [
    roi(
      "detail_bed_wake_range",
      "入眠・起床の時刻帯",
      { x: 0.35, y: 0.16, w: 0.62, h: 0.2 },
      ["入眠時間", "起床時間", "睡眠"],
      ["bedtime", "wakeTime"],
      "「HH:mm - HH:mm」形式（例 02:10 - 07:57）を入眠時間・起床時間の2件で返す。潜時・全就床は取らない。",
    ),
    roi(
      "detail_metric_rows",
      "睡眠詳細メトリクス行",
      { x: 0.0, y: 0.28, w: 1.0, h: 0.55 },
      [
        "睡眠時間",
        "全就床時間",
        "入眠潜時",
        "睡眠効率",
        "睡眠負債",
        "体内時計",
        "入眠時間",
        "起床時間",
      ],
      [
        "sleepDuration",
        "sleepLatency",
        "sleepEfficiency",
        "sleepDebt",
        "circadianRhythm",
        "bedtime",
        "wakeTime",
      ],
      "各カードの左ラベルと大きな主値だけ。下段の小さな比較値（昨日差）は捨てる。入眠潜時≠入眠時間。全就床≠睡眠時間。HH:mm-HH:mm があれば入眠時間/起床時間として返す。",
    ),
  ],
  bed_wake: [
    roi(
      "bed_wake_times",
      "入眠・起床",
      { x: 0.05, y: 0.18, w: 0.9, h: 0.5 },
      ["入眠時間", "起床時間", "入眠", "起床", "睡眠"],
      ["bedtime", "wakeTime", "sleepLatency"],
      "入眠時間と起床時間の HH:mm。範囲「HH:mm - HH:mm」は左が入眠・右が起床。入眠潜時が見えれば主値だけ取る。覚醒時間は取らない。",
    ),
  ],
  sleep_stages: [
    roi(
      "stages_awake_rem",
      "覚醒・レム行",
      { x: 0.0, y: 0.12, w: 1.0, h: 0.28 },
      ["覚醒", "覚醒率", "覚醒時間", "レム睡眠", "レム睡眠率"],
      ["awakenings", "awakeningRate", "remSleep", "remSleepRate"],
      "各行は必ず2件: {label:\"覚醒率\",value:\"NN%\"} と {label:\"覚醒時間\",value:\"H:MM\"}、{label:\"レム睡眠率\",value:\"NN%\"} と {label:\"レム睡眠\",value:\"H:MM\"}。%はラベル直後の値。右端の昨日比較（↑↓隣）は捨てる。",
    ),
    roi(
      "stages_light_deep",
      "浅い・深い（ノンレム）行",
      { x: 0.0, y: 0.32, w: 1.0, h: 0.32 },
      ["浅い睡眠", "深い睡眠", "深い睡眠率", "ノンレム睡眠", "ノンレム睡眠率"],
      [
        "lightSleep",
        "lightSleepRate",
        "deepSleep",
        "deepSleepRate",
        "nonRemSleep",
        "nonRemSleepRate",
      ],
      "深い睡眠行は必ず {label:\"深い睡眠率\",value:\"NN%\"} と {label:\"深い睡眠\",value:\"H:MM\"}。浅い睡眠も同様に率と時間。右端の昨日比較は捨てる。グラフ軸の数字は取らない。",
    ),
    roi(
      "stages_spo2",
      "平均酸素レベル",
      { x: 0.04, y: 0.58, w: 0.92, h: 0.3 },
      ["平均酸素レベル", "酸素", "SpO2", "平常"],
      ["spo2"],
      "平均酸素レベル（%）だけ。説明文は無視。「--」なら省略。",
    ),
  ],
  circadian: [
    roi(
      "circadian_main",
      "体内時計",
      { x: 0.04, y: 0.18, w: 0.92, h: 0.5 },
      ["体内時計", "遅れ", "進み"],
      ["circadianRhythm"],
      "体内時計の位相差・遅れ/進みの表示値だけ。",
    ),
  ],
  stress: [
    roi(
      "stress_value",
      "ストレス値",
      { x: 0.08, y: 0.18, w: 0.84, h: 0.45 },
      ["ストレス", "平均ストレス", "ストレスレベル"],
      ["stress"],
      "明示されているストレス数値だけ。平均の捏造禁止。",
    ),
  ],
  respiration: [
    roi(
      "resp_spo2_rr",
      "酸素と呼吸速度",
      { x: 0.02, y: 0.12, w: 0.96, h: 0.32 },
      ["平均酸素レベル", "呼吸速度", "酸素"],
      ["spo2", "respiratoryRate"],
      "平均酸素レベル（%）と呼吸速度（rpm）だけ。説明文は無視。",
    ),
    roi(
      "resp_rhr_values",
      "安静時心拍の平均・最小",
      // 酸素・呼吸カードの下〜グラフ上端。大きな最小とバッジの平均だけを狙う
      { x: 0.12, y: 0.44, w: 0.76, h: 0.2 },
      ["安静時心拍数", "安静時心拍数平均", "安静時心拍数最小", "平均", "最小", "最大"],
      ["restingHeartRate", "restingHeartRateMin", "restingHeartRateMax"],
      "この切り出しは安静時心拍のみ。必ず次の形式で返す: {label:\"安静時心拍数平均\",value:\"NN\"} と {label:\"安静時心拍数最小\",value:\"NN bpm\"}。大きめ紫数字＝最小、その下の小さな「平均 NN」＝平均。平均と最小を取り違えない。呼吸速度・酸素は返さない。",
    ),
  ],
  rhr: [
    roi(
      "rhr_spo2_rr",
      "酸素と呼吸速度",
      { x: 0.02, y: 0.12, w: 0.96, h: 0.32 },
      ["平均酸素レベル", "呼吸速度"],
      ["spo2", "respiratoryRate"],
      "平均酸素レベルと呼吸速度が見えれば取る。",
    ),
    roi(
      "rhr_values",
      "安静時心拍の数値",
      { x: 0.12, y: 0.42, w: 0.76, h: 0.22 },
      ["安静時心拍数", "安静時心拍数平均", "安静時心拍数最小", "平均", "最小", "最大"],
      ["restingHeartRate", "restingHeartRateMin", "restingHeartRateMax"],
      "安静時心拍のみ。{label:\"安静時心拍数平均\",value:\"NN\"} と {label:\"安静時心拍数最小\",value:\"NN bpm\"} を必ず別エントリで。大きめ＝最小、小さめバッジ＝平均。",
    ),
  ],
  hrv: [
    roi(
      "hrv_values",
      "HRV平均・最大・最小",
      // 心拍変動カード上部の平均・最大・最小だけ（下の睡眠スコア棒は含めない）
      { x: 0.12, y: 0.15, w: 0.76, h: 0.26 },
      ["心拍変動", "平均HRV", "最大HRV", "最小HRV", "平均", "最大", "最小"],
      ["hrv", "hrvMax", "hrvMin"],
      "心拍変動のみ。必ず {label:\"平均HRV\",value:\"NN ms\"}（ms必須）。最大・最小が見えれば {label:\"最大HRV\",value:\"NN\"} / {label:\"最小HRV\",value:\"NN\"}。睡眠スコアの棒グラフ数字は取らない。",
    ),
  ],
  skin_temp: [
    roi(
      "skin_primary",
      "皮膚温度の最新値",
      { x: 0.1, y: 0.12, w: 0.8, h: 0.28 },
      ["皮膚温度", "最新の変化", "平均", "偏差"],
      ["skinTemperature"],
      "最新の変化（例: -0.9℃）または平均偏差。説明文は無視。",
    ),
  ],
  other: [
    roi(
      "other_content",
      "中央コンテンツ",
      { x: 0.04, y: 0.14, w: 0.92, h: 0.7 },
      [],
      [],
      "見える指標のラベルと数値だけ。推測禁止。",
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
