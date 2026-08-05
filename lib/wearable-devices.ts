/**
 * ウェアラブル機種マスタと必要画像セット。
 * SOXAI / Oura の既存解析 API 契約は変更しない（UI・割り当て用）。
 */

import type {
  WearableDevice,
  WearableDeviceConfig,
  WearableImageCategory,
  WearableRequiredImageSpec,
} from "@/lib/wearable-analysis";

const OURA_REQUIRED_IMAGES: readonly WearableRequiredImageSpec[] = [
  {
    category: "sleep_summary",
    label: "睡眠サマリー",
    description: "睡眠スコアと主要な睡眠指標が表示される画面",
    metrics: [
      "睡眠スコア",
      "合計睡眠時間",
      "睡眠効率",
      "REM睡眠",
      "深い睡眠",
      "入眠潜時",
    ],
    required: true,
    maxFiles: 2,
  },
  {
    category: "sleep_stages",
    label: "睡眠ステージ",
    description: "覚醒・REM・浅い睡眠・深い睡眠とグラフ",
    metrics: ["覚醒", "REM", "浅い睡眠", "深い睡眠", "睡眠グラフ"],
    required: true,
    maxFiles: 2,
  },
  {
    category: "heart_rate_hrv",
    label: "夜間の心拍・HRV",
    description: "夜間の心拍数と HRV の推移",
    metrics: [
      "最低心拍数",
      "平均心拍数",
      "平均HRV",
      "心拍グラフ",
      "HRVグラフ",
    ],
    required: true,
    maxFiles: 2,
  },
  {
    category: "key_metrics",
    label: "主要データ",
    description: "安静時心拍・HRV・体表温・呼吸などの主要指標",
    metrics: ["安静時心拍数", "HRV", "体表温変化", "呼吸速度"],
    required: true,
    maxFiles: 2,
  },
  {
    category: "daytime_stress",
    label: "日中のストレス",
    description: "日中のストレス・回復時間と時系列",
    metrics: ["ストレス時間", "回復時間", "時系列グラフ"],
    required: true,
    maxFiles: 2,
  },
  {
    category: "resilience",
    label: "レジリエンス",
    description: "データが蓄積されている利用者向け（任意）",
    metrics: ["レジリエンス指標（任意）"],
    required: false,
    maxFiles: 2,
  },
];

/** 既存 SOXAI_UPLOAD_SLOTS を同形式へ整理（仕様維持） */
const SOXAI_REQUIRED_IMAGES: readonly WearableRequiredImageSpec[] = [
  {
    category: "soxai_home",
    label: "概要",
    description: "QoL・睡眠・体調・運動のスコアが表示される画面",
    metrics: ["QoLスコア", "睡眠スコア", "体調スコア", "運動スコア"],
    required: false,
    maxFiles: 1,
    soxaiSection: "home",
  },
  {
    category: "soxai_stress",
    label: "ストレス",
    description: "ストレスのスコア・評価・推移が表示される画面",
    metrics: ["ストレススコア", "ストレス評価", "ストレス推移"],
    required: false,
    maxFiles: 1,
    soxaiSection: "stress",
  },
  {
    category: "soxai_sleep_overview",
    label: "睡眠概要",
    description: "睡眠スコアと睡眠全体サマリーが表示される画面",
    metrics: [
      "睡眠スコア",
      "睡眠時間",
      "必要睡眠時間",
      "目標達成率",
      "就寝時刻",
      "起床時刻",
      "仮眠時間",
      "全就床時間",
    ],
    required: false,
    maxFiles: 1,
    soxaiSection: "sleep_overview",
  },
  {
    category: "soxai_sleep_detail",
    label: "睡眠詳細",
    description: "睡眠の詳細指標が表示される画面",
    metrics: ["入眠潜時", "睡眠効率", "睡眠負債", "体内時計"],
    required: false,
    maxFiles: 1,
    soxaiSection: "sleep_detail",
  },
  {
    category: "soxai_sleep_stages",
    label: "睡眠ステージ",
    description: "睡眠ステージ内訳とグラフが表示される画面",
    metrics: [
      "覚醒時間と割合",
      "レム睡眠時間と割合",
      "浅い睡眠時間と割合",
      "深い睡眠時間と割合",
      "睡眠ステージグラフ",
    ],
    required: false,
    maxFiles: 2,
    soxaiSection: "sleep_stages",
  },
  {
    category: "soxai_heart_hrv",
    label: "呼吸・心拍",
    description: "呼吸・酸素・心拍・HRVが表示される画面",
    metrics: [
      "平均酸素レベル",
      "呼吸速度",
      "安静時心拍数の最小値",
      "安静時心拍数の平均値",
      "HRV平均値",
      "HRV最大値",
    ],
    required: false,
    maxFiles: 2,
    soxaiSection: "heart_hrv",
  },
  {
    category: "soxai_skin_temp",
    label: "皮膚温",
    description: "皮膚温の最新変化とグラフが表示される画面",
    metrics: ["皮膚温の最新変化", "皮膚温グラフ"],
    required: false,
    maxFiles: 1,
    soxaiSection: "skin_temp",
  },
];

export const WEARABLE_DEVICES: readonly WearableDeviceConfig[] = [
  {
    id: "soxai",
    displayName: "SOXAI RING",
    shortDescription: "SOXAIアプリ画面を種類ごとにアップロード",
    available: true,
    iconName: "ring-soxai",
    recommendedImageCount: 7,
    requiredImageKinds: SOXAI_REQUIRED_IMAGES,
    /** 既存仕様: 全スロット必須ではなく、合計1枚以上 */
    minTotalImages: 1,
  },
  {
    id: "oura",
    displayName: "Oura Ring",
    shortDescription: "必須5種類のスクリーンショットを割り当て",
    available: true,
    iconName: "ring-oura",
    recommendedImageCount: 5,
    requiredImageKinds: OURA_REQUIRED_IMAGES,
    minTotalImages: 5,
  },
  {
    id: "apple_watch",
    displayName: "Apple Watch",
    shortDescription: "ヘルスケア / 睡眠画面（準備中）",
    available: false,
    comingSoonLabel: "近日対応",
    iconName: "watch-apple",
    recommendedImageCount: 4,
    requiredImageKinds: [],
    minTotalImages: 0,
  },
  {
    id: "garmin",
    displayName: "Garmin",
    shortDescription: "Garmin Connect 画面（準備中）",
    available: false,
    comingSoonLabel: "近日対応",
    iconName: "watch-garmin",
    recommendedImageCount: 4,
    requiredImageKinds: [],
    minTotalImages: 0,
  },
  {
    id: "fitbit",
    displayName: "Fitbit",
    shortDescription: "Fitbit アプリ画面（準備中）",
    available: false,
    comingSoonLabel: "近日対応",
    iconName: "band-fitbit",
    recommendedImageCount: 4,
    requiredImageKinds: [],
    minTotalImages: 0,
  },
  {
    id: "other",
    displayName: "その他",
    shortDescription: "その他のウェアラブル（準備中）",
    available: false,
    comingSoonLabel: "近日対応",
    iconName: "device-other",
    recommendedImageCount: 3,
    requiredImageKinds: [],
    minTotalImages: 0,
  },
];

export function getWearableDeviceConfig(
  id: WearableDevice,
): WearableDeviceConfig | undefined {
  return WEARABLE_DEVICES.find((device) => device.id === id);
}

export function getRequiredImageSpecs(
  device: WearableDevice,
): readonly WearableRequiredImageSpec[] {
  return getWearableDeviceConfig(device)?.requiredImageKinds ?? [];
}

export function listMissingRequiredCategories(args: {
  device: WearableDevice;
  filledCategories: Iterable<WearableImageCategory>;
}): WearableRequiredImageSpec[] {
  const filled = new Set(args.filledCategories);
  return getRequiredImageSpecs(args.device).filter(
    (spec) => spec.required && !filled.has(spec.category),
  );
}

/** analysis/new の InputMethod との橋渡し（manual は別扱い） */
export type AnalysisInputMethod =
  | WearableDevice
  | "manual";

export function wearableToInputMethod(
  device: WearableDevice,
): AnalysisInputMethod {
  return device;
}

export function inputMethodToWearable(
  method: AnalysisInputMethod,
): WearableDevice | null {
  if (method === "manual") return null;
  return method;
}

/** 旧 InputMethod（apple / garmin）互換 */
export function legacyInputMethodToWearable(
  method: string,
): WearableDevice | "manual" | null {
  if (method === "manual") return "manual";
  if (method === "apple") return "apple_watch";
  if (
    method === "soxai" ||
    method === "oura" ||
    method === "garmin" ||
    method === "fitbit" ||
    method === "other" ||
    method === "apple_watch"
  ) {
    return method;
  }
  return null;
}
