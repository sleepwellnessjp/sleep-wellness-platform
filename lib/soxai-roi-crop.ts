/**
 * SOXAI ROI 切り出し（サーバ側 sharp）。
 * 画像全体ではなく、画面種別ごとの読み取り領域だけを Vision に渡す。
 */

import sharp from "sharp";
import {
  CLASSIFY_ROI,
  getRoisForScreen,
  roiRectToPixels,
  type SoxaiRoiDef,
} from "@/lib/soxai-roi-map";
import type { SoxaiScreenType } from "@/lib/soxai-screen";

const JPEG_QUALITY = 88;
/** ROI は拡大して数字を読みやすくする（長辺） */
const ROI_MAX_EDGE = 1280;

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m?.[1] || !m[2]) {
    throw new Error("ROI crop: invalid image data URL");
  }
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
}

export type CroppedRoi = {
  roi: SoxaiRoiDef;
  dataUrl: string;
  pixel: { left: number; top: number; width: number; height: number };
};

async function cropOne(
  buffer: Buffer,
  metaW: number,
  metaH: number,
  roi: SoxaiRoiDef,
): Promise<CroppedRoi> {
  const pixel = roiRectToPixels(roi.rect, metaW, metaH);
  let pipeline = sharp(buffer).extract({
    left: pixel.left,
    top: pixel.top,
    width: pixel.width,
    height: pixel.height,
  });

  const edge = Math.max(pixel.width, pixel.height);
  if (edge < ROI_MAX_EDGE && edge > 0) {
    const scale = ROI_MAX_EDGE / edge;
    pipeline = pipeline.resize({
      width: Math.round(pixel.width * scale),
      height: Math.round(pixel.height * scale),
      fit: "fill",
      kernel: "lanczos3",
    });
  }

  const out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  return {
    roi,
    dataUrl: `data:image/jpeg;base64,${out.toString("base64")}`,
    pixel,
  };
}

/**
 * 指定画面の ROI をすべて切り出す。
 */
export async function cropScreenRois(
  imageDataUrl: string,
  screenType: SoxaiScreenType,
): Promise<CroppedRoi[]> {
  const { buffer } = parseDataUrl(imageDataUrl);
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("ROI crop: cannot read image dimensions");
  }

  const defs = getRoisForScreen(screenType);
  const crops: CroppedRoi[] = [];
  for (const def of defs) {
    try {
      crops.push(await cropOne(buffer, width, height, def));
    } catch (error) {
      console.warn("[soxai-roi] crop failed", {
        screenType,
        roiId: def.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return crops;
}

/** 画面種別判定用ヘッダー切り出し */
export async function cropClassifyRoi(
  imageDataUrl: string,
): Promise<CroppedRoi | null> {
  try {
    const { buffer } = parseDataUrl(imageDataUrl);
    const meta = await sharp(buffer).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) return null;
    return await cropOne(buffer, width, height, CLASSIFY_ROI);
  } catch (error) {
    console.warn("[soxai-roi] classify crop failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** テスト・デバッグ用: 矩形計算のみ */
export function previewRoiPixels(
  screenType: SoxaiScreenType,
  width: number,
  height: number,
): Array<{ id: string; left: number; top: number; width: number; height: number }> {
  return getRoisForScreen(screenType).map((def) => ({
    id: def.id,
    ...roiRectToPixels(def.rect, width, height),
  }));
}
