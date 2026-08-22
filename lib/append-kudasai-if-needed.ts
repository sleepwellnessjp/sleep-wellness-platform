/**
 * 行動提案文の末尾に「ください」を付ける。
 * 既に丁寧体（ます / です / ました）または「ください」で終わる場合は付けない。
 */
export function appendKudasaiIfNeeded(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const core = trimmed.replace(/[。．]+$/u, "");

  if (/ください$/u.test(core)) {
    return core;
  }

  if (/(?:ます|です|ました)$/u.test(core)) {
    return core;
  }

  return `${core}ください`;
}

/** PDF⑤等の品質チェック用：助詞・終止の二重化 */
export function hasBrokenKudasaiSuffix(text: string): boolean {
  return /(?:ます|です|ました)ください/u.test(text);
}
