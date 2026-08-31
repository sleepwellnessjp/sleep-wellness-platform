/**
 * SOXAI 画像セット fingerprint（ocrImageCache と同一方式）。
 * name / size / lastModified / type の連結。順序と枚数も fingerprint 文字列に含まれる。
 */

export function fileFingerprint(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}::${file.type}`;
}

/** File[] の順序どおりに fingerprint を連結する */
export function filesFingerprint(files: readonly File[]): string {
  return files.map(fileFingerprint).join("||");
}
