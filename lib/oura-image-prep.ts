/**
 * Oura Vision 送信用の画像準備。
 * 全体リサイズ・JPEG圧縮のみ。OCR / ROI / 切り抜きは行わない。
 */

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;

function loadDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    image.src = dataUrl;
  });
}

/**
 * Vision 送信用に長辺を抑え JPEG 化する（画像全体を維持）。
 * サーバー側や canvas 不可環境では入力をそのまま返す。
 */
export async function prepareImageForVision(dataUrl: string): Promise<string> {
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

    if (
      scale >= 0.98 &&
      /^data:image\/jpe?g;base64,/i.test(dataUrl) &&
      dataUrl.length < 800_000
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
    return compressed.length < dataUrl.length ? compressed : dataUrl;
  } catch {
    return dataUrl;
  }
}
