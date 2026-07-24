/**
 * Sleep Wellness Institute Japan — Brand Guidelines (Version 1.0 Beta)
 * Navy / Gold / White · 余白を活かしたミニマル UI · ダークモード準備済み CSS 変数
 */

export const SWIJ_BRAND = {
  name: "Sleep Wellness Institute Japan",
  shortName: "SWIJ",
  tagline: "認定講師専用オペレーティングシステム",
  version: "1.0",
  colors: {
    navy: "#071426",
    gold: "#8a6a2d",
    goldMid: "#b89242",
    goldLight: "#d8b36a",
    white: "#ffffff",
    surface: "#f7f7f5",
    surfaceWarm: "#fafaf8",
    border: "rgba(7, 20, 38, 0.1)",
    muted: "#64748B",
    success: "#0f6b5c",
    danger: "#a33a3a",
  },
  radius: {
    card: "1.75rem",
    cardLg: "1.75rem",
    control: "9999px",
  },
  shadow: {
    card: "0 1px 2px rgba(7, 20, 38, 0.04), 0 12px 40px -24px rgba(7, 20, 38, 0.18)",
  },
  spacing: {
    pageX: "px-4 sm:px-6 md:px-8",
    pageY: "py-8 sm:py-10 md:py-12 lg:py-14",
    sectionGap: "gap-5 sm:gap-6 md:gap-8",
  },
  typography: {
    eyebrow:
      "text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] sm:tracking-[0.28em]",
    title: "font-semibold tracking-[-0.05em]",
    body: "text-[15px] leading-7",
  },
  motion: {
    pageEnter: "sw-page-enter",
    ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
} as const;

export const SWIJ_EYEBROW_HQ = "SLEEP WELLNESS INSTITUTE JAPAN · HQ";
export const SWIJ_EYEBROW_INSTRUCTOR = "SLEEP WELLNESS INSTITUTE JAPAN · INSTRUCTOR";
export const SWIJ_EYEBROW_OPS = "SWIJ OPS · VERSION 1.0 BETA";
export const SWIJ_EYEBROW_CLOSED_BETA = "SWIJ CLOSED BETA · VERSION 1.0";
