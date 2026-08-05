/**
 * 複数メーカー対応のウェアラブル画像アップロード基盤（型定義）。
 * 分析ロジック本体は変更しない。UI / 割り当てメタデータ用。
 */

export type WearableDevice =
  | "soxai"
  | "oura"
  | "apple_watch"
  | "garmin"
  | "fitbit"
  | "other";

/** 将来の自動分類にも使える画像カテゴリ */
export type WearableImageCategory =
  | "sleep_summary"
  | "sleep_stages"
  | "heart_rate_hrv"
  | "key_metrics"
  | "daytime_stress"
  | "resilience"
  | "unknown"
  /** SOXAI 既存スロット（Vision 送信時は SoxaiExtractSection へ写像） */
  | "soxai_home"
  | "soxai_stress"
  | "soxai_sleep_overview"
  | "soxai_sleep_detail"
  | "soxai_sleep_stages"
  | "soxai_heart_hrv"
  | "soxai_skin_temp";

export type WearableImageStatus =
  | "empty"
  | "ready"
  | "uploading"
  | "classifying"
  | "error"
  | "assigned"
  | "candidate"
  | "needs_manual";

export type WearableUploadedImage = {
  id: string;
  file: File;
  previewUrl: string;
  deviceType: WearableDevice;
  imageCategory: WearableImageCategory;
  required: boolean;
  status: WearableImageStatus;
  confidence: number | null;
  errorMessage: string | null;
};

export type WearableRequiredImageSpec = {
  category: WearableImageCategory;
  label: string;
  description: string;
  metrics: readonly string[];
  required: boolean;
  /** 1カテゴリあたりの最大枚数 */
  maxFiles: number;
  /** SOXAI 既存セクション ID（soxai のみ） */
  soxaiSection?:
    | "home"
    | "stress"
    | "sleep_overview"
    | "sleep_detail"
    | "sleep_stages"
    | "heart_hrv"
    | "skin_temp";
};

export type WearableDeviceConfig = {
  id: WearableDevice;
  displayName: string;
  shortDescription: string;
  available: boolean;
  comingSoonLabel?: string;
  iconName: string;
  recommendedImageCount: number;
  requiredImageKinds: readonly WearableRequiredImageSpec[];
  /** デバイス全体で最低必要な枚数（SOXAIは1枚以上で可） */
  minTotalImages: number;
};

export const WEARABLE_MAX_IMAGES = 15;
export const WEARABLE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const WEARABLE_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const WEARABLE_ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp"] as const;

export function createWearableImageId(): string {
  return `wi-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isAllowedWearableImageFile(file: File): boolean {
  const mimeOk = (WEARABLE_ALLOWED_MIME as readonly string[]).includes(
    file.type,
  );
  const name = file.name.toLowerCase();
  const extOk = WEARABLE_ALLOWED_EXT.some((ext) => name.endsWith(ext));
  return mimeOk || extOk;
}

export type WearableUploadValidationResult = {
  accepted: File[];
  errors: string[];
};

/**
 * クライアント側の画像検証（形式・サイズ・総枚数・重複ファイル名）。
 */
export function validateWearableImageFiles(args: {
  incoming: File[];
  existing: File[];
  maxTotal?: number;
  maxBytes?: number;
}): WearableUploadValidationResult {
  const maxTotal = args.maxTotal ?? WEARABLE_MAX_IMAGES;
  const maxBytes = args.maxBytes ?? WEARABLE_MAX_FILE_BYTES;
  const errors: string[] = [];
  const accepted: File[] = [];
  const existingNames = new Set(
    args.existing.map((f) => f.name.toLowerCase()),
  );
  const batchNames = new Set<string>();

  for (const file of args.incoming) {
    if (!isAllowedWearableImageFile(file)) {
      errors.push(
        `「${file.name}」は対応していない形式です。PNG / JPG / JPEG / WEBP のみアップロードできます。`,
      );
      continue;
    }
    if (file.size > maxBytes) {
      errors.push(
        `「${file.name}」は ${(file.size / (1024 * 1024)).toFixed(1)}MB あり、上限（10MB）を超えています。`,
      );
      continue;
    }
    const key = file.name.toLowerCase();
    if (existingNames.has(key) || batchNames.has(key)) {
      errors.push(`「${file.name}」は既に選択されています（重複ファイル名）。`);
      continue;
    }
    if (args.existing.length + accepted.length >= maxTotal) {
      errors.push(`画像は最大${maxTotal}枚までです。`);
      break;
    }
    batchNames.add(key);
    accepted.push(file);
  }

  return { accepted, errors };
}

export function revokeWearablePreviewUrls(
  images: Iterable<WearableUploadedImage>,
): void {
  for (const image of images) {
    if (image.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(image.previewUrl);
    }
  }
}

export function toWearableUploadedImage(args: {
  file: File;
  deviceType: WearableDevice;
  imageCategory: WearableImageCategory;
  required: boolean;
}): WearableUploadedImage {
  return {
    id: createWearableImageId(),
    file: args.file,
    previewUrl: URL.createObjectURL(args.file),
    deviceType: args.deviceType,
    imageCategory: args.imageCategory,
    required: args.required,
    status: "ready",
    confidence: null,
    errorMessage: null,
  };
}
