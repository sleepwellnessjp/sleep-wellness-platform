/**
 * 仕事の環境・特徴（職業名より優先して保存する）
 * 固定プロフィールのトグル一覧（当日の状態は day_context）
 */

export const WORK_ENVIRONMENT_ATTRIBUTES = [
  { id: "sitting_work", label: "座り仕事" },
  { id: "standing_work", label: "立ち仕事" },
  { id: "walking_work", label: "歩く仕事" },
  { id: "heavy_labor", label: "重労働" },
  { id: "pc_work", label: "パソコン作業" },
  { id: "smartphone_work", label: "スマートフォン作業" },
  { id: "interpersonal", label: "対人対応" },
  {
    id: "heat_high",
    label: "高温環境（ホットヨガ・サウナ・厨房など）",
  },
  { id: "humidity_high", label: "湿度が高い" },
  { id: "cold_low", label: "寒い環境" },
  { id: "outdoor_work", label: "屋外" },
  { id: "fire_oven", label: "火・炉・オーブンの近く" },
  { id: "smoke_exposure", label: "煙が多い" },
  { id: "dust_exposure", label: "粉塵が多い" },
  { id: "noise", label: "騒音がある" },
  { id: "early_shift", label: "早朝勤務" },
  { id: "night_shift", label: "夜間勤務" },
  { id: "limited_breaks", label: "休憩が取りにくい" },
  { id: "moves_immediately", label: "終了後すぐに移動した" },
] as const;

export type WorkEnvironmentAttributeId =
  (typeof WORK_ENVIRONMENT_ATTRIBUTES)[number]["id"];

/** 職業プリセット選択時に環境属性へ展開（AIには職業名を渡さない） */
export const OCCUPATION_PRESET_TO_ATTRIBUTES: Record<string, string[]> = {
  事務職: ["sitting_work", "pc_work"],
  デスクワーク: ["sitting_work", "pc_work", "smartphone_work"],
  営業: ["walking_work", "interpersonal", "smartphone_work"],
  接客業: ["standing_work", "interpersonal"],
  看護師: ["standing_work", "walking_work", "night_shift", "interpersonal"],
  介護士: ["standing_work", "walking_work", "heavy_labor", "interpersonal"],
  医師: ["standing_work", "night_shift", "interpersonal"],
  保育士: ["standing_work", "walking_work", "interpersonal"],
  幼稚園教諭: ["standing_work", "walking_work", "interpersonal"],
  学校教諭: ["standing_work", "interpersonal", "pc_work"],
  調理師: ["standing_work", "heat_high", "fire_oven", "humidity_high"],
  パン職人: ["standing_work", "heat_high", "fire_oven", "dust_exposure", "early_shift"],
  ガラス職人: ["standing_work", "heat_high", "fire_oven"],
  焼き鳥店の焼き手: ["standing_work", "heat_high", "fire_oven", "smoke_exposure"],
  鰻店の焼き手: ["standing_work", "heat_high", "fire_oven", "smoke_exposure"],
  厨房スタッフ: ["standing_work", "heat_high", "humidity_high", "fire_oven"],
  ラーメン店の調理担当: ["standing_work", "heat_high", "humidity_high", "fire_oven"],
  中華料理店の調理担当: ["standing_work", "heat_high", "fire_oven", "smoke_exposure"],
  "サウナ、温浴施設スタッフ": ["standing_work", "heat_high", "humidity_high"],
  ホットヨガ講師: ["standing_work", "heat_high", "humidity_high"],
  // 旧プリセット名（既存データ互換）
  ホットヨガインストラクター: [
    "standing_work",
    "heat_high",
    "humidity_high",
  ],
  常温ヨガ講師: ["standing_work"],
  マットピラティス講師: ["standing_work"],
  マシンピラティス講師: ["standing_work"],
  岩盤浴施設スタッフ: ["standing_work", "heat_high"],
  "製鉄、鋳造、溶接関係": [
    "standing_work",
    "heat_high",
    "fire_oven",
    "smoke_exposure",
    "noise",
  ],
  クリーニング工場: ["standing_work", "heat_high", "humidity_high"],
  ボイラー室勤務: ["standing_work", "heat_high", "noise"],
  建設作業: ["outdoor_work", "heavy_labor", "noise", "dust_exposure"],
  警備: ["standing_work", "night_shift", "outdoor_work"],
  "配送、運転": ["sitting_work", "moves_immediately"],
  屋外作業: ["outdoor_work", "heat_high", "cold_low"],
  工場勤務: ["standing_work", "noise", "dust_exposure"],
};

export function attributeLabel(id: string): string {
  const found = WORK_ENVIRONMENT_ATTRIBUTES.find((item) => item.id === id);
  return found?.label ?? id;
}

/** プリセット由来の属性を既存選択へマージ（既存選択を消さない） */
export function mergeAttributesFromOccupationPreset(
  preset: string,
  currentIds: string[] | undefined,
): string[] {
  const suggested = OCCUPATION_PRESET_TO_ATTRIBUTES[preset] ?? [];
  return Array.from(new Set([...(currentIds ?? []), ...suggested]));
}
