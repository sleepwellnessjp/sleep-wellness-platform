/**
 * Sleep Wellness Method™ ヨガ案内コンテンツ。
 *
 * 正式テキスト（間のヨガ / メラトニンヨガ）を後から差し込める構造。
 * 現段階は詳細ルール未実装のため、デモ用の安全な共通案内のみ返す。
 * Phase名・ポーズ名・具体呼吸法の推測追加は行わない。
 */

export type SwmYogaContentSource = "demo_safe" | "official_text";

export type SwmYogaGuidance = {
  id: "aidano_day" | "melatonin_night";
  brandName: string;
  /** 本日の推奨内容（短い見出し） */
  recommendation: string;
  purpose: string;
  timeOfDay: string;
  durationHint: string;
  awarenessPoint: string;
  sleepConnection: string;
  instructorTip: string;
  source: SwmYogaContentSource;
  /** 正式テキスト未接続のとき true */
  isDemoFallback: boolean;
};

/**
 * 将来: アップロード済み正式テキストをここに読み込む。
 * 現状は null（未接続）→ デモ安全案内へフォールバック。
 */
export function loadOfficialAidaNoYogaText(): string | null {
  return null;
}

export function loadOfficialMelatoninYogaText(): string | null {
  return null;
}

const DEMO_AIDANO: SwmYogaGuidance = {
  id: "aidano_day",
  brandName: "間のヨガ™",
  recommendation: "日中に短時間の間のヨガ™を実施する",
  purpose: "活動と休息の切り替えを整え、午後の集中力を保つ",
  timeOfDay: "昼食後〜16時",
  durationHint: "8〜12分",
  awarenessPoint:
    "動作と動作のあいだ、呼吸のあいだを丁寧に感じ、意識の切り替えを大切にする",
  sleepConnection:
    "日中のリズムを整えることで、夜の入眠と睡眠効率の改善につながる",
  instructorTip:
    "昼と夜を別メニューとして終わらせず、24時間の流れの一部として案内してください。",
  source: "demo_safe",
  isDemoFallback: true,
};

const DEMO_MELATONIN: SwmYogaGuidance = {
  id: "melatonin_night",
  brandName: "メラトニンヨガ™",
  recommendation: "就寝前にメラトニンヨガ™を実施する",
  purpose: "心身を活動状態から休息状態へ切り替える",
  timeOfDay: "就寝の30〜60分前",
  durationHint: "10〜15分",
  awarenessPoint: "刺激を増やさず、呼吸と動きを穏やかに整え、入眠を急がない",
  sleepConnection:
    "休息への切り替えを丁寧に行い、深い眠りの土台をつくる",
  instructorTip:
    "夜の実践は入眠を急がせず、休息への切り替えとして伝えてください。",
  source: "demo_safe",
  isDemoFallback: true,
};

/** 間のヨガ™（昼）— 正式テキストがあれば将来ここで解釈 */
export function getAidaNoYogaGuidance(): SwmYogaGuidance {
  const official = loadOfficialAidaNoYogaText();
  if (official && official.trim()) {
    return { ...DEMO_AIDANO, source: "official_text", isDemoFallback: false };
  }
  return DEMO_AIDANO;
}

/** メラトニンヨガ™（夜）— 正式テキストがあれば将来ここで解釈 */
export function getMelatoninYogaGuidance(): SwmYogaGuidance {
  const official = loadOfficialMelatoninYogaText();
  if (official && official.trim()) {
    return {
      ...DEMO_MELATONIN,
      source: "official_text",
      isDemoFallback: false,
    };
  }
  return DEMO_MELATONIN;
}
