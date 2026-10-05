import type { YogaFestSoxaiAgeBand } from "@/lib/yoga-fest-2026-soxai/types";

/** SOXAI 提出用 CSV：18歳未満・18〜19歳 → 10代 */
export function ageBandForSoxaiCsv(ageBand: string): string {
  if (ageBand === "18歳未満" || ageBand === "18〜19歳") {
    return "10代";
  }
  return ageBand;
}

export function isMinorAgeBand(ageBand: YogaFestSoxaiAgeBand | string): boolean {
  return ageBand === "18歳未満";
}
