export const YOGA_FEST_SOXAI_REGISTER_SECTION_ID = "register";

const SCROLL_GAP_PX = 12;

/** 参加登録フォームへスクロール（固定ヘッダー分オフセット） */
export function scrollToYogaFestSoxaiRegisterSection(): boolean {
  if (typeof window === "undefined") return false;

  const element = document.getElementById(YOGA_FEST_SOXAI_REGISTER_SECTION_ID);
  if (!element) return false;

  const header = document.querySelector("header");
  const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
  const offset = Math.max(headerBottom, 0) + SCROLL_GAP_PX;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });
  return true;
}
