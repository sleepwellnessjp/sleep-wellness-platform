import {
  MELATONIN_YOGA_EVENT_TYPES,
  type MelatoninYogaEventType,
} from "@/lib/melatonin-yoga/types";

export function parseMelatoninYogaApplyType(
  value: string | undefined | null,
): MelatoninYogaEventType | null {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  return (MELATONIN_YOGA_EVENT_TYPES as readonly string[]).includes(normalized)
    ? (normalized as MelatoninYogaEventType)
    : null;
}

export function melatoninYogaApplyHref(type: MelatoninYogaEventType): string {
  return `/melatonin-yoga/apply?type=${encodeURIComponent(type)}`;
}

export function melatoninYogaApplySectionId(
  eventType: MelatoninYogaEventType,
): string {
  return `melatonin-yoga-apply-${eventType}`;
}

const APPLY_SCROLL_GAP_PX = 12;

/** 申込フォーム内の種類ブロックへスクロール（ヘッダー分オフセット） */
export function scrollToMelatoninYogaApplySection(
  eventType: MelatoninYogaEventType,
): boolean {
  if (typeof window === "undefined") return false;

  const element = document.getElementById(
    melatoninYogaApplySectionId(eventType),
  );
  if (!element) return false;

  const header = document.querySelector("header");
  const headerBottom = header
    ? header.getBoundingClientRect().bottom
    : 0;
  const offset = Math.max(headerBottom, 0) + APPLY_SCROLL_GAP_PX;
  const top =
    element.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });
  return true;
}
