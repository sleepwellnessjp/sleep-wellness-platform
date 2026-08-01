/**
 * OpenAI Vision へ送る前に画像を縮小・JPEG 圧縮し、入力トークンを抑える。
 * ブラウザ専用（canvas）。失敗時は元の data URL を返す。
 */

/** 長辺を抑えて Vision 入力トークン / TPM 消費を削減（速度優先） */
const MAX_EDGE_PX = 1024;
const JPEG_QUALITY = 0.78;

function loadDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    image.src = dataUrl;
  });
}

/**
 * Vision 送信用に長辺を抑え JPEG 化する。
 * サーバー側や canvas 不可環境では入力をそのまま返す。
 */
export async function prepareImageForOcr(dataUrl: string): Promise<string> {
  if (typeof document === "undefined") return dataUrl;
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(dataUrl)) {
    return dataUrl;
  }

  try {
    const image = await loadDataUrl(dataUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return dataUrl;

    const scale = Math.min(1, MAX_EDGE_PX / Math.max(width, height));
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    // すでに十分小さく JPEG の場合は再エンコードを省略
    if (
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
    const compressed = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
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
