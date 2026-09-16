/**
 * サイト内のロゴ／「トップ」導線はイントロを再生せず、
 * トップページ上部へ直接移動する。
 * 初回の素の `/` アクセスでは、従来どおりイントロを表示する。
 */
export const HOME_TOP_HREF = "/#top";
export const HOME_TOP_ID = "top";

/** PWA/トップ初回ペイント用。HomeIntro と同じ地色 */
export const HOME_INTRO_BOOT_BG = "#020b1a";

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

/**
 * layout の boot スクリプトが付けたトップ専用の濃紺初期背景を解除する。
 * イントロ開始後（またはスキップ時）に呼び、サイト全体のトークン配色へ戻す。
 */
export function clearHomeIntroBootBg(): void {
  if (typeof document === "undefined") return;
  try {
    const root = document.documentElement;
    root.removeAttribute("data-swij-boot");
    root.style.removeProperty("background-color");
    root.style.removeProperty("color-scheme");
    document.getElementById("swij-boot-bg-style")?.remove();
    if (document.body) {
      document.body.style.removeProperty("background-color");
    }
  } catch {
    // ignore
  }
}
