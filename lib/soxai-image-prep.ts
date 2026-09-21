/**
 * OpenAI Vision へ送る前に画像を縮小・JPEG 圧縮し、入力トークンを抑える。
 * ブラウザ専用（canvas）。失敗時は元の data URL を返す。
 *
 * - default: 長辺 1024 / JPEG 0.78（従来どおり）
 * - heart_hrv: 長辺 1536 / JPEG 0.9（安静時心拍・HRV の小文字を残す）
 */

export type ImagePrepProfile = "default" | "heart_hrv";

export const IMAGE_PREP_PROFILES = {
  default: { maxEdgePx: 1024, jpegQuality: 0.78 },
  heart_hrv: { maxEdgePx: 1536, jpegQuality: 0.9 },
} as const satisfies Record<
  ImagePrepProfile,
  { maxEdgePx: number; jpegQuality: number }
>;

export type PreparedImageMeta = {
  index: number;
  section: string;
  profile: ImagePrepProfile;
  maxEdgePx: number;
  jpegQuality: number;
  /** data URL の概算バイト（base64 から推定、画像本体のみ） */
  bytes: number;
  dataUrlChars: number;
};

function loadDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    image.src = dataUrl;
  });
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  // base64 → 概算バイト
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

export function prepProfileForSection(
  section: string | undefined | null,
): ImagePrepProfile {
  return section === "heart_hrv" ? "heart_hrv" : "default";
}

/**
 * Vision 送信用に長辺を抑え JPEG 化する。
 * サーバー側や canvas 不可環境では入力をそのまま返す。
 */
export async function prepareImageForOcr(
  dataUrl: string,
  profile: ImagePrepProfile = "default",
): Promise<string> {
  if (typeof document === "undefined") return dataUrl;
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(dataUrl)) {
    return dataUrl;
  }

  const { maxEdgePx, jpegQuality } = IMAGE_PREP_PROFILES[profile];

  try {
    const image = await loadDataUrl(dataUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return dataUrl;

    const scale = Math.min(1, maxEdgePx / Math.max(width, height));
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    // すでに十分小さく JPEG の場合は再エンコードを省略（default プロファイルのみ）
    if (
      profile === "default" &&
      scale >= 0.98 &&
      /^data:image\/jpe?g;base64,/i.test(dataUrl) &&
      dataUrl.length < 350_000
    ) {
      return dataUrl.replace(/^data:image\/jpg;base64,/i, "data:image/jpeg;base64,");
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, outW, outH);
    const compressed = canvas.toDataURL("image/jpeg", jpegQuality);
    if (!compressed.startsWith("data:image/jpeg")) return dataUrl;
    // 圧縮で肥大化した場合は元を採用
    return compressed.length < dataUrl.length ? compressed : dataUrl;
  } catch {
    return dataUrl;
  }
}

export async function prepareImagesForOcr(images: string[]): Promise<string[]> {
  return Promise.all(images.map((image) => prepareImageForOcr(image)));
}

/**
 * セクションに応じた圧縮プロファイルで Vision 送信用画像を準備する。
 */
export async function prepareSoxaiImagesForVision(
  images: string[],
  sections: Array<string | ""> = [],
): Promise<{ prepared: string[]; metas: PreparedImageMeta[] }> {
  const prepared = await Promise.all(
    images.map((image, index) => {
      const section = sections[index] ?? "";
      const profile = prepProfileForSection(section);
      return prepareImageForOcr(image, profile);
    }),
  );

  const metas: PreparedImageMeta[] = prepared.map((dataUrl, index) => {
    const section = String(sections[index] ?? "");
    const profile = prepProfileForSection(section);
    const cfg = IMAGE_PREP_PROFILES[profile];
    return {
      index,
      section: section || "unknown",
      profile,
      maxEdgePx: cfg.maxEdgePx,
      jpegQuality: cfg.jpegQuality,
      bytes: estimateDataUrlBytes(dataUrl),
      dataUrlChars: dataUrl.length,
    };
  });

  return { prepared, metas };
}
