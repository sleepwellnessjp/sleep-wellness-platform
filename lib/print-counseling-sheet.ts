/**
 * A4 カウンセリングシートの PDF 出力。
 * 画面上のプレビュー DOM をそのままキャプチャして PDF 化する。
 * HTML ファイルを保存して別ブラウザで開く方式は使わない。
 *
 * Cursor / Electron では window.print() がタブを落とすため使わない。
 */

export const COUNSELING_SHEET_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", YuGothic, "Meiryo", sans-serif';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const JPEG_QUALITY = 0.92;

export function isUnsafePrintEnvironment(
  userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
): boolean {
  return /Electron/i.test(userAgent) || /Cursor\//i.test(userAgent);
}

export function counselingSheetFileName(
  clientName?: string | null,
  date?: string | null,
): string {
  const name = (clientName?.trim() || "client").replace(/[\\/:*?"<>|]/g, "_");
  const day = date?.trim() || new Date().toISOString().slice(0, 10);
  return `睡眠ウェルネスカウンセリングレポート_${name}_${day}.pdf`;
}

function captureScale(): number {
  if (typeof navigator === "undefined") return 2;
  if (isUnsafePrintEnvironment()) return 1.5;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(2, Math.max(1.5, dpr));
}

async function waitForPreviewReady(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
        window.setTimeout(done, 2_000);
      });
    }),
  );
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function addCanvasToPdf(
  pdf: import("jspdf").jsPDF,
  canvas: HTMLCanvasElement,
  startNewPage: boolean,
): void {
  const pageWidthPx = canvas.width;
  const pageHeightPx = Math.round(pageWidthPx * (A4_HEIGHT_MM / A4_WIDTH_MM));
  const sliceHeight = Math.min(pageHeightPx, canvas.height);
  const slice = document.createElement("canvas");
  slice.width = pageWidthPx;
  slice.height = sliceHeight;
  const ctx = slice.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, slice.width, slice.height);
  ctx.drawImage(
    canvas,
    0,
    0,
    pageWidthPx,
    sliceHeight,
    0,
    0,
    pageWidthPx,
    sliceHeight,
  );

  if (startNewPage) {
    pdf.addPage("a4", "portrait");
  }
  pdf.addImage(
    slice.toDataURL("image/jpeg", JPEG_QUALITY),
    "JPEG",
    0,
    0,
    A4_WIDTH_MM,
    A4_HEIGHT_MM,
  );
  slice.width = 0;
  slice.height = 0;
}

/**
 * 画面上の A4 プレビュー DOM から PDF を生成して保存する。
 * 日本語はブラウザが描画した見た目のまま画像化するため文字化けしない。
 */
export async function generateCounselingSheetPdf(
  previewRoot: HTMLElement,
  filename: string,
): Promise<void> {
  await waitForPreviewReady(previewRoot);

  const pages = Array.from(
    previewRoot.querySelectorAll<HTMLElement>(".client-diagnostic-page"),
  );
  if (pages.length !== 3) {
    throw new Error("A4 counseling report must have exactly 3 pages");
  }
  const targets = pages;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const scale = captureScale();
  let firstPage = true;

  for (const target of targets) {
    const canvas = await html2canvas(target, {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
      onclone: (_clonedDoc, clonedElement) => {
        clonedElement.style.boxSizing = "border-box";
        clonedElement.style.display = "flex";
        clonedElement.style.flexDirection = "column";
        clonedElement.style.width = `${A4_WIDTH_MM}mm`;
        clonedElement.style.height = `${A4_HEIGHT_MM}mm`;
        clonedElement.style.maxHeight = `${A4_HEIGHT_MM}mm`;
        clonedElement.style.padding = "12mm 14mm";
        clonedElement.style.overflow = "hidden";
        clonedElement.style.fontFamily = COUNSELING_SHEET_FONT_FAMILY;
        clonedElement.style.color = "#071426";
        clonedElement.style.background = "#ffffff";
        clonedElement.style.setProperty("-webkit-print-color-adjust", "exact");
        clonedElement.style.setProperty("print-color-adjust", "exact");
      },
    });
    addCanvasToPdf(pdf, canvas, !firstPage);
    canvas.width = 0;
    canvas.height = 0;
    firstPage = false;
  }

  pdf.save(filename);
}
