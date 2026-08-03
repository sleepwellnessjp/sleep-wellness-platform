/**
 * SOXAI ROI OCR 用プロンプトと結果結合ヘルパ。
 * 画像全体は読まない。切り出し領域に見える数値だけを返す。
 */

import type { SoxaiRoiDef } from "@/lib/soxai-roi-map";
import type { SoxaiScreenType } from "@/lib/soxai-screen";
import { SOXAI_SCREEN_LABELS } from "@/lib/soxai-screen";

export function classifyScreenPrompt(): string {
  return `これは SOXAI アプリのスクリーンショットの「ヘッダー＋上部コンテンツ」切り出しです。
大きな数値の精密読みは不要です。見出しとタブから screenType だけを判定して返してください。

判定優先順:
1. 見出し「皮膚温度」→ skin_temp
2. 見出し「ストレス」→ stress
3. 見出し「心拍変動」または「平均HRV」→ hrv
4. 見出し「安静時心拍数」または「呼吸速度」または「平均酸素レベル」→ respiration（安静時が主なら rhr でも可）
5. 「覚醒」「レム睡眠」「浅い睡眠」「深い睡眠」の行 → sleep_stages
6. 「睡眠効率」「入眠潜時」「睡眠負債」「体内時計」→ sleep_detail
7. 「入眠時間」「起床時間」が主 → bed_wake
8. タブ「概要」＋ QoL/昨日/睡眠/体調 → home
9. 「睡眠スコア」中心 → sleep_overview
10. それ以外 → other

visibleReadings には判定に使った見出しだけを短く入れてよい（値は空や概略でよい）。
graphReadings は空配列。`;
}

export function roiOcrPrompt(params: {
  screenType: SoxaiScreenType;
  roi: SoxaiRoiDef;
  imageIndex: number;
  total: number;
}): string {
  const screenLabel = SOXAI_SCREEN_LABELS[params.screenType];
  const focuses = params.roi.focusLabels.join(" / ") || "見える数値すべて";
  return `SOXAI専用OCR（切り出し領域のみ・画像全体は見ない）。
元スクショ ${params.total}枚中 ${params.imageIndex + 1}枚目。
確定 screenType: 「${params.screenType}」（${screenLabel}）
切り出し領域: 「${params.roi.label}」（id=${params.roi.id}）

【この切り出しだけを読む】
探す見出し: ${focuses}

指示:
${params.roi.promptHint}

厳守ルール:
- この切り出しに実際に見えるラベル+数値だけを visibleReadings に返す
- 見えない項目は省略する（空値や仮の値を作らない）
- 数値の推測・補完・計算・他画面の知識の持ち込みは禁止
- 「NN%」「H:MM」「例」などのプレースホルダ文字列を値にしてはいけない
- 右端の昨日比較（↑↓隣の小さな値）は捨てる
- 単位（% / bpm / ms / rpm / ℃）が画像に付いていれば値に含める
- screenType は必ず「${params.screenType}」を返す
- graphReadings は空配列`;
}
