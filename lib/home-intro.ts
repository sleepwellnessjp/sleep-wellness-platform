/**
 * サイト内のロゴ／「トップ」導線はイントロを再生せず、
 * トップページ上部へ直接移動する。
 * 初回の素の `/` アクセスでは、従来どおりイントロを表示する。
 */
export const HOME_TOP_HREF = "/#top";
export const HOME_TOP_ID = "top";

const SKIP_INTRO_HASHES = new Set([
  "#top",
  "#about",
  "#services",
  "#partners",
  "#founder",
  "#contact",
]);

export function homeIntroHash(): string {
  if (typeof window === "undefined") return "";
  const raw = window.location.hash.replace(/^#/, "");
  const first = raw.split("#")[0]?.trim() ?? "";
  return first ? `#${first}` : "";
}

export function shouldSkipHomeIntro(): boolean {
  return SKIP_INTRO_HASHES.has(homeIntroHash());
}
