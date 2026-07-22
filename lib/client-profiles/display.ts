/**
 * 固定プロフィールの画面表示ヘルパー
 * 未入力（null / undefined / "" / NaN / ルール外）→「—」
 * 有効な 0 はそのまま表示する
 */

import {
  NUMBER_RULES,
  sanitizeNumber,
  type NumberRule,
} from "@/lib/client-profiles/validation";

export const EMPTY_DISPLAY = "—";

/**
 * 数値の未入力判定（デフォルト: 0以上の非負数）。
 * 温度など負数が有効な場合は numberRule を渡す。
 */
export function isMissingNumber(
  value: number | null | undefined,
  rule: NumberRule = NUMBER_RULES.nonNegative,
): boolean {
  return sanitizeNumber(value, rule) == null;
}

export function isMissingString(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

export function displayProfileNumber(
  value: number | null | undefined,
  rule: NumberRule = NUMBER_RULES.nonNegative,
): string {
  const n = sanitizeNumber(value, rule);
  if (n == null) return EMPTY_DISPLAY;
  return String(n);
}

/**
 * 画面表示用。未入力は「—」、0 は "0"。
 * 数値の負数はデフォルトで未入力扱い（-1 などを出さない）。
 * 温度は numberRule: NUMBER_RULES.temperatureC を渡す。
 */
export function displayProfileValue(
  value: unknown,
  options?: { numberRule?: NumberRule },
): string {
  if (value == null) return EMPTY_DISPLAY;
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  if (typeof value === "number") {
    return displayProfileNumber(
      value,
      options?.numberRule ?? NUMBER_RULES.nonNegative,
    );
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return EMPTY_DISPLAY;
    if (trimmed.toLowerCase() === "nan") return EMPTY_DISPLAY;
    // センチネルとして紛れ込んだ "-1" のみ除外（温度の "-5" などは数値パスで扱う）
    if (trimmed === "-1") return EMPTY_DISPLAY;
    return trimmed;
  }
  if (Array.isArray(value)) {
    const items = value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (typeof item === "number") {
          const n = sanitizeNumber(
            item,
            options?.numberRule ?? NUMBER_RULES.nonNegative,
          );
          return n == null ? "" : String(n);
        }
        return "";
      })
      .filter(Boolean);
    return items.length ? items.join("、") : EMPTY_DISPLAY;
  }
  return EMPTY_DISPLAY;
}

/**
 * 入力欄用。ルール外は空文字（画面に -1 を出さない）。
 * 0 は "0" のまま。
 */
export function numberToInputValue(
  value: number | null | undefined,
  rule: NumberRule = NUMBER_RULES.nonNegative,
): string {
  const n = sanitizeNumber(value, rule);
  if (n == null) return "";
  return String(n);
}
