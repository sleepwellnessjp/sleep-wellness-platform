/** Verification payload embedded in certificate QR. */
export function verificationPayload(code: string): string {
  return `SWIJ-LICENSE:${code}`;
}

/**
 * Scannable QR image URL (no npm dependency).
 * Uses a public QR endpoint; certificate also shows the verification code in text.
 */
export function qrImageSrc(text: string, size = 160): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    margin: "12",
    data: text,
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

/** Offline SVG fallback (finder-style visual; pair with visible verification code). */
export function buildQrSvg(text: string, size = 160): string {
  const modules = 25;
  const bytes = Array.from(new TextEncoder().encode(text));
  const cell = size / modules;
  const rects: string[] = [];

  const isFinder = (x: number, y: number, ox: number, oy: number) => {
    const lx = x - ox;
    const ly = y - oy;
    if (lx < 0 || ly < 0 || lx > 6 || ly > 6) return null;
    const edge = lx === 0 || lx === 6 || ly === 0 || ly === 6;
    const center = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
    return edge || center;
  };

  for (let y = 0; y < modules; y += 1) {
    for (let x = 0; x < modules; x += 1) {
      const finder =
        isFinder(x, y, 0, 0) ??
        isFinder(x, y, modules - 7, 0) ??
        isFinder(x, y, 0, modules - 7);
      let dark = false;
      if (finder !== null) {
        dark = finder;
      } else if (x === 6 || y === 6) {
        dark = (x + y) % 2 === 0;
      } else {
        const b = bytes[(x * modules + y) % Math.max(bytes.length, 1)] ?? 0;
        dark = ((b + x * 3 + y * 5) & 1) === 0;
      }
      if (!dark) continue;
      rects.push(
        `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${(cell + 0.05).toFixed(2)}" height="${(cell + 0.05).toFixed(2)}" fill="#071426"/>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Verification QR">${rects.join("")}</svg>`;
}

export function qrDataUrl(text: string, size = 160): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildQrSvg(text, size))}`;
}
