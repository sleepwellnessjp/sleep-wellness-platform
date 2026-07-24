/** Shared Sleep Wellness Institute Japan design tokens (Version 1.0 Beta).
 * Brand: Navy / Gold / White — Apple-like minimal, generous whitespace.
 * Prefer CSS variables (`var(--sw-*)`) in components for dark-mode readiness.
 */
export const NAVY = "#071426";
export const GOLD = "#8a6a2d";
export const GOLD_LIGHT = "#d8b36a";
export const GOLD_MID = "#b89242";
export const WHITE = "#ffffff";
export const TEAL = "#315f68";
export const SURFACE = "#f7f7f5";
export const SURFACE_WARM = "#fafaf8";
export const SURFACE_PAGE = "#f7f7f5";
export const SUCCESS = "#0f6b5c";
export const DANGER = "#a33a3a";
export const MUTED = "#64748B";
export const BORDER = "rgba(7, 20, 38, 0.1)";
export const CARD_SHADOW =
  "0 1px 2px rgba(7, 20, 38, 0.04), 0 12px 40px -24px rgba(7, 20, 38, 0.18)";
export const CARD_RADIUS = "1.75rem";
export const PAGE_MAX_WIDTH = "max-w-3xl";
export const PAGE_MAX_WIDTH_WIDE = "max-w-6xl";
/** Mobile → tablet → desktop page padding (safe-area aware via shells). */
export const PAGE_PADDING =
  "px-4 py-8 sm:px-6 sm:py-10 md:px-8 md:py-12 lg:px-10 lg:py-16";
export const CONTROL_RADIUS = "9999px";
export const SECTION_GAP = "gap-5 sm:gap-6 md:gap-8";

/** Unified card surface — use with SectionCard / EmptyState / shells. */
export const CARD_CLASS =
  "sw-card rounded-[var(--sw-card-radius)] border border-[color:var(--sw-border)] bg-[var(--sw-card-bg)] shadow-[var(--sw-card-shadow)]";

/** Interactive control focus ring (keyboard a11y). */
export const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--sw-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--sw-surface)]";

/** Minimum touch target for primary controls on phones. */
export const TOUCH_TARGET = "min-h-11 min-w-11";
