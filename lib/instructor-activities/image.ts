import {
  ACTIVITY_IMAGE_MAX_BYTES,
  ACTIVITY_IMAGE_MAX_WIDTH,
  ACTIVITY_IMAGE_MIME_TYPES,
} from "@/lib/instructor-activities/types";

export type PreparedActivityImage = {
  blob: Blob;
  fileName: string;
  mimeType: "image/jpeg" | "image/webp" | "image/png";
};

function isAllowedMime(type: string): boolean {
  const normalized = type.toLowerCase() === "image/jpg" ? "image/jpeg" : type;
  return (ACTIVITY_IMAGE_MIME_TYPES as readonly string[]).includes(normalized);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました"));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("画像の圧縮に失敗しました"));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

/** バナー用に長辺を抑えつつ、画質を大きく落とさない圧縮 */
export async function prepareActivityImage(
  file: File,
): Promise<PreparedActivityImage> {
  if (!isAllowedMime(file.type)) {
    throw new Error("対応形式は JPG / JPEG / PNG / WebP のみです");
  }
  if (file.size > ACTIVITY_IMAGE_MAX_BYTES) {
    throw new Error(
      `画像が大きすぎます（上限 ${Math.round(ACTIVITY_IMAGE_MAX_BYTES / (1024 * 1024))}MB）`,
    );
  }

  const image = await loadImage(file);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (width < 64 || height < 64) {
    throw new Error("画像が小さすぎます（64px以上が必要です）");
  }

  // カード表示（4:3）に合わせて中央トリミングし、縦長・横長でも切れ方を揃える
  const targetRatio = 4 / 3;
  let sourceWidth = width;
  let sourceHeight = height;
  let sourceX = 0;
  let sourceY = 0;
  if (width / height > targetRatio) {
    sourceWidth = height * targetRatio;
    sourceX = (width - sourceWidth) / 2;
  } else {
    sourceHeight = width / targetRatio;
    sourceY = (height - sourceHeight) / 2;
  }

  const scale =
    sourceWidth > ACTIVITY_IMAGE_MAX_WIDTH
      ? ACTIVITY_IMAGE_MAX_WIDTH / sourceWidth
      : 1;
  const outW = Math.max(1, Math.round(sourceWidth * scale));
  const outH = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像の処理に失敗しました");
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outW,
    outH,
  );

  const preferJpeg = file.type !== "image/png";
  const mimeType = preferJpeg ? "image/jpeg" : "image/png";
  const blob = await canvasToBlob(canvas, mimeType, 0.86);
  const ext = mimeType === "image/png" ? "png" : "jpg";
  return {
    blob,
    fileName: `activity.${ext}`,
    mimeType,
  };
}
