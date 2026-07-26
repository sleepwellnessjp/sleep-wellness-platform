import {
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_MIME_TYPES,
  PROFILE_IMAGE_OUTPUT_SIZE,
} from "@/lib/instructors/types";

export type PreparedProfileImage = {
  blob: Blob;
  fileName: string;
  mimeType: "image/jpeg" | "image/webp" | "image/png";
};

function isAllowedMime(type: string): boolean {
  const normalized = type.toLowerCase() === "image/jpg" ? "image/jpeg" : type;
  return (PROFILE_IMAGE_MIME_TYPES as readonly string[]).includes(normalized);
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

/**
 * プロフィール写真を正方形にトリミングし、適切なサイズへ圧縮する。
 * localStorage / モックは使わない。
 */
export async function prepareProfileImage(
  file: File,
): Promise<PreparedProfileImage> {
  if (!isAllowedMime(file.type)) {
    throw new Error("対応形式は JPG / JPEG / PNG / WebP のみです");
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error(
      `画像が大きすぎます（上限 ${Math.round(PROFILE_IMAGE_MAX_BYTES / (1024 * 1024))}MB）`,
    );
  }

  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (side < 64) {
    throw new Error("画像が小さすぎます（64px以上が必要です）");
  }

  const sx = Math.floor((image.naturalWidth - side) / 2);
  const sy = Math.floor((image.naturalHeight - side) / 2);
  const out = Math.min(PROFILE_IMAGE_OUTPUT_SIZE, side);

  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像処理に失敗しました");
  ctx.drawImage(image, sx, sy, side, side, 0, 0, out, out);

  const preferWebp =
    typeof canvas.toDataURL === "function" &&
    canvas.toDataURL("image/webp").startsWith("data:image/webp");

  const mimeType: PreparedProfileImage["mimeType"] = preferWebp
    ? "image/webp"
    : "image/jpeg";
  const blob = await canvasToBlob(canvas, mimeType, 0.82);
  const ext = mimeType === "image/webp" ? "webp" : "jpg";

  return {
    blob,
    fileName: `profile.${ext}`,
    mimeType,
  };
}
